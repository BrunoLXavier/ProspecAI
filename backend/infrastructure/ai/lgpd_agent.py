# Implements RF-01.02: LGPD Agent with BERTimbau NER
# Detects and masks PII (Personally Identifiable Information)
from typing import Dict, Any, List, Optional, Tuple
import re
import hashlib
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

# BERTimbau model loading with lazy initialization
_bertimbau_model = None
_bertimbau_tokenizer = None
_bertimbau_ner_pipeline = None


def _load_bertimbau_model():
    """Lazy load BERTimbau model for NER."""
    global _bertimbau_model, _bertimbau_tokenizer, _bertimbau_ner_pipeline
    
    if _bertimbau_ner_pipeline is not None:
        return _bertimbau_ner_pipeline
    # Honor SKIP_AI_MODELS to avoid heavy imports on low-memory hosts
    if os.environ.get("SKIP_AI_MODELS") == "1":
        logger.info("SKIP_AI_MODELS=1; skipping BERTimbau model load")
        return None
    
    try:
        from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
        import torch
        
        model_name = os.getenv("BERTIMBAU_NER_MODEL", "neuralmind/bert-base-portuguese-cased")
        device = 0 if torch.cuda.is_available() else -1
        
        logger.info(f"Loading BERTimbau NER model: {model_name}")
        
        _bertimbau_tokenizer = AutoTokenizer.from_pretrained(model_name)
        _bertimbau_model = AutoModelForTokenClassification.from_pretrained(model_name)
        
        _bertimbau_ner_pipeline = pipeline(
            "ner",
            model=_bertimbau_model,
            tokenizer=_bertimbau_tokenizer,
            device=device,
            aggregation_strategy="simple"
        )
        
        logger.info("BERTimbau NER model loaded successfully")
        return _bertimbau_ner_pipeline
        
    except Exception as e:
        logger.error(f"Failed to load BERTimbau model: {e}")
        return None


