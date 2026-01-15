# Implements RF-04: NLP Service for implicit demand detection
# Analyzes client interactions to extract implicit demands
from typing import Dict, Any, List, Optional
import logging
import os

logger = logging.getLogger(__name__)

# Lazy load transformers to avoid import errors if not installed
_transformers_available = None
_ner_pipeline = None
_sentiment_pipeline = None


def _check_transformers():
    """Check if transformers is available and load pipelines."""
    global _transformers_available, _ner_pipeline, _sentiment_pipeline
    
    if _transformers_available is not None:
        return _transformers_available
    
    try:
        from transformers import pipeline, AutoModelForTokenClassification, AutoTokenizer
        _transformers_available = True
        logger.info("Transformers library available")
    except ImportError:
        _transformers_available = False
        logger.warning("Transformers not available, using fallback methods")
    
    return _transformers_available


def _get_ner_pipeline():
    """Get or initialize NER pipeline with BERTimbau."""
    global _ner_pipeline
    
    if _ner_pipeline is not None:
        return _ner_pipeline
    
    if not _check_transformers():
        return None
    
    try:
        from transformers import pipeline
        # Use BERTimbau for Portuguese NER
        model_name = os.getenv(
            "NER_MODEL", 
            "neuralmind/bert-base-portuguese-cased"
        )
        _ner_pipeline = pipeline(
            "ner", 
            model=model_name,
            aggregation_strategy="simple"
        )
        logger.info(f"Loaded NER pipeline with model: {model_name}")
    except Exception as e:
        logger.error(f"Failed to load NER pipeline: {e}")
        _ner_pipeline = None
    
    return _ner_pipeline


def _get_sentiment_pipeline():
    """Get or initialize sentiment analysis pipeline."""
    global _sentiment_pipeline
    
    if _sentiment_pipeline is not None:
        return _sentiment_pipeline
    
    if not _check_transformers():
        return None
    
    try:
        from transformers import pipeline
        # Use Portuguese sentiment model
        model_name = os.getenv(
            "SENTIMENT_MODEL",
            "lxyuan/distilbert-base-multilingual-cased-sentiments-student"
        )
        _sentiment_pipeline = pipeline("sentiment-analysis", model=model_name)
        logger.info(f"Loaded sentiment pipeline with model: {model_name}")
    except Exception as e:
        logger.error(f"Failed to load sentiment pipeline: {e}")
        _sentiment_pipeline = None
    
    return _sentiment_pipeline


