# Implements RF-06: Strategic Matching Engine
# Calculates matching scores between demands, capabilities, and funding
from typing import Dict, Any, List, Optional
from uuid import UUID
import logging
import numpy as np

logger = logging.getLogger(__name__)


# Neo4j connection for reputation scoring
_neo4j_connection = None


async def _get_neo4j():
    """Get Neo4j connection for historical queries."""
    global _neo4j_connection
    
    if _neo4j_connection is None:
        try:
            from adapters.database.neo4j_connection import neo4j_connection
            await neo4j_connection.connect()
            _neo4j_connection = neo4j_connection
        except Exception as e:
            logger.warning(f"Neo4j connection not available: {e}")
    
    return _neo4j_connection


async def get_organization_reputation(
    organization_id: str,
    tenant_id: str
) -> float:
    """
    Calculate organization reputation based on Neo4j historical success rate.
    
    Returns:
        Reputation score (0-100) based on:
        - Historical proposal success rate
        - Number of funded projects
        - Project completion rate
    """
    neo4j = await _get_neo4j()
    
    if neo4j is None:
        logger.info("Neo4j unavailable, using default reputation score")
        return 70.0  # Default if Neo4j unavailable
    
    try:
        # Query for historical success rate
        query = """
        MATCH (o:Organization {id: $org_id, tenant_id: $tenant_id})
        OPTIONAL MATCH (o)-[:SUBMITTED]->(p:Proposal)
        OPTIONAL MATCH (p)-[:FUNDED]->(f:Funding)
        OPTIONAL MATCH (p)-[:COMPLETED]->(result:Result)
        WITH o, 
             count(DISTINCT p) as total_proposals,
             count(DISTINCT f) as funded_projects,
             count(DISTINCT result) as completed_projects
        RETURN total_proposals, funded_projects, completed_projects
        """
        
        results = await neo4j.execute_query(
            query,
            {"org_id": organization_id, "tenant_id": tenant_id}
        )
        
        if not results:
            # No history - use neutral score
            return 70.0
        
        data = results[0]
        total = data.get("total_proposals", 0)
        funded = data.get("funded_projects", 0)
        completed = data.get("completed_projects", 0)
        
        if total == 0:
            return 70.0  # No history
        
        # Calculate success rate
        funding_rate = (funded / total) * 100 if total > 0 else 50
        completion_rate = (completed / funded) * 100 if funded > 0 else 50
        
        # Weighted average: 60% funding success, 40% completion success
        reputation = (funding_rate * 0.6) + (completion_rate * 0.4)
        
        # Apply experience bonus (max +10 for many projects)
        experience_bonus = min(10, total * 2)
        reputation = min(100, reputation + experience_bonus)
        
        logger.info(
            f"Organization {organization_id} reputation: {reputation:.1f} "
            f"(total: {total}, funded: {funded}, completed: {completed})"
        )
        
        return round(reputation, 1)
        
    except Exception as e:
        logger.error(f"Error calculating reputation: {e}")
        return 70.0  # Default on error


