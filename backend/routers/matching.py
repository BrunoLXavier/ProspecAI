"""
Matching API Router
Implements RF-06: Algoritmos de Matching
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from domain.entities.matching import MatchingScore, MatchingResult
from use_cases.execute_matching import ExecuteMatchingUseCase
from infrastructure.di_container import get_container

router = APIRouter()


# Request/Response Schemas
class MatchingRequest(BaseModel):
    project_id: str | None = None
    funding_source_id: str | None = None
    min_score: float = 0.6
    max_results: int = 10


class MatchingScoreResponse(BaseModel):
    project_id: str
    funding_source_id: str
    composite_score: float
    technical_viability: float
    financial_viability: float
    strategic_alignment: float
    components: dict
    ai_confidence_score: float
    calculated_at: str

    class Config:
        from_attributes = True


class MatchingResultResponse(BaseModel):
    id: str
    project_id: str | None
    funding_source_id: str | None
    matches: List[MatchingScoreResponse]
    total_matches: int
    executed_at: str
    parameters: dict

    class Config:
        from_attributes = True


class MatchingExplanation(BaseModel):
    score: float
    components: dict
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]


# Dependency injection
async def get_matching_use_case() -> ExecuteMatchingUseCase:
    """Get ExecuteMatchingUseCase with injected dependencies."""
    async with get_container() as container:
        return container.get_execute_matching_use_case()


@router.post("/execute", response_model=MatchingResultResponse, status_code=status.HTTP_201_CREATED)
async def execute_matching(
    data: MatchingRequest,
    use_case: ExecuteMatchingUseCase = Depends(get_matching_use_case),
):
    """
    Execute matching algorithm between projects and funding sources
    
    Implements RF-06.01: Execução do algoritmo de matching
    Formula: Score = (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)
    """
    if not data.project_id and not data.funding_source_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either project_id or funding_source_id must be provided"
        )
    
    result = await use_case.execute_matching(
        project_id=data.project_id,
        funding_source_id=data.funding_source_id,
        min_score=data.min_score,
        max_results=data.max_results,
    )
    
    return result


@router.get("/results/{result_id}", response_model=MatchingResultResponse)
async def get_matching_result(
    result_id: str,
    use_case: ExecuteMatchingUseCase = Depends(get_matching_use_case),
):
    """
    Get a previously executed matching result
    
    Implements RF-06.02: Recuperação de resultados de matching
    """
    result = await use_case.get_matching_result(result_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Matching result {result_id} not found"
        )
    
    return result


@router.get("/scores/{project_id}/{funding_id}", response_model=MatchingScoreResponse)
async def get_matching_score(
    project_id: str,
    funding_id: str,
    use_case: ExecuteMatchingUseCase = Depends(get_matching_use_case),
):
    """
    Calculate matching score for a specific project-funding pair
    
    Implements RF-06.03: Cálculo de score individual
    """
    score = await use_case.calculate_score(
        project_id=project_id,
        funding_source_id=funding_id,
    )
    
    if not score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not calculate score for project {project_id} and funding {funding_id}"
        )
    
    return score


@router.get("/explain/{project_id}/{funding_id}", response_model=MatchingExplanation)
async def explain_matching(
    project_id: str,
    funding_id: str,
    use_case: ExecuteMatchingUseCase = Depends(get_matching_use_case),
):
    """
    Get detailed explanation of matching score components
    
    Implements RF-06.04: Explicação transparente do score (RNF-04)
    """
    explanation = await use_case.explain_matching(
        project_id=project_id,
        funding_source_id=funding_id,
    )
    
    if not explanation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not generate explanation for project {project_id} and funding {funding_id}"
        )
    
    return explanation


@router.post("/batch", response_model=MatchingResultResponse)
async def batch_matching(
    project_ids: List[str] | None = None,
    funding_ids: List[str] | None = None,
    min_score: float = 0.6,
    use_case: ExecuteMatchingUseCase = Depends(get_matching_use_case),
):
    """
    Execute batch matching for multiple projects/fundings
    
    Implements RF-06.05: Matching em lote
    """
    result = await use_case.batch_matching(
        project_ids=project_ids,
        funding_ids=funding_ids,
        min_score=min_score,
    )
    
    return result


@router.get("/history", response_model=List[MatchingResultResponse])
async def list_matching_history(
    project_id: str | None = None,
    funding_source_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
    use_case: ExecuteMatchingUseCase = Depends(get_matching_use_case),
):
    """
    List matching execution history
    
    Implements RF-06.06: Histórico de matching
    """
    results = await use_case.list_matching_history(
        project_id=project_id,
        funding_source_id=funding_source_id,
        skip=skip,
        limit=limit,
    )
    
    return results
