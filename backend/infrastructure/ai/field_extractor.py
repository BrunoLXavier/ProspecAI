# Implements RF-02: AI-assisted funding field extraction
# Extracts fields from edital text using NLP/transformers
from typing import Dict, Any, List, Optional, Tuple
import re
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

# Lazy load transformers for NER
_ner_pipeline = None
_transformer_available = None


def _check_transformers():
    """Check if transformers library is available."""
    global _transformer_available
    
    if _transformer_available is not None:
        return _transformer_available
    
    try:
        import transformers
        _transformer_available = True
    except ImportError:
        _transformer_available = False
        logger.warning("Transformers not available, using regex extraction")
    
    return _transformer_available


def _get_ner_pipeline():
    """Get or initialize NER pipeline."""
    global _ner_pipeline
    
    if _ner_pipeline is not None:
        return _ner_pipeline
    
    if not _check_transformers():
        return None
    
    try:
        from transformers import pipeline
        
        model_name = os.getenv(
            "NER_MODEL",
            "neuralmind/bert-base-portuguese-cased"
        )
        _ner_pipeline = pipeline(
            "ner",
            model=model_name,
            aggregation_strategy="simple"
        )
        logger.info(f"Loaded NER model: {model_name}")
    except Exception as e:
        logger.error(f"Failed to load NER model: {e}")
        _ner_pipeline = None
    
    return _ner_pipeline


