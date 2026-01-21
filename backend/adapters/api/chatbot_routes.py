"""
Chatbot API Routes
Implements RF-07: Chatbot explicável

Uses database-stored LLM configuration for AI provider settings.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from infrastructure.auth import get_auth_dependency, CurrentUser
from adapters.database.connection import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from services.ai.chatbot_service import (
    get_chatbot,
    get_chatbot_with_db_config,
    ExplainableResponse,
    ChatMessage,
)
from infrastructure.serializers import to_primitive

router = APIRouter(prefix="/api/v1/chatbot", tags=["chatbot"])

# Get auth dependency (uses dev user when external IdP not configured)
auth_dependency = get_auth_dependency()


# =============================================================================
# Request/Response Models
# =============================================================================

class ChatRequest(BaseModel):
    """Chat request payload"""
    message: str
    context: Optional[Dict[str, Any]] = None


class MatchingExplanationRequest(BaseModel):
    """Request to explain a matching result"""
    project_id: str
    funding_id: str
    score: float
    project_data: Optional[Dict[str, Any]] = None
    funding_data: Optional[Dict[str, Any]] = None


class ChatHistoryResponse(BaseModel):
    """Chat history response"""
    messages: List[ChatMessage]
    count: int


# =============================================================================
# Routes
# =============================================================================

@router.post("/chat", response_model=ExplainableResponse)
async def chat(
    request: ChatRequest,
    current_user: CurrentUser = Depends(auth_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to the chatbot and receive an explainable response.
    
    The response includes:
    - answer: The actual response text
    - confidence: Confidence score (0-1)
    - confidence_level: high/medium/low badge
    - sources: References to data used
    - reasoning_steps: Explanation of logic
    - suggestions: Follow-up questions
    - requires_human_validation: Whether expert review is needed
    
    LLM configuration is loaded from database (Admin > LLM Settings).
    """
    # Get chatbot with DB-stored LLM configuration
    chatbot = await get_chatbot_with_db_config(current_user.tenant_id, db)
    
    # Add user info to context
    context = request.context or {}
    context["user_role"] = ", ".join(current_user.roles)
    context["user_name"] = current_user.name
    
    response = await chatbot.chat(request.message, context)
    return to_primitive(response)


@router.post("/explain-matching", response_model=ExplainableResponse)
async def explain_matching(
    request: MatchingExplanationRequest,
    current_user: CurrentUser = Depends(auth_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate human-readable explanation for a matching result.
    
    Provides transparency into why a project-funding match was suggested,
    including strengths, gaps, and recommendations.
    """
    # Get chatbot with DB-stored LLM configuration
    chatbot = await get_chatbot_with_db_config(current_user.tenant_id, db)
    
    # Use provided data or fetch from database
    project_data = request.project_data or {"id": request.project_id}
    funding_data = request.funding_data or {"id": request.funding_id}
    
    response = await chatbot.explain_matching(
        project=project_data,
        funding=funding_data,
        score=request.score,
    )
    return to_primitive(response)


@router.get("/history", response_model=ChatHistoryResponse)
async def get_history(
    current_user: CurrentUser = Depends(auth_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Get conversation history for current session.
    """
    chatbot = await get_chatbot_with_db_config(current_user.tenant_id, db)
    messages = chatbot.get_history()
    
    return to_primitive(ChatHistoryResponse(
        messages=messages,
        count=len(messages),
    ))


@router.post("/clear-history")
async def clear_history(
    current_user: CurrentUser = Depends(auth_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Clear conversation history for current session.
    """
    chatbot = await get_chatbot_with_db_config(current_user.tenant_id, db)
    chatbot.clear_memory()
    
    return {"message": "History cleared", "success": True}


@router.get("/health")
async def health():
    """Health check for chatbot service"""
    return {"status": "healthy", "service": "chatbot"}


@router.get("/status")
async def get_status(
    current_user: CurrentUser = Depends(auth_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Get chatbot configuration status.
    
    Returns whether LLM is configured and any error messages.
    """
    chatbot = await get_chatbot_with_db_config(current_user.tenant_id, db)
    
    return {
        "is_configured": chatbot.is_configured,
        "error": chatbot.configuration_error,
        "provider": chatbot.llm_config.get("provider") if chatbot.llm_config else None,
        "model": chatbot.llm_config.get("model_name") if chatbot.llm_config else None,
    }