class NLPService:
    """
    NLP service for analyzing client interactions.
    Detects implicit demands from conversation text.
    Implements RF-04: Sugestão de "demandas implícitas" via PLN
    """
    
    def __init__(self):
        # Keywords for demand categories
        self.demand_keywords = {
            "innovation": ["inovação", "novo produto", "tecnologia", "pesquisa", "desenvolvimento"],
            "automation": ["automação", "automatizar", "eficiência", "produtividade", "otimizar"],
            "digitalization": ["digital", "software", "sistema", "plataforma", "app"],
            "sustainability": ["sustentável", "sustentabilidade", "verde", "ambiental", "eco"],
            "quality": ["qualidade", "certificação", "ISO", "norma", "padrão"],
            "training": ["capacitação", "treinamento", "qualificação", "formação"],
            "infrastructure": ["infraestrutura", "laboratório", "equipamento", "instalação"],
        }
        
        # Entity type mapping
        self.entity_types = {
            "PER": "person",
            "ORG": "organization",
            "LOC": "location",
            "MISC": "miscellaneous",
            "B-PER": "person",
            "I-PER": "person",
            "B-ORG": "organization",
            "I-ORG": "organization",
            "B-LOC": "location",
            "I-LOC": "location",
        }
    
    def detect_implicit_demands(self, text: str) -> Dict[str, Dict[str, Any]]:
        """
        Analyze text to detect implicit demands.
        
        Args:
            text: Interaction description or conversation text
            
        Returns:
            Dictionary with detected demand categories and their details
        """
        logger.info("Analyzing text for implicit demands")
        
        text_lower = text.lower()
        detected_demands = {}
        
        # Keyword-based detection
        for category, keywords in self.demand_keywords.items():
            matches = [kw for kw in keywords if kw in text_lower]
            
            if matches:
                confidence = min(1.0, len(matches) * 0.3 + 0.4)
                detected_demands[category] = {
                    'confidence': confidence,
                    'keywords': matches,
                    'description': self._generate_demand_description(category, matches)
                }
        
        # Add 'funding' detection for financial keywords
        financial_keywords = ["financiamento", "recursos", "investimento", "verba", "orçamento"]
        funding_matches = [kw for kw in financial_keywords if kw in text_lower]
        if funding_matches:
            confidence = min(1.0, len(funding_matches) * 0.3 + 0.4)
            detected_demands["funding"] = {
                'confidence': confidence,
                'keywords': funding_matches,
                'description': "Detected funding demand"
            }
            
        # Add 'technology' detection for tech keywords  
        tech_keywords = ["tecnologia", "automação", "inteligência artificial", "ia", "robótica"]
        tech_matches = [kw for kw in tech_keywords if kw in text_lower]
        if tech_matches:
            english_matches = []
            for match in tech_matches:
                if "automação" in match:
                    english_matches.append("automation")
                if "inteligência artificial" in match or "ia" in match:
                    english_matches.append("ai")
                else:
                    english_matches.append(match)
            
            confidence = min(1.0, len(tech_matches) * 0.3 + 0.4)
            detected_demands["technology"] = {
                'confidence': confidence,
                'keywords': english_matches,
                'description': "Detected technology demand"
            }
            
        logger.info(f"Detected {len(detected_demands)} implicit demand categories")
        
        return detected_demands
    
    def _generate_demand_description(
        self,
        category: str,
        keywords: List[str]
    ) -> str:
        """Generate a human-readable demand description."""
        descriptions = {
            "innovation": f"Interesse em inovação e desenvolvimento tecnológico (mencionou: {', '.join(keywords[:3])})",
            "automation": f"Necessidade de automação de processos (mencionou: {', '.join(keywords[:3])})",
            "digitalization": f"Demanda por soluções digitais (mencionou: {', '.join(keywords[:3])})",
            "sustainability": f"Foco em sustentabilidade e práticas ambientais (mencionou: {', '.join(keywords[:3])})",
            "quality": f"Interesse em melhoria de qualidade e certificações (mencionou: {', '.join(keywords[:3])})",
            "training": f"Necessidade de capacitação de equipe (mencionou: {', '.join(keywords[:3])})",
            "infrastructure": f"Demanda por infraestrutura e equipamentos (mencionou: {', '.join(keywords[:3])})",
        }
        
        return descriptions.get(category, f"Demanda identificada: {category}")
    
    async def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract named entities from text using BERTimbau NER.
        Implements RF-01: NER for PII detection
        
        Args:
            text: Text to extract entities from
            
        Returns:
            List of entities with type, value, start, end, and confidence
        """
        logger.info("Extracting named entities from text")
        
        ner_pipeline = _get_ner_pipeline()
        
        if ner_pipeline is None:
            # Fallback to regex-based extraction
            return self._extract_entities_regex(text)
        
        try:
            # Run NER pipeline
            results = ner_pipeline(text)
            
            entities = []
            for entity in results:
                entity_type = self.entity_types.get(
                    entity.get("entity_group", entity.get("entity", "MISC")),
                    "miscellaneous"
                )
                
                entities.append({
                    "type": entity_type,
                    "value": entity.get("word", ""),
                    "start": entity.get("start", 0),
                    "end": entity.get("end", 0),
                    "confidence": round(entity.get("score", 0.0), 3),
                    "method": "bertimbau_ner"
                })
            
            logger.info(f"Extracted {len(entities)} entities using BERTimbau")
            return entities
            
        except Exception as e:
            logger.error(f"NER extraction failed: {e}")
            return self._extract_entities_regex(text)
    
    def _extract_entities_regex(self, text: str) -> List[Dict[str, Any]]:
        """Fallback regex-based entity extraction."""
        import re
        
        entities = []
        
        # Extract email addresses
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        for match in re.finditer(email_pattern, text):
            entities.append({
                "type": "email",
                "value": match.group(),
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.95,
                "method": "regex_fallback"
            })
        
        # Extract phone numbers (Brazilian format)
        phone_pattern = r'\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}'
        for match in re.finditer(phone_pattern, text):
            entities.append({
                "type": "phone",
                "value": match.group(),
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.90,
                "method": "regex_fallback"
            })
        
        # Extract CPF (Brazilian ID)
        cpf_pattern = r'\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}'
        for match in re.finditer(cpf_pattern, text):
            entities.append({
                "type": "cpf",
                "value": match.group(),
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.90,
                "method": "regex_fallback"
            })
        
        # Extract CNPJ (Brazilian company ID)
        cnpj_pattern = r'\d{2}\.?\d{3}\.?\d{3}/?\d{4}[-.]?\d{2}'
        for match in re.finditer(cnpj_pattern, text):
            entities.append({
                "type": "cnpj",
                "value": match.group(),
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.90,
                "method": "regex_fallback"
            })
        
        logger.info(f"Extracted {len(entities)} entities using regex fallback")
        return entities
    
    async def sentiment_analysis(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of interaction text using transformer model.
        
        Args:
            text: Text to analyze
            
        Returns:
            Dict with sentiment scores and overall sentiment
        """
        logger.info("Performing sentiment analysis")
        
        sentiment_pipeline = _get_sentiment_pipeline()
        
        if sentiment_pipeline is None:
            # Fallback to keyword-based sentiment
            return self._sentiment_analysis_keywords(text)
        
        try:
            # Run sentiment analysis
            # Split long texts into chunks
            max_length = 512
            chunks = [text[i:i+max_length] for i in range(0, len(text), max_length)]
            
            all_scores = {"positive": 0.0, "neutral": 0.0, "negative": 0.0}
            
            for chunk in chunks:
                results = sentiment_pipeline(chunk)
                
                for result in results:
                    label = result["label"].lower()
                    score = result["score"]
                    
                    if "pos" in label:
                        all_scores["positive"] += score
                    elif "neg" in label:
                        all_scores["negative"] += score
                    else:
                        all_scores["neutral"] += score
            
            # Normalize scores
            total = sum(all_scores.values()) or 1.0
            normalized = {k: round(v / total, 3) for k, v in all_scores.items()}
            
            # Determine overall sentiment
            overall = max(normalized, key=normalized.get)
            
            logger.info(f"Sentiment analysis complete: {overall}")
            
            return {
                **normalized,
                "overall": overall,
                "confidence": normalized[overall],
                "method": "transformer"
            }
            
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return self._sentiment_analysis_keywords(text)
    
    def _sentiment_analysis_keywords(self, text: str) -> Dict[str, Any]:
        """Fallback keyword-based sentiment analysis."""
        text_lower = text.lower()
        
        positive_words = [
            "bom", "ótimo", "excelente", "incrível", "satisfeito", 
            "feliz", "sucesso", "aprovado", "positivo", "ganhar"
        ]
        negative_words = [
            "ruim", "péssimo", "problema", "insatisfeito", "falha",
            "erro", "negativo", "recusado", "perder", "dificuldade"
        ]
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        total_count = positive_count + negative_count or 1
        
        positive_score = positive_count / total_count if total_count > 0 else 0.33
        negative_score = negative_count / total_count if total_count > 0 else 0.33
        neutral_score = 1.0 - positive_score - negative_score
        
        scores = {
            "positive": round(max(0.1, positive_score), 3),
            "neutral": round(max(0.1, neutral_score), 3),
            "negative": round(max(0.1, negative_score), 3)
        }
        
        overall = max(scores, key=scores.get)
        
        return {
            **scores,
            "overall": overall,
            "confidence": scores[overall],
            "method": "keyword_fallback"
        }