class MatchingEngine:
    """
    Strategic matching engine for calculating compatibility scores.
    Implements RF-06: Matching Estratégico
    Formula: Score = (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)
    """
    
    def __init__(self):
        # Weights for matching components (RF-06 specification)
        self.weights = {
            "technical": 0.4,
            "financial": 0.3,
            "strategic": 0.3
        }
    
    def calculate_composite_score(
        self,
        technical_viability: float,
        financial_viability: float,
        strategic_alignment: float
    ) -> float:
        """
        Calculate composite matching score using weighted formula.
        Implements RF-06: Score = (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)
        
        Args:
            technical_viability: Technical feasibility score (0-1)
            financial_viability: Financial viability score (0-1)
            strategic_alignment: Strategic alignment score (0-1)
            
        Returns:
            Composite score (0-1)
        """
        return (
            technical_viability * self.weights["technical"] +
            financial_viability * self.weights["financial"] +
            strategic_alignment * self.weights["strategic"]
        )
    
    def calculate_technical_viability(
        self, 
        project_data: Dict[str, Any], 
        funding_data: Dict[str, Any]
    ) -> float:
        """
        Calculate technical viability score based on TRL alignment and research areas.
        
        Args:
            project_data: Dict with current_trl, research_area, methodology
            funding_data: Dict with trl_min, trl_max, focus_areas
            
        Returns:
            Technical viability score (0-1)
        """
        score = 0.0
        
        # TRL alignment (70% weight)
        project_trl = project_data.get('current_trl', 1)
        trl_min = funding_data.get('trl_min', 1)
        trl_max = funding_data.get('trl_max', 9)
        
        if trl_min <= project_trl <= trl_max:
            trl_score = 1.0
        elif project_trl < trl_min:
            trl_score = max(0.0, 1.0 - (trl_min - project_trl) * 0.2)
        else:
            trl_score = max(0.0, 1.0 - (project_trl - trl_max) * 0.2)
        
        score += trl_score * 0.7
        
        # Research area alignment (30% weight)
        project_area = project_data.get('research_area', '')
        focus_areas = funding_data.get('focus_areas', [])
        
        if project_area in focus_areas:
            area_score = 1.0
        else:
            area_score = 0.3  # Partial match for related areas
        
        score += area_score * 0.3
        
        return min(1.0, score)
    
    def calculate_financial_viability(
        self, 
        project_budget: float, 
        funding_amount: float
    ) -> float:
        """
        Calculate financial viability based on budget alignment.
        
        Args:
            project_budget: Required project budget
            funding_amount: Available funding amount
            
        Returns:
            Financial viability score (0-1)
        """
        if funding_amount <= 0 or project_budget <= 0:
            return 0.0
            
        coverage_ratio = funding_amount / project_budget
        
        if coverage_ratio >= 1.0:
            return 1.0  # Full coverage
        elif coverage_ratio >= 0.8:
            return 0.9  # High viability
        elif coverage_ratio >= 0.6:
            return 0.7  # Medium viability
        elif coverage_ratio >= 0.4:
            return 0.5  # Low viability
        else:
            return 0.2  # Very low viability
    
    async def calculate_matching_score(
        self,
        opportunity: Dict[str, Any],
        capability: Dict[str, Any],
        funding: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive matching score.
        
        Args:
            opportunity: Opportunity/demand data
            capability: Project/portfolio capability data
            funding: Funding source data
            
        Returns:
            Dict with component scores and composite score
        """
        logger.info(
            f"Calculating matching score for opportunity-capability-funding triplet"
        )
        
        # Calculate component scores
        technical_score = await self._calculate_technical_score(
            opportunity, capability, funding
        )
        
        financial_score = await self._calculate_financial_score(
            opportunity, capability, funding
        )
        
        strategic_score = await self._calculate_strategic_score(
            opportunity, capability, funding
        )
        
        # Calculate composite score using RF-06 formula
        composite_score = (
            technical_score * self.weights["technical"] +
            financial_score * self.weights["financial"] +
            strategic_score * self.weights["strategic"]
        )
        
        # Calculate AI confidence based on data completeness
        confidence = self._calculate_confidence(opportunity, capability, funding)
        
        formula = (
            f"({technical_score:.2f} * {self.weights['technical']}) + "
            f"({financial_score:.2f} * {self.weights['financial']}) + "
            f"({strategic_score:.2f} * {self.weights['strategic']})"
        )
        
        logger.info(
            f"Matching complete. Composite score: {composite_score:.2f}, "
            f"Confidence: {confidence:.2f}"
        )
        
        return {
            "technical_feasibility_score": technical_score,
            "financial_viability_score": financial_score,
            "strategic_alignment_score": strategic_score,
            "composite_score": composite_score,
            "calculation_formula": formula,
            "ai_confidence": confidence,
            "calculation_details": {
                "weights": self.weights,
                "technical_factors": self._get_technical_factors(),
                "financial_factors": self._get_financial_factors(),
                "strategic_factors": self._get_strategic_factors()
            }
        }
    
    async def _calculate_technical_score(
        self,
        opportunity: Dict[str, Any],
        capability: Dict[str, Any],
        funding: Dict[str, Any]
    ) -> float:
        """
        Calculate technical feasibility score (0-100).
        Factors: TRL compatibility, competencies match, infrastructure
        """
        score_components = []
        
        # TRL compatibility
        if all(k in capability for k in ["trl_current"]) and all(k in funding for k in ["trl_min", "trl_max"]):
            trl_current = capability["trl_current"]
            trl_min = funding["trl_min"]
            trl_max = funding["trl_max"]
            
            if trl_min <= trl_current <= trl_max:
                trl_score = 100.0
            elif trl_current < trl_min:
                trl_score = max(0, 100 - (trl_min - trl_current) * 15)
            else:  # trl_current > trl_max
                trl_score = max(0, 100 - (trl_current - trl_max) * 10)
            
            score_components.append(trl_score)
        
        # Competencies match (if available)
        if "competencies" in capability and "required_competencies" in opportunity:
            cap_comp = set(capability["competencies"])
            req_comp = set(opportunity.get("required_competencies", []))
            
            if req_comp:
                match_ratio = len(cap_comp & req_comp) / len(req_comp)
                comp_score = match_ratio * 100
                score_components.append(comp_score)
        
        # Infrastructure availability
        if "infrastructure" in capability and capability["infrastructure"]:
            infra_score = 80.0  # Simplified score
            score_components.append(infra_score)
        
        # Return average of available components
        return np.mean(score_components) if score_components else 50.0
    
    async def _calculate_financial_score(
        self,
        opportunity: Dict[str, Any],
        capability: Dict[str, Any],
        funding: Dict[str, Any]
    ) -> float:
        """
        Calculate financial viability score (0-100).
        Factors: Budget alignment, available funding, cost efficiency
        """
        score_components = []
        
        # Budget alignment
        if "estimated_value" in opportunity and "available_amount" in funding:
            estimated = float(opportunity["estimated_value"])
            available = float(funding["available_amount"])
            
            if estimated <= available:
                # Perfect fit or funding exceeds need
                budget_score = 100.0
            elif estimated <= available * 1.5:
                # Slightly over budget but feasible
                budget_score = 100 - ((estimated / available - 1) * 100)
            else:
                # Significantly over budget
                budget_score = max(0, 50 - ((estimated / available - 1.5) * 50))
            
            score_components.append(budget_score)
        
        # Portfolio budget compatibility
        if "total_budget" in capability and capability["total_budget"]:
            # Simplified: assume good financial health if portfolio has budget
            financial_health_score = 75.0
            score_components.append(financial_health_score)
        
        return np.mean(score_components) if score_components else 60.0
    
    async def _calculate_strategic_score(
        self,
        opportunity: Dict[str, Any],
        capability: Dict[str, Any],
        funding: Dict[str, Any],
        tenant_id: str = ""
    ) -> float:
        """
        Calculate strategic alignment score (0-100).
        Factors: Strategic areas match, organizational goals, sector alignment,
                 historical reputation from Neo4j
        """
        score_components = []
        
        # Strategic areas alignment
        if "strategic_areas" in capability and "sector" in opportunity:
            strategic_areas = [area.lower() for area in capability["strategic_areas"]]
            opp_sector = opportunity["sector"].lower()
            
            # Check if sector aligns with strategic areas
            if any(opp_sector in area or area in opp_sector for area in strategic_areas):
                area_score = 90.0
            else:
                area_score = 40.0
            
            score_components.append(area_score)
        
        # Priority alignment
        if "priority" in opportunity:
            priority_map = {"critical": 100, "high": 80, "medium": 60, "low": 40}
            priority_score = priority_map.get(opportunity["priority"], 50)
            score_components.append(priority_score)
        
        # Funding source organization reputation from Neo4j historical data
        if "source_organization" in funding or "organization_id" in capability:
            org_id = str(
                capability.get("organization_id") or 
                funding.get("source_organization_id", "")
            )
            if org_id and tenant_id:
                reputation_score = await get_organization_reputation(
                    org_id, tenant_id
                )
            else:
                reputation_score = 70.0  # Default if no org info
            score_components.append(reputation_score)
        
        return np.mean(score_components) if score_components else 55.0
    
    def _calculate_confidence(
        self,
        opportunity: Dict[str, Any],
        capability: Dict[str, Any],
        funding: Dict[str, Any]
    ) -> float:
        """
        Calculate AI confidence based on data completeness.
        More complete data = higher confidence
        """
        required_fields = {
            "opportunity": ["title", "description", "estimated_value"],
            "capability": ["trl_current", "competencies"],
            "funding": ["trl_min", "trl_max", "available_amount"]
        }
        
        total_fields = sum(len(fields) for fields in required_fields.values())
        present_fields = 0
        
        for entity, fields in [
            (opportunity, required_fields["opportunity"]),
            (capability, required_fields["capability"]),
            (funding, required_fields["funding"])
        ]:
            present_fields += sum(1 for field in fields if field in entity)
        
        completeness = present_fields / total_fields
        
        # Confidence ranges from 0.5 to 0.95
        confidence = 0.5 + (completeness * 0.45)
        
        return round(confidence, 2)
    
    def _get_technical_factors(self) -> List[str]:
        """Return list of technical factors considered."""
        return [
            "TRL compatibility",
            "Team competencies match",
            "Infrastructure availability",
            "Technical complexity assessment"
        ]
    
    def _get_financial_factors(self) -> List[str]:
        """Return list of financial factors considered."""
        return [
            "Budget alignment",
            "Available funding vs. estimated cost",
            "Portfolio financial health",
            "Cost efficiency indicators"
        ]
    
    def _get_strategic_factors(self) -> List[str]:
        """Return list of strategic factors considered."""
        return [
            "Strategic areas alignment",
            "Organizational goals fit",
            "Priority level",
            "Funding source reputation"
        ]
