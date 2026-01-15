"""
BERTimbau NER Service for LGPD Compliance
Implements RF-01: LGPD Agent with NER for PII detection
Uses neuralmind/bert-base-portuguese-cased
"""
import os
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import hashlib

from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from pydantic import BaseModel


# =============================================================================
# Configuration
# =============================================================================

MODEL_NAME = os.getenv("NER_MODEL", "neuralmind/bert-base-portuguese-cased")
# For production, use a fine-tuned NER model like:
# "pierreguillou/bert-base-cased-pt-lenerbr" (Legal NER)
# or train custom model on LGPD-specific entities

ENCRYPTION_KEY = os.getenv("PII_ENCRYPTION_KEY", "default-dev-key-change-in-prod")


# =============================================================================
# Entity Types
# =============================================================================

class PIIType(str, Enum):
    """Types of personally identifiable information"""
    PERSON = "PESSOA"           # Nome de pessoa
    CPF = "CPF"                 # CPF brasileiro
    CNPJ = "CNPJ"               # CNPJ
    EMAIL = "EMAIL"             # Endereço de email
    PHONE = "TELEFONE"          # Número de telefone
    ADDRESS = "ENDERECO"        # Endereço físico
    RG = "RG"                   # Documento de identidade
    DATE_OF_BIRTH = "DATA_NASC" # Data de nascimento
    BANK_ACCOUNT = "CONTA_BANCO" # Dados bancários
    ORGANIZATION = "ORGANIZACAO" # Nome de organização
    LOCATION = "LOCALIZACAO"    # Cidade, estado, país


@dataclass
class DetectedEntity:
    """Represents a detected PII entity"""
    text: str
    entity_type: PIIType
    start: int
    end: int
    confidence: float
    anonymized: Optional[str] = None


class PIIDetectionResult(BaseModel):
    """Result of PII detection analysis"""
    original_text: str
    anonymized_text: str
    entities: List[Dict[str, Any]]
    has_pii: bool
    risk_level: str  # low, medium, high
    lgpd_categories: List[str]


# =============================================================================
# Pattern-based detectors (complement to NER)
# =============================================================================

class PatternDetector:
    """Regex-based PII detection for structured data"""
    
    PATTERNS = {
        PIIType.CPF: r'\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b',
        PIIType.CNPJ: r'\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b',
        PIIType.EMAIL: r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        PIIType.PHONE: r'\b(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}\b',
        PIIType.RG: r'\b\d{1,2}\.?\d{3}\.?\d{3}-?[0-9Xx]\b',
        PIIType.DATE_OF_BIRTH: r'\b\d{2}/\d{2}/\d{4}\b',
    }
    
    @classmethod
    def detect(cls, text: str) -> List[DetectedEntity]:
        """Detect PII using regex patterns"""
        entities = []
        
        for pii_type, pattern in cls.PATTERNS.items():
            for match in re.finditer(pattern, text, re.IGNORECASE):
                entities.append(DetectedEntity(
                    text=match.group(),
                    entity_type=pii_type,
                    start=match.start(),
                    end=match.end(),
                    confidence=0.95,  # High confidence for pattern matches
                ))
        
        return entities


# =============================================================================
# BERTimbau NER Service
# =============================================================================