class LGPDAgent:
    """
    LGPD compliance agent for detecting and masking PII.
    Uses BERTimbau for Named Entity Recognition in Portuguese.
    Implements RF-01.02: LGPD Agent
    """
    
    def __init__(self, encryption_key: str):
        self.encryption_key = encryption_key
        
        # PII patterns (regex-based detection)
        self.patterns = {
            "cpf": re.compile(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b'),
            "cnpj": re.compile(r'\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b|\b\d{14}\b'),
            "email": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            "phone": re.compile(r'\b(?:\+55\s?)?(?:\(?\d{2}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}\b'),
            "credit_card": re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'),
        }
        
        # TODO: Initialize BERTimbau model for advanced NER
        # from transformers import AutoTokenizer, AutoModelForTokenClassification
        # self.tokenizer = AutoTokenizer.from_pretrained("neuralmind/bert-base-portuguese-cased")
        # self.model = AutoModelForTokenClassification.from_pretrained("neuralmind/bert-base-portuguese-cased")
    
    async def detect_and_mask_pii(
        self,
        data: Dict[str, Any],
        reversible: bool = True
    ) -> Dict[str, Any]:
        """
        Detect PII in data and apply masking.
        
        Args:
            data: Input data (can be nested dict/list)
            reversible: If True, use reversible masking; else, anonymize permanently
            
        Returns:
            Dict with masked_data and pii_fields detected
        """
        pii_detected = []
        masked_data = self._process_data(data, pii_detected, reversible)
        
        logger.info(f"PII detection complete. Found {len(pii_detected)} PII fields")
        
        return {
            "masked_data": masked_data,
            "pii_fields": pii_detected,
            "detection_method": "regex_patterns",  # TODO: Add "bertimbau_ner"
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _process_data(
        self,
        data: Any,
        pii_detected: List[Dict[str, str]],
        reversible: bool
    ) -> Any:
        """Recursively process data to detect and mask PII."""
        if isinstance(data, dict):
            return {
                key: self._process_data(value, pii_detected, reversible)
                for key, value in data.items()
            }
        
        elif isinstance(data, list):
            return [
                self._process_data(item, pii_detected, reversible)
                for item in data
            ]
        
        elif isinstance(data, str):
            return self._mask_string(data, pii_detected, reversible)
        
        else:
            return data
    
    def _mask_string(
        self,
        text: str,
        pii_detected: List[Dict[str, str]],
        reversible: bool
    ) -> str:
        """Mask PII in a string."""
        masked_text = text
        
        for pii_type, pattern in self.patterns.items():
            matches = pattern.finditer(text)
            
            for match in matches:
                original_value = match.group()
                
                if reversible:
                    # Reversible masking with hash reference
                    masked_value = self._reversible_mask(original_value, pii_type)
                else:
                    # Permanent anonymization
                    masked_value = self._anonymize(pii_type)
                
                masked_text = masked_text.replace(original_value, masked_value)
                
                pii_detected.append({
                    "type": pii_type,
                    "original_length": len(original_value),
                    "masked": masked_value,
                    "position": match.start(),
                    "reversible": reversible
                })
        
        return masked_text
    
    def _reversible_mask(self, value: str, pii_type: str) -> str:
        """Create a reversible mask using hash."""
        hash_value = hashlib.sha256(
            f"{value}{self.encryption_key}".encode()
        ).hexdigest()[:16]
        
        return f"[{pii_type.upper()}_MASKED_{hash_value}]"
    
    def _anonymize(self, pii_type: str) -> str:
        """Permanently anonymize PII."""
        if pii_type == "cpf":
            return "***.***.***-**"
        elif pii_type == "cnpj":
            return "**.***.***/****-**"
        elif pii_type == "email":
            return "***@***.***"
        elif pii_type == "phone":
            return "(**) ****-****"
        elif pii_type == "credit_card":
            return "**** **** **** ****"
        else:
            return "***"
    
    async def detect_with_bertimbau(self, text: str) -> List[Dict[str, Any]]:
        """
        Advanced NER using BERTimbau model for Portuguese text.
        Detects PERSON, ORGANIZATION, LOCATION, and other entities.
        
        Full implementation with neuralmind/bert-base-portuguese-cased
        """
        results = []
        
        try:
            ner_pipeline = _load_bertimbau_model()
            
            if ner_pipeline is None:
                logger.warning("BERTimbau model not available, using regex fallback")
                return self._detect_pii_with_regex(text)
            
            # Run NER inference
            ner_results = ner_pipeline(text)
            
            # Map BERTimbau entity types to PII categories
            entity_pii_map = {
                "PER": "person_name",
                "PERSON": "person_name",
                "B-PER": "person_name",
                "I-PER": "person_name",
                "ORG": "organization",
                "ORGANIZATION": "organization",
                "B-ORG": "organization",
                "I-ORG": "organization",
                "LOC": "location",
                "LOCATION": "location",
                "B-LOC": "location",
                "I-LOC": "location",
                "MISC": "miscellaneous",
            }
            
            for entity in ner_results:
                entity_type = entity.get("entity_group", entity.get("entity", "UNKNOWN"))
                pii_type = entity_pii_map.get(entity_type.upper(), "unknown")
                
                # Only include entities with reasonable confidence
                confidence = entity.get("score", 0.0)
                if confidence >= 0.7:
                    results.append({
                        "type": pii_type,
                        "value": entity.get("word", ""),
                        "confidence": round(confidence, 3),
                        "start": entity.get("start", 0),
                        "end": entity.get("end", 0),
                        "entity_label": entity_type,
                        "method": "bertimbau_ner"
                    })
            
            # Also run regex detection for structured PII (CPF, email, etc.)
            regex_results = self._detect_pii_with_regex(text)
            
            # Merge results, avoiding duplicates based on position
            covered_ranges = set()
            for r in results:
                covered_ranges.add((r.get("start", 0), r.get("end", 0)))
            
            for regex_result in regex_results:
                pos = (regex_result.get("start", 0), regex_result.get("end", 0))
                if pos not in covered_ranges:
                    results.append(regex_result)
            
            logger.info(f"BERTimbau NER detected {len(results)} entities in text")
            return results
            
        except Exception as e:
            logger.error(f"BERTimbau NER failed: {e}")
            return self._detect_pii_with_regex(text)
    
    def _detect_pii_with_regex(self, text: str) -> List[Dict[str, Any]]:
        """Fallback regex-based PII detection."""
        results = []
        for pii_type, pattern in self.patterns.items():
            for match in pattern.finditer(text):
                results.append({
                    "type": pii_type,
                    "value": match.group(),
                    "confidence": 1.0,
                    "start": match.start(),
                    "end": match.end(),
                    "method": "regex"
                })
        return results
    
    def unmask(self, masked_value: str, original_value: str) -> bool:
        """
        Verify if a masked value corresponds to the original.
        Used for reversible masking validation.
        """
        # Extract hash from masked value
        if "_MASKED_" in masked_value:
            parts = masked_value.split("_MASKED_")
            if len(parts) == 2:
                stored_hash = parts[1].rstrip("]")
                computed_hash = hashlib.sha256(
                    f"{original_value}{self.encryption_key}".encode()
                ).hexdigest()[:16]
                
                return stored_hash == computed_hash
        
        return False
    
    def detect_pii(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect PII entities in a string using regex patterns.
        Returns a list of dicts with type, value, and confidence.
        Implements RF-01.02: NER + regex fallback.
        """
        results = []
        for pii_type, pattern in self.patterns.items():
            for match in pattern.finditer(text):
                results.append({
                    "type": pii_type,
                    "value": match.group(),
                    "confidence": 1.0  # Regex is deterministic; set high confidence
                })
        return results
    
    def mask_pii(self, text: str, reversible: bool = True) -> str:
        """
        Detect and mask PII in text string.
        
        Args:
            text: Input text to process
            reversible: If True, use reversible masking; else, anonymize permanently
            
        Returns:
            String with PII masked
        """
        pii_detected = []
        return self._mask_string(text, pii_detected, reversible)