class FundingFieldExtractor:
    """
    AI-powered field extractor for funding sources.
    Analyzes edital text to suggest field values.
    Uses BERTimbau NER with regex fallback.
    Implements RF-02: IA Auxiliar
    """
    
    def __init__(self):
        # Patterns for extracting common fields (fallback)
        self.patterns = {
            "trl": re.compile(
                r'TRL[\s:]*([\d])\s*(?:a|até|-)?\s*([\d])?',
                re.IGNORECASE
            ),
            "valor": re.compile(
                r'R\$\s*([\d.,]+(?:\s*(?:milhões?|mil|bilhões?))?)',
                re.IGNORECASE
            ),
            "prazo": re.compile(
                r'prazo.*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                re.IGNORECASE
            ),
            "data": re.compile(
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                re.IGNORECASE
            ),
            "cnpj": re.compile(
                r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}'
            ),
            "percentage": re.compile(
                r'(\d{1,3}(?:[,.]\d+)?)\s*%',
                re.IGNORECASE
            ),
            "email": re.compile(
                r'[\w.-]+@[\w.-]+\.\w+',
                re.IGNORECASE
            ),
        }
        
        # Keywords for instrument type classification
        self.instrument_keywords = {
            "grant": ["subvenção", "bolsa", "auxílio", "não reembolsável"],
            "loan": ["empréstimo", "financiamento", "reembolsável", "crédito"],
            "equity": ["participação", "equity", "capital", "investimento"],
            "tax_incentive": ["incentivo fiscal", "dedução", "isenção", "lei do bem"],
        }
        
        # Keywords for thematic areas
        self.thematic_keywords = {
            "industria_4.0": [
                "indústria 4.0", "automação", "iot", "inteligência artificial",
                "manufatura avançada", "digital", "smart manufacturing"
            ],
            "energia": [
                "energia", "renovável", "solar", "eólica", "biocombustível",
                "eficiência energética", "sustentabilidade"
            ],
            "saude": [
                "saúde", "biotecnologia", "fármaco", "dispositivo médico",
                "diagnóstico", "terapia", "medical"
            ],
            "agro": [
                "agro", "agrícola", "agricultura", "pecuária", "alimento",
                "nutrição", "irrigação"
            ],
            "tic": [
                "software", "tecnologia da informação", "tic", "sistemas",
                "aplicativo", "plataforma", "cloud"
            ],
        }
    
    async def extract_funding_fields(self, edital_text: str) -> Dict[str, Any]:
        """
        Extract funding source fields from edital text.
        Uses transformer NER when available, regex as fallback.
        """
        logger.info("Starting AI field extraction from edital text")
        
        extracted = {}
        confidence_scores = {}
        method = "regex_nlp"
        
        # Try transformer-based extraction first
        ner = _get_ner_pipeline()
        if ner is not None:
            method = "transformer_ner"
            ner_entities = await self._extract_with_ner(edital_text, ner)
            extracted.update(ner_entities.get("fields", {}))
            confidence_scores.update(ner_entities.get("confidences", {}))
        
        # Regex extraction (supplements or fallback)
        regex_fields = await self._extract_with_regex(edital_text)
        
        # Merge - don't overwrite transformer results
        for key, value in regex_fields.get("fields", {}).items():
            if key not in extracted:
                extracted[key] = value
                confidence_scores[key] = regex_fields["confidences"].get(key, 0.6)
        
        # Classification extractions
        instrument_type, inst_conf = self._classify_instrument_type(edital_text)
        if instrument_type:
            extracted["instrument_type"] = instrument_type
            confidence_scores["instrument_type"] = inst_conf
        
        thematic_areas, thematic_conf = self._classify_thematic_areas(edital_text)
        if thematic_areas:
            extracted["thematic_areas"] = thematic_areas
            confidence_scores["thematic_areas"] = thematic_conf
        
        # Extract eligibility hints
        eligibility = self._extract_eligibility_hints(edital_text)
        if eligibility:
            extracted["eligibility_hints"] = eligibility
            confidence_scores["eligibility"] = 0.7
        
        # Calculate overall confidence
        overall_confidence = (
            sum(confidence_scores.values()) / len(confidence_scores)
            if confidence_scores else 0.5
        )
        
        logger.info(
            f"Extraction complete. Found {len(extracted)} fields. "
            f"Method: {method}, Confidence: {overall_confidence:.2f}"
        )
        
        return {
            "extracted_fields": extracted,
            "confidence": round(overall_confidence, 2),
            "field_confidences": confidence_scores,
            "method": method,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _extract_with_ner(
        self,
        text: str,
        ner_pipeline
    ) -> Dict[str, Any]:
        """Extract entities using transformer NER."""
        fields = {}
        confidences = {}
        
        try:
            # Process text in chunks (transformers have token limits)
            max_chunk = 512
            chunks = [text[i:i+max_chunk] for i in range(0, len(text), max_chunk)]
            
            all_entities = []
            for chunk in chunks[:10]:  # Limit chunks to prevent slowness
                entities = ner_pipeline(chunk)
                all_entities.extend(entities)
            
            # Group entities by type
            orgs = [e for e in all_entities if "ORG" in e.get("entity_group", "")]
            locs = [e for e in all_entities if "LOC" in e.get("entity_group", "")]
            pers = [e for e in all_entities if "PER" in e.get("entity_group", "")]
            
            # Extract organization names (potential funding agencies)
            if orgs:
                unique_orgs = list(set(e["word"].strip() for e in orgs if len(e["word"]) > 3))
                if unique_orgs:
                    fields["organizations"] = unique_orgs[:5]
                    confidences["organizations"] = sum(e["score"] for e in orgs[:5]) / min(5, len(orgs))
            
            # Extract locations
            if locs:
                unique_locs = list(set(e["word"].strip() for e in locs if len(e["word"]) > 2))
                if unique_locs:
                    fields["locations"] = unique_locs[:3]
                    confidences["locations"] = sum(e["score"] for e in locs[:3]) / min(3, len(locs))
            
            # Extract person names (potential contacts)
            if pers:
                unique_pers = list(set(e["word"].strip() for e in pers if len(e["word"]) > 3))
                if unique_pers:
                    fields["contacts"] = unique_pers[:3]
                    confidences["contacts"] = sum(e["score"] for e in pers[:3]) / min(3, len(pers))
            
        except Exception as e:
            logger.error(f"NER extraction failed: {e}")
        
        return {"fields": fields, "confidences": confidences}
    
    async def _extract_with_regex(self, text: str) -> Dict[str, Any]:
        """Extract fields using regex patterns."""
        fields = {}
        confidences = {}
        
        # Extract TRL range
        trl_match = self.patterns["trl"].search(text)
        if trl_match:
            trl_min = int(trl_match.group(1))
            trl_max = int(trl_match.group(2)) if trl_match.group(2) else trl_min
            fields["trl_min"] = trl_min
            fields["trl_max"] = trl_max
            confidences["trl"] = 0.85
        
        # Extract monetary values
        valor_matches = self.patterns["valor"].findall(text)
        if valor_matches:
            values = self._parse_monetary_values(valor_matches)
            if values:
                fields["total_amount"] = max(values)
                if len(values) > 1:
                    fields["min_amount"] = min(values)
                confidences["amount"] = 0.75
        
        # Extract dates
        dates = self.patterns["data"].findall(text)
        if len(dates) >= 2:
            try:
                fields["submission_start"] = self._parse_date(dates[0])
                fields["submission_end"] = self._parse_date(dates[1])
                confidences["dates"] = 0.65
            except Exception as e:
                logger.warning(f"Date parsing failed: {e}")
        
        # Extract CNPJ
        cnpj_matches = self.patterns["cnpj"].findall(text)
        if cnpj_matches:
            fields["cnpjs_mentioned"] = list(set(cnpj_matches))[:5]
            confidences["cnpj"] = 0.90
        
        # Extract percentages (counterpart, etc)
        percentages = self.patterns["percentage"].findall(text)
        if percentages:
            fields["percentages_mentioned"] = [float(p.replace(",", ".")) for p in percentages[:5]]
            confidences["percentages"] = 0.70
        
        # Extract emails
        emails = self.patterns["email"].findall(text)
        if emails:
            fields["contact_emails"] = list(set(emails))[:3]
            confidences["emails"] = 0.95
        
        return {"fields": fields, "confidences": confidences}
    
    def _parse_monetary_values(self, matches: List[str]) -> List[float]:
        """Parse monetary value strings to floats."""
        values = []
        for match in matches:
            value_str = match.replace(".", "").replace(",", ".")
            
            # Convert text multipliers
            multiplier = 1
            if "bilhão" in value_str.lower() or "bilhões" in value_str.lower():
                multiplier = 1_000_000_000
                value_str = re.sub(r'bilhões?', '', value_str, flags=re.IGNORECASE)
            elif "milhão" in value_str.lower() or "milhões" in value_str.lower():
                multiplier = 1_000_000
                value_str = re.sub(r'milhões?', '', value_str, flags=re.IGNORECASE)
            elif "mil" in value_str.lower():
                multiplier = 1_000
                value_str = re.sub(r'mil', '', value_str, flags=re.IGNORECASE)
            
            try:
                value = float(re.sub(r'[^\d.]', '', value_str)) * multiplier
                values.append(value)
            except ValueError:
                continue
        
        return values
    
    def _classify_instrument_type(self, text: str) -> Tuple[Optional[str], float]:
        """Classify the instrument type based on keywords."""
        text_lower = text.lower()
        
        scores = {}
        for instrument, keywords in self.instrument_keywords.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[instrument] = score
        
        if scores:
            best = max(scores, key=scores.get)
            confidence = min(scores[best] / len(self.instrument_keywords[best]), 0.9)
            return best, confidence
        
        return None, 0.0
    
    def _classify_thematic_areas(self, text: str) -> Tuple[List[str], float]:
        """Classify thematic areas based on keywords."""
        text_lower = text.lower()
        
        areas = []
        total_score = 0
        
        for area, keywords in self.thematic_keywords.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score >= 2:  # Require at least 2 keyword matches
                areas.append(area)
                total_score += score
        
        if areas:
            confidence = min(total_score / (len(areas) * 3), 0.85)
            return areas, confidence
        
        return [], 0.0
    
    def _extract_eligibility_hints(self, text: str) -> List[str]:
        """Extract eligibility-related information."""
        text_lower = text.lower()
        hints = []
        
        # Check for enterprise size restrictions
        size_keywords = {
            "mei": "Microempreendedor Individual (MEI)",
            "microempresa": "Microempresa",
            "empresa de pequeno porte": "Empresa de Pequeno Porte (EPP)",
            "médio porte": "Empresa de Médio Porte",
            "grande empresa": "Grande Empresa",
            "startup": "Startup",
            "pme": "PME (Pequenas e Médias Empresas)",
        }
        
        for keyword, description in size_keywords.items():
            if keyword in text_lower:
                hints.append(f"Porte empresarial: {description}")
        
        # Check for legal nature restrictions
        nature_keywords = {
            "pessoa jurídica": "Pessoa Jurídica",
            "ict": "Instituição de Ciência e Tecnologia (ICT)",
            "universidade": "Universidade/Instituição de Ensino",
            "fundação": "Fundação",
            "associação": "Associação",
            "cooperativa": "Cooperativa",
        }
        
        for keyword, description in nature_keywords.items():
            if keyword in text_lower:
                hints.append(f"Natureza jurídica: {description}")
        
        # Check for regional restrictions
        if "região" in text_lower or "estado" in text_lower:
            hints.append("Possível restrição regional - verificar abrangência")
        
        return hints[:10]  # Limit hints
    
    def _parse_date(self, date_str: str) -> str:
        """Parse date string to ISO format."""
        parts = re.split(r'[/-]', date_str)
        
        if len(parts) == 3:
            day, month, year = parts
            
            # Adjust year if 2-digit
            if len(year) == 2:
                year = f"20{year}"
            
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}T00:00:00Z"
        
        raise ValueError(f"Invalid date format: {date_str}")