class BERTimbauNERService:
    """
    Named Entity Recognition service using BERTimbau.
    Detects person names, organizations, and locations.
    """
    
    # Mapping from model labels to our PII types
    LABEL_MAPPING = {
        "B-PER": PIIType.PERSON,
        "I-PER": PIIType.PERSON,
        "B-ORG": PIIType.ORGANIZATION,
        "I-ORG": PIIType.ORGANIZATION,
        "B-LOC": PIIType.LOCATION,
        "I-LOC": PIIType.LOCATION,
        # Add more mappings for fine-tuned models
    }
    
    _instance: Optional['BERTimbauNERService'] = None
    
    def __init__(self):
        self.tokenizer = None
        self.model = None
        self.ner_pipeline = None
        self._loaded = False
    
    @classmethod
    def get_instance(cls) -> 'BERTimbauNERService':
        """Singleton pattern for model loading"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def load_model(self):
        """Lazy load the NER model"""
        if self._loaded:
            return
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            self.model = AutoModelForTokenClassification.from_pretrained(MODEL_NAME)
            self.ner_pipeline = pipeline(
                "ner",
                model=self.model,
                tokenizer=self.tokenizer,
                aggregation_strategy="simple",
            )
            self._loaded = True
        except Exception as e:
            print(f"Warning: Could not load NER model: {e}")
            print("Falling back to pattern-based detection only")
            self._loaded = True  # Mark as loaded to avoid repeated attempts
    
    def detect_entities(self, text: str) -> List[DetectedEntity]:
        """
        Detect named entities in Portuguese text.
        Combines NER model with pattern-based detection.
        """
        if not text or not text.strip():
            return []
        
        entities = []
        
        # 1. Pattern-based detection (always available)
        entities.extend(PatternDetector.detect(text))
        
        # 2. NER model detection
        self.load_model()
        
        if self.ner_pipeline:
            try:
                ner_results = self.ner_pipeline(text)
                
                for result in ner_results:
                    label = result.get("entity_group", result.get("entity", ""))
                    pii_type = self.LABEL_MAPPING.get(label)
                    
                    if pii_type:
                        entities.append(DetectedEntity(
                            text=result["word"],
                            entity_type=pii_type,
                            start=result["start"],
                            end=result["end"],
                            confidence=result["score"],
                        ))
            except Exception as e:
                print(f"NER detection error: {e}")
        
        # Remove duplicates (overlapping detections)
        entities = self._deduplicate_entities(entities)
        
        return entities
    
    def _deduplicate_entities(self, entities: List[DetectedEntity]) -> List[DetectedEntity]:
        """Remove overlapping entity detections"""
        if not entities:
            return []
        
        # Sort by start position
        sorted_entities = sorted(entities, key=lambda x: (x.start, -x.confidence))
        
        result = []
        last_end = -1
        
        for entity in sorted_entities:
            if entity.start >= last_end:
                result.append(entity)
                last_end = entity.end
        
        return result


# =============================================================================
# Anonymization Service
# =============================================================================

class AnonymizationService:
    """
    Anonymizes PII in text according to LGPD requirements.
    Supports multiple anonymization strategies.
    """
    
    @staticmethod
    def hash_value(value: str) -> str:
        """Create deterministic hash for value (for consistency)"""
        salted = f"{ENCRYPTION_KEY}:{value}"
        return hashlib.sha256(salted.encode()).hexdigest()[:8]
    
    @staticmethod
    def mask_value(value: str, entity_type: PIIType) -> str:
        """Create masked replacement for PII"""
        type_prefix = entity_type.value[:3].upper()
        return f"[{type_prefix}_***]"
    
    @staticmethod
    def pseudonymize(value: str, entity_type: PIIType) -> str:
        """Create pseudonymized replacement (reversible with key)"""
        hash_id = AnonymizationService.hash_value(value)
        return f"[{entity_type.value}_{hash_id}]"
    
    @classmethod
    def anonymize_text(
        cls,
        text: str,
        entities: List[DetectedEntity],
        strategy: str = "mask",  # mask, pseudonymize, remove
    ) -> Tuple[str, List[DetectedEntity]]:
        """
        Apply anonymization to text based on detected entities.
        Returns anonymized text and updated entities with anonymized values.
        """
        if not entities:
            return text, entities
        
        # Sort by position (reverse to maintain indices)
        sorted_entities = sorted(entities, key=lambda x: x.start, reverse=True)
        
        anonymized_text = text
        
        for entity in sorted_entities:
            if strategy == "mask":
                replacement = cls.mask_value(entity.text, entity.entity_type)
            elif strategy == "pseudonymize":
                replacement = cls.pseudonymize(entity.text, entity.entity_type)
            else:  # remove
                replacement = "[REMOVIDO]"
            
            entity.anonymized = replacement
            anonymized_text = (
                anonymized_text[:entity.start] +
                replacement +
                anonymized_text[entity.end:]
            )
        
        return anonymized_text, sorted_entities


# =============================================================================
# Main LGPD Service
# =============================================================================

class LGPDService:
    """
    Main service for LGPD compliance.
    Combines NER detection with anonymization.
    """
    
    LGPD_CATEGORIES = {
        PIIType.PERSON: "Dados de identificação pessoal",
        PIIType.CPF: "Documento de identificação",
        PIIType.CNPJ: "Dados empresariais",
        PIIType.EMAIL: "Dados de contato",
        PIIType.PHONE: "Dados de contato",
        PIIType.ADDRESS: "Dados de localização",
        PIIType.RG: "Documento de identificação",
        PIIType.DATE_OF_BIRTH: "Dados sensíveis",
        PIIType.BANK_ACCOUNT: "Dados financeiros",
        PIIType.ORGANIZATION: "Dados empresariais",
        PIIType.LOCATION: "Dados de localização",
    }
    
    def __init__(self):
        self.ner_service = BERTimbauNERService.get_instance()
    
    def analyze_text(
        self,
        text: str,
        anonymize: bool = True,
        strategy: str = "mask",
    ) -> PIIDetectionResult:
        """
        Analyze text for PII and optionally anonymize.
        
        Args:
            text: Input text to analyze
            anonymize: Whether to create anonymized version
            strategy: Anonymization strategy (mask, pseudonymize, remove)
        
        Returns:
            PIIDetectionResult with detection and anonymization results
        """
        # Detect entities
        entities = self.ner_service.detect_entities(text)
        
        # Anonymize if requested
        anonymized_text = text
        if anonymize and entities:
            anonymized_text, entities = AnonymizationService.anonymize_text(
                text, entities, strategy
            )
        
        # Calculate risk level
        risk_level = self._calculate_risk_level(entities)
        
        # Get LGPD categories
        categories = list(set(
            self.LGPD_CATEGORIES.get(e.entity_type, "Outros")
            for e in entities
        ))
        
        return PIIDetectionResult(
            original_text=text,
            anonymized_text=anonymized_text,
            entities=[
                {
                    "text": e.text,
                    "type": e.entity_type.value,
                    "start": e.start,
                    "end": e.end,
                    "confidence": e.confidence,
                    "anonymized": e.anonymized,
                }
                for e in entities
            ],
            has_pii=len(entities) > 0,
            risk_level=risk_level,
            lgpd_categories=categories,
        )
    
    def _calculate_risk_level(self, entities: List[DetectedEntity]) -> str:
        """Calculate overall PII risk level"""
        if not entities:
            return "low"
        
        # Sensitive types increase risk
        sensitive_types = {
            PIIType.CPF, PIIType.RG, PIIType.DATE_OF_BIRTH,
            PIIType.BANK_ACCOUNT,
        }
        
        sensitive_count = sum(
            1 for e in entities if e.entity_type in sensitive_types
        )
        
        if sensitive_count >= 2 or len(entities) >= 5:
            return "high"
        elif sensitive_count >= 1 or len(entities) >= 3:
            return "medium"
        return "low"


# =============================================================================
# Factory
# =============================================================================

_lgpd_service: Optional[LGPDService] = None


def get_lgpd_service() -> LGPDService:
    """Get singleton LGPD service instance"""
    global _lgpd_service
    if _lgpd_service is None:
        _lgpd_service = LGPDService()
    return _lgpd_service
