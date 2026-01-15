"""
Matching API Routes (stubs)
Implements RF-06: Minimal endpoints expected by frontend clients

This adapter provides lightweight stub implementations for:
- POST /api/v1/matching/execute
- GET  /api/v1/matching/results/{result_id}
- GET  /api/v1/matching/scores/{project_id}/{funding_id}
- GET  /api/v1/matching/explain/{project_id}/{funding_id}

These are intentionally simple and return deterministic example data so the
frontend can operate during local development when the full matching use case
implementation is not available.
"""
from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/v1/matching", tags=["matching"])


def _now_iso():
    return datetime.utcnow().isoformat()


@router.post("/execute", summary="Execute matching (stub)")
def execute_matching(payload: dict):
    # Accept calls with or without project_id/funding_source_id to support
    # frontend requests that only pass parameters like `max_results`.
    # Return a stubbed MatchingResultResponse-like structure.
    return {
        "id": "stub-1",
        "project_id": payload.get("project_id"),
        "funding_source_id": payload.get("funding_source_id"),
        "matches": [
            {
                "project_id": payload.get("project_id") or "proj-1",
                "funding_source_id": payload.get("funding_source_id") or "fund-1",
                "composite_score": 0.86,
                "technical_viability": 0.9,
                "financial_viability": 0.8,
                "strategic_alignment": 0.88,
                "components": {"tech": 0.9, "fin": 0.8, "strat": 0.88},
                "ai_confidence_score": 0.92,
                "calculated_at": _now_iso(),
            }
        ],
        "total_matches": 1,
        "executed_at": _now_iso(),
        "parameters": payload,
    }


@router.get("/results/{result_id}", summary="Get matching result by id")
def get_matching_result(result_id: str):
    if result_id != "stub-1":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matching result not found")
    return {
        "id": "stub-1",
        "project_id": "proj-1",
        "funding_source_id": "fund-1",
        "matches": [],
        "total_matches": 0,
        "executed_at": _now_iso(),
        "parameters": {},
    }


@router.get("/scores/{project_id}/{funding_id}", summary="Get matching score for a pair (stub)")
def get_matching_score(project_id: str, funding_id: str):
    return {
        "project_id": project_id,
        "funding_source_id": funding_id,
        "composite_score": 0.75,
        "technical_viability": 0.8,
        "financial_viability": 0.7,
        "strategic_alignment": 0.75,
        "components": {"tech": 0.8, "fin": 0.7, "strat": 0.75},
        "ai_confidence_score": 0.85,
        "calculated_at": _now_iso(),
    }


@router.get("/explain/{project_id}/{funding_id}", summary="Explain matching (stub)")
def explain_matching(project_id: str, funding_id: str):
    return {
        "score": 0.75,
        "components": {"technical": 0.8, "financial": 0.7, "strategic": 0.75},
        "strengths": ["Good technical fit", "Strong strategic alignment"],
        "weaknesses": ["Budget constraints"],
        "recommendations": ["Increase budget estimation", "Seek co-funding"],
    }
