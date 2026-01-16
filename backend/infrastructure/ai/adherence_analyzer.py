# Implements RF-08: Proposal adherence analyzer
# Analyzes proposal adherence to funding requirements using AI
from typing import Dict, Any, List, Optional, Tuple
import logging
import os

logger = logging.getLogger(__name__)

# Lazy load sentence-transformers
_sentence_transformer_available = None
_embedding_model = None


def _check_sentence_transformers():
    """Check if sentence-transformers is available."""
    global _sentence_transformer_available
    
    if _sentence_transformer_available is not None:
        return _sentence_transformer_available
    
    try:
        from sentence_transformers import SentenceTransformer
        _sentence_transformer_available = True
        logger.info("Sentence-transformers library available")
    except ImportError:
        _sentence_transformer_available = False
        logger.warning("Sentence-transformers not available, using keyword matching")
    
    return _sentence_transformer_available


def _get_embedding_model():
    """Get or initialize sentence transformer model."""
    global _embedding_model
    
    if _embedding_model is not None:
        return _embedding_model
    # Honor SKIP_AI_MODELS to avoid heavy imports on low-memory hosts
    if os.environ.get("SKIP_AI_MODELS") == "1":
        logger.info("SKIP_AI_MODELS=1; skipping embedding model initialization")
        return None
    
    if not _check_sentence_transformers():
        return None
    
    try:
        from sentence_transformers import SentenceTransformer
        model_name = os.getenv(
            "EMBEDDING_MODEL",
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        _embedding_model = SentenceTransformer(model_name)
        logger.info(f"Loaded embedding model: {model_name}")
    except Exception as e:
        logger.error(f"Failed to load embedding model: {e}")
        _embedding_model = None
    
    return _embedding_model


class AdherenceAnalyzer:
    """
    AI-powered adherence analyzer for proposals.
    Checks how well a proposal matches funding requirements.
    Implements RF-08: Análise de aderência de propostas ao edital via IA
    """
    
    def __init__(self):
        # Criteria categories for adherence analysis
        self.criteria_categories = [
            "technical_requirements",
            "financial_requirements",
            "documentation_requirements",
            "eligibility_criteria",
            "timeline_compliance"
        ]
        
        # Reference requirements for semantic comparison
        self.reference_requirements = {
            "technical_requirements": [
                "O projeto deve apresentar metodologia de pesquisa detalhada",
                "Deve haver descrição clara da tecnologia ou inovação proposta",
                "Resultados esperados devem ser mensuráveis e alcançáveis",
                "O nível de maturidade tecnológica (TRL) deve ser especificado",
                "Deve incluir protótipo ou prova de conceito quando aplicável"
            ],
            "financial_requirements": [
                "Orçamento detalhado com todas as rubricas de despesa",
                "Contrapartida financeira ou econômica deve ser especificada",
                "Custos devem estar compatíveis com o escopo do projeto",
                "Cronograma de desembolso alinhado com as etapas do projeto",
                "Recursos de custeio e capital discriminados separadamente"
            ],
            "documentation_requirements": [
                "Documentação institucional completa e atualizada",
                "Certidões negativas de débitos tributários",
                "Declarações de capacidade técnica e operacional",
                "Currículo da equipe técnica envolvida",
                "Portfólio de projetos anteriores similares"
            ],
            "eligibility_criteria": [
                "Instituição atende aos critérios de natureza jurídica",
                "Equipe possui experiência comprovada na área",
                "Projeto está alinhado com as linhas temáticas do edital",
                "Não há impedimentos legais ou restrições cadastrais",
                "Capacidade técnica e operacional comprovada"
            ],
            "timeline_compliance": [
                "Cronograma de execução detalhado por etapas",
                "Marcos e entregas claramente definidos",
                "Prazo de execução compatível com o escopo",
                "Prazo atende aos limites estabelecidos no edital",
                "Dependências entre atividades identificadas"
            ]
        }
    
    async def analyze(
        self,
        proposal_content: str,
        funding_source_id: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Analyze proposal adherence to funding requirements.
        Uses semantic similarity when available, falls back to keywords.
        """
        logger.info(f"Analyzing proposal adherence for funding {funding_source_id}")
        
        category_scores = {}
        issues_found = []
        recommendations = []
        method = "keyword_analysis"
        
        # Check if we can use semantic similarity
        model = _get_embedding_model()
        if model is not None:
            method = "semantic_similarity"
        
        # Analyze each category
        for category in self.criteria_categories:
            if method == "semantic_similarity":
                score, category_issues = await self._analyze_category_semantic(
                    proposal_content, category, model
                )
            else:
                score, category_issues = await self._analyze_category_keywords(
                    proposal_content, category
                )
            category_scores[category] = score
            issues_found.extend(category_issues)
        
        # Calculate overall adherence score (weighted average)
        weights = {
            "technical_requirements": 0.30,
            "financial_requirements": 0.25,
            "documentation_requirements": 0.20,
            "eligibility_criteria": 0.15,
            "timeline_compliance": 0.10
        }
        
        adherence_score = sum(
            category_scores[cat] * weights[cat]
            for cat in self.criteria_categories
        )
        
        # Generate recommendations
        if adherence_score < 0.7:
            recommendations = self._generate_recommendations(
                category_scores, issues_found
            )
        
        logger.info(
            f"Adherence analysis complete. Score: {adherence_score:.2f}, "
            f"Method: {method}, Issues: {len(issues_found)}"
        )
        
        return {
            "adherence_score": round(adherence_score, 2),
            "details": {
                "category_scores": category_scores,
                "issues_found": issues_found,
                "recommendations": recommendations,
                "overall_assessment": self._get_overall_assessment(adherence_score)
            },
            "method": method,
            "recommendations": recommendations
        }
    
    async def _analyze_category_semantic(
        self,
        proposal_content: str,
        category: str,
        model: Any
    ) -> Tuple[float, List[Dict[str, str]]]:
        """
        Analyze category using semantic similarity.
        Compares proposal content with reference requirements.
        """
        issues = []
        requirements = self.reference_requirements.get(category, [])
        
        if not requirements:
            return 0.5, []
        
        try:
            # Encode proposal content (truncate if too long)
            max_length = 5000
            proposal_text = proposal_content[:max_length]
            
            # Get embeddings
            proposal_embedding = model.encode([proposal_text], convert_to_numpy=True)
            requirement_embeddings = model.encode(requirements, convert_to_numpy=True)
            
            # Calculate cosine similarities
            from numpy import dot
            from numpy.linalg import norm
            
            similarities = []
            missing_requirements = []
            
            for i, req_emb in enumerate(requirement_embeddings):
                similarity = dot(proposal_embedding[0], req_emb) / (
                    norm(proposal_embedding[0]) * norm(req_emb)
                )
                similarities.append(similarity)
                
                # Track low-similarity requirements as potentially missing
                if similarity < 0.4:
                    missing_requirements.append(requirements[i])
            
            # Calculate category score
            avg_similarity = sum(similarities) / len(similarities)
            score = min(1.0, avg_similarity * 1.3)  # Scale up slightly
            
            # Add issues for missing requirements
            if missing_requirements and len(missing_requirements) > 1:
                issues.append({
                    "category": category,
                    "severity": "medium" if score > 0.5 else "high",
                    "description": f"Baixa aderência semântica em: {missing_requirements[0][:50]}...",
                    "recommendation": f"Adicionar conteúdo sobre: {missing_requirements[0][:50]}"
                })
            
            return round(score, 3), issues
            
        except Exception as e:
            logger.error(f"Semantic analysis failed for {category}: {e}")
            # Fallback to keyword analysis
            return await self._analyze_category_keywords(proposal_content, category)
    
    async def _analyze_category_keywords(
        self,
        proposal_content: str,
        category: str
    ) -> Tuple[float, List[Dict[str, str]]]:
        """
        Analyze category using keyword matching (fallback method).
        """
        content_lower = proposal_content.lower()
        issues = []
        
        # Category-specific keyword checks
        category_keywords = self._get_category_keywords(category)
        
        if not category_keywords:
            return 0.5, []
        
        matched_keywords = sum(
            1 for keyword in category_keywords
            if keyword in content_lower
        )
        
        # Calculate score based on keyword presence
        score = min(matched_keywords / len(category_keywords) * 1.2, 1.0)
        
        # Identify missing elements
        missing = [
            kw for kw in category_keywords
            if kw not in content_lower
        ]
        
        if missing and len(missing) > 2:
            issues.append({
                "category": category,
                "severity": "medium" if score > 0.5 else "high",
                "description": f"Elementos ausentes em {category}: {', '.join(missing[:3])}",
                "recommendation": f"Adicionar informações sobre {missing[0]}"
            })
        
        return score, issues
    
    def _get_category_keywords(self, category: str) -> List[str]:
        """Get keywords for each category."""
        keywords = {
            "technical_requirements": [
                "metodologia", "tecnologia", "inovação", "desenvolvimento",
                "resultados esperados", "trl", "protótipo"
            ],
            "financial_requirements": [
                "orçamento", "custo", "investimento", "contrapartida",
                "recursos", "planilha", "valores"
            ],
            "documentation_requirements": [
                "documentação", "anexos", "comprovantes", "certidões",
                "declarações", "currículo", "portfólio"
            ],
            "eligibility_criteria": [
                "elegibilidade", "requisitos", "qualificação",
                "experiência", "capacidade técnica"
            ],
            "timeline_compliance": [
                "cronograma", "prazo", "etapas", "milestones",
                "tempo", "duração", "entrega"
            ]
        }
        
        return keywords.get(category, [])
    
    def _generate_recommendations(
        self,
        category_scores: Dict[str, float],
        issues: List[Dict[str, str]]
    ) -> List[str]:
        """Generate actionable recommendations."""
        recommendations = []
        
        # Find lowest scoring categories
        sorted_categories = sorted(
            category_scores.items(),
            key=lambda x: x[1]
        )
        
        for category, score in sorted_categories[:3]:
            if score < 0.6:
                rec = self._get_category_recommendation(category)
                recommendations.append(rec)
        
        # Add specific issue-based recommendations
        high_severity_issues = [
            issue for issue in issues
            if issue["severity"] == "high"
        ]
        
        for issue in high_severity_issues[:3]:
            recommendations.append(issue["recommendation"])
        
        return recommendations
    
    def _get_category_recommendation(self, category: str) -> str:
        """Get recommendation for improving a category."""
        recommendations = {
            "technical_requirements": "Detalhar mais a metodologia técnica e resultados esperados do projeto",
            "financial_requirements": "Completar o orçamento detalhado com todas as rubricas necessárias",
            "documentation_requirements": "Incluir toda a documentação comprobatória exigida no edital",
            "eligibility_criteria": "Verificar e comprovar todos os critérios de elegibilidade",
            "timeline_compliance": "Elaborar cronograma detalhado com marcos e entregas"
        }
        
        return recommendations.get(
            category,
            f"Revisar e melhorar a seção de {category}"
        )
    
    def _get_overall_assessment(self, score: float) -> str:
        """Get overall assessment based on score."""
        if score >= 0.85:
            return "Excelente aderência ao edital. Proposta bem alinhada aos requisitos."
        elif score >= 0.70:
            return "Boa aderência ao edital. Pequenos ajustes recomendados."
        elif score >= 0.55:
            return "Aderência moderada. Revisão necessária em algumas áreas."
        else:
            return "Baixa aderência ao edital. Revisão substancial necessária."
