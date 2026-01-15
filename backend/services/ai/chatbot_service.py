"""
Explainable Chatbot Service with LangChain
Implements RF-07: Chatbot explicável com transparência de IA

This module uses database-stored LLM configurations instead of environment variables.
The LLM provider, model, and API key are managed via the /api/v1/admin/llm-config endpoints.
"""
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from enum import Enum

from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.chat_history import InMemoryChatMessageHistory

# Import for Google provider support
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    GOOGLE_GENAI_AVAILABLE = True
except ImportError:
    GOOGLE_GENAI_AVAILABLE = False


# =============================================================================
# Default Configuration (fallback if no DB config exists)
# =============================================================================

DEFAULT_LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
DEFAULT_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DEFAULT_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
DEFAULT_GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
DEFAULT_AZURE_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
DEFAULT_AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
DEFAULT_AZURE_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")


# =============================================================================
# Models
# =============================================================================

class ConfidenceLevel(str, Enum):
    HIGH = "high"      # > 80%
    MEDIUM = "medium"  # 60-80%
    LOW = "low"        # < 60%


class SourceReference(BaseModel):
    """Reference to data source used in response"""
    type: str  # funding, project, client, matching, document
    id: str
    title: str
    relevance_score: float  # 0-1
    excerpt: Optional[str] = None


class ExplainableResponse(BaseModel):
    """Structured chatbot response with transparency"""
    answer: str
    confidence: float  # 0-1
    confidence_level: ConfidenceLevel
    sources: List[SourceReference]
    reasoning_steps: List[str]  # Chain of thought
    suggestions: List[str]  # Follow-up questions
    requires_human_validation: bool
    timestamp: datetime = None
    
    def __init__(self, **data):
        if data.get('timestamp') is None:
            data['timestamp'] = datetime.now()
        super().__init__(**data)


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # user, assistant, system
    content: str
    timestamp: datetime = None
    metadata: Optional[Dict[str, Any]] = None


# =============================================================================
# System Prompts
# =============================================================================

SYSTEM_PROMPT = """Você é o assistente inteligente do ProspecAI, um sistema de prospecção de projetos de P&D.

RESPONSABILIDADES:
1. Ajudar usuários a encontrar oportunidades de fomento
2. Explicar matches entre projetos e editais
3. Responder sobre portfólio de projetos da instituição
4. Auxiliar na elaboração de propostas

PRINCÍPIOS (Human-in-the-Loop):
- NUNCA tome decisões finais autônomas
- SEMPRE indique o nível de confiança da resposta
- SEMPRE cite as fontes de informação usadas
- Sugira quando validação humana é necessária

FORMATO DE RESPOSTA:
Responda em JSON com a seguinte estrutura:
{{
  "answer": "Sua resposta aqui",
  "confidence": 0.85,
  "sources": [
    {{"type": "funding", "id": "123", "title": "Edital FINEP", "relevance_score": 0.9}}
  ],
  "reasoning_steps": [
    "Passo 1: Analisei os requisitos do edital",
    "Passo 2: Comparei com competências do projeto"
  ],
  "suggestions": [
    "Deseja ver mais detalhes sobre este edital?",
    "Quer que eu compare com outros editais similares?"
  ],
  "requires_human_validation": true
}}

CONTEXTO ATUAL:
{context}

Use o histórico da conversa para manter continuidade."""


MATCHING_EXPLANATION_PROMPT = """Analise e explique o matching entre o projeto e o edital:

PROJETO:
{project}

EDITAL:
{funding}

SCORE DE MATCHING: {score}

Explique de forma clara:
1. Por que este match foi sugerido
2. Pontos fortes do projeto para este edital
3. Lacunas ou riscos identificados
4. Recomendações para aumentar a aderência

Mantenha transparência total sobre o raciocínio."""


# =============================================================================
# LLM Factory
# =============================================================================

def get_llm_from_config(
    provider: str,
    model_name: str,
    api_key: Optional[str] = None,
    api_base_url: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    streaming: bool = False,
    **kwargs
):
    """
    Factory function to get appropriate LLM based on configuration.
    
    Args:
        provider: LLM provider (openai, ollama, google, azure)
        model_name: Model to use
        api_key: Decrypted API key
        api_base_url: Base URL for Ollama/Azure
        temperature: Creativity setting (0-1)
        max_tokens: Maximum tokens in response
        streaming: Enable streaming responses
        **kwargs: Additional provider-specific settings
    
    Returns:
        Configured LLM instance
    """
    if provider == "openai":
        if not api_key:
            raise ValueError("OpenAI API key is required. Please configure in Admin > LLM Settings.")
        return ChatOpenAI(
            model=model_name or "gpt-4-turbo-preview",
            temperature=temperature,
            max_tokens=max_tokens,
            openai_api_key=api_key,
            streaming=streaming,
        )
    
    elif provider == "ollama":
        base_url = api_base_url or DEFAULT_OLLAMA_BASE_URL
        return ChatOllama(
            model=model_name or "llama3",
            base_url=base_url,
            temperature=temperature,
        )
    
    elif provider == "google":
        if not GOOGLE_GENAI_AVAILABLE:
            raise ValueError("Google GenAI not available. Install langchain-google-genai package.")
        if not api_key:
            raise ValueError("Google API key is required. Please configure in Admin > LLM Settings.")
        
        # Configure client with minimal retries for faster test feedback
        max_retries = kwargs.get("max_retries", 3)
        
        return ChatGoogleGenerativeAI(
            model=model_name or "gemini-2.0-flash",
            google_api_key=api_key,
            temperature=temperature,
            max_output_tokens=max_tokens,
            max_retries=max_retries,
        )
    
    elif provider == "azure":
        if not api_key:
            raise ValueError("Azure OpenAI API key is required. Please configure in Admin > LLM Settings.")
        return AzureChatOpenAI(
            model=model_name,
            azure_endpoint=api_base_url or DEFAULT_AZURE_ENDPOINT,
            api_key=api_key,
            api_version=kwargs.get("api_version", "2024-02-01"),
            temperature=temperature,
            max_tokens=max_tokens,
            streaming=streaming,
        )
    
    else:
        raise ValueError(f"Unknown LLM provider: {provider}. Supported: openai, ollama, google, azure")


def get_llm(streaming: bool = False):
    """
    Legacy factory function using environment variables.
    Use get_llm_from_config() for database-configured LLMs.
    """
    return get_llm_from_config(
        provider=DEFAULT_LLM_PROVIDER,
        model_name=None,
        api_key=DEFAULT_OPENAI_API_KEY or DEFAULT_GOOGLE_API_KEY,
        api_base_url=DEFAULT_OLLAMA_BASE_URL,
        streaming=streaming,
    )


# =============================================================================
# Chatbot Service
# =============================================================================

class ExplainableChatbot:
    """
    Main chatbot service with explainability features.
    
    Supports dynamic LLM configuration from database or fallback to environment variables.
    """
    
    def __init__(
        self,
        tenant_id: str,
        llm_config: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize chatbot with optional LLM configuration.
        
        Args:
            tenant_id: Tenant identifier for multi-tenant support
            llm_config: Optional LLM configuration dict with keys:
                - provider: str (openai, ollama, google, azure)
                - model_name: str
                - api_key: str (decrypted)
                - api_base_url: Optional[str]
                - temperature: float
                - max_tokens: int
        """
        self.tenant_id = tenant_id
        self.llm_config = llm_config
        self._llm = None
        self._llm_error = None
        self.json_parser = JsonOutputParser()
        self.memory = InMemoryChatMessageHistory()
        
        # Build prompt
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", "{input}"),
        ])
        
        # Try to initialize LLM
        self._initialize_llm()
    
    def _initialize_llm(self):
        """Initialize LLM based on configuration."""
        try:
            if self.llm_config:
                self._llm = get_llm_from_config(
                    provider=self.llm_config.get("provider", "openai"),
                    model_name=self.llm_config.get("model_name"),
                    api_key=self.llm_config.get("api_key"),
                    api_base_url=self.llm_config.get("api_base_url"),
                    temperature=self.llm_config.get("temperature", 0.3),
                    max_tokens=self.llm_config.get("max_tokens", 2048),
                )
            else:
                # Fallback to environment variables
                self._llm = get_llm()
            self._llm_error = None
        except Exception as e:
            self._llm = None
            self._llm_error = str(e)
    
    def update_llm_config(self, llm_config: Dict[str, Any]):
        """
        Update LLM configuration dynamically.
        
        Args:
            llm_config: New LLM configuration dict
        """
        self.llm_config = llm_config
        self._initialize_llm()
    
    @property
    def llm(self):
        """Get LLM instance, raising error if not configured."""
        if self._llm is None:
            raise ValueError(
                f"LLM não configurado. {self._llm_error or 'Configure o provedor LLM em Configurações > Provedor IA.'}"
            )
        return self._llm
    
    @property
    def is_configured(self) -> bool:
        """Check if LLM is properly configured."""
        return self._llm is not None
    
    @property
    def configuration_error(self) -> Optional[str]:
        """Get configuration error message if any."""
        return self._llm_error

    async def chat(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> ExplainableResponse:
        """
        Process user message and return explainable response.
        Args:
            message: User's input message
            context: Optional context (current page, selected items, etc.)
        Returns:
            ExplainableResponse with answer, confidence, and sources
        """
        # Check if LLM is configured
        if not self.is_configured:
            return ExplainableResponse(
                answer=f"O assistente de IA não está configurado. {self._llm_error or 'Por favor, configure o provedor LLM nas configurações de administrador.'}",
                confidence=0.0,
                confidence_level=ConfidenceLevel.LOW,
                sources=[],
                reasoning_steps=["Verificação de configuração falhou"],
                suggestions=[
                    "Acesse Configurações > Provedor IA para configurar",
                    "Entre em contato com o administrador do sistema"
                ],
                requires_human_validation=True,
            )
        
        context_str = self._build_context(context)
        formatted_prompt = self.prompt.format_messages(
            context=context_str,
            input=message,
        )
        try:
            response = await self.llm.ainvoke(formatted_prompt)
            parsed = self._parse_response(response.content)
            return parsed
        except Exception as e:
            return ExplainableResponse(
                answer=f"Desculpe, ocorreu um erro ao processar sua pergunta: {str(e)}",
                confidence=0.0,
                confidence_level=ConfidenceLevel.LOW,
                sources=[],
                reasoning_steps=["Erro durante processamento"],
                suggestions=["Tente reformular sua pergunta"],
                requires_human_validation=True,
            )
    
    async def explain_matching(
        self,
        project: Dict[str, Any],
        funding: Dict[str, Any],
        score: float,
    ) -> ExplainableResponse:
        """
        Generate human-readable explanation for a matching result.
        """
        prompt = ChatPromptTemplate.from_template(MATCHING_EXPLANATION_PROMPT)
        
        return self._parse_response(response.content, default_sources=[
            SourceReference(
                type="project",
                id=project.get("id", ""),
                title=project.get("title", "Projeto"),
                relevance_score=1.0,
            ),
            SourceReference(
                type="funding",
                id=funding.get("id", ""),
                title=funding.get("name", "Edital"),
                relevance_score=score,
            ),
        ])
    
    def _build_context(self, context: Optional[Dict[str, Any]]) -> str:
        """Build context string from provided data"""
        if not context:
            return "Nenhum contexto adicional disponível."
        
        parts = []
        
        if "current_page" in context:
            parts.append(f"Página atual: {context['current_page']}")
        
        if "selected_funding" in context:
            parts.append(f"Edital selecionado: {context['selected_funding']}")
        
        if "selected_project" in context:
            parts.append(f"Projeto selecionado: {context['selected_project']}")
        
        if "user_role" in context:
            parts.append(f"Perfil do usuário: {context['user_role']}")
        
        return "\n".join(parts) if parts else "Navegação geral no sistema."
    
    def _parse_response(
        self,
        content: str,
        default_sources: List[SourceReference] = None,
    ) -> ExplainableResponse:
        """Parse LLM response into structured format"""
        try:
            # Try to parse as JSON
            import json
            
            # Find JSON block in response
            start = content.find("{")
            end = content.rfind("}") + 1
            
            if start >= 0 and end > start:
                json_str = content[start:end]
                data = json.loads(json_str)
                
                confidence = data.get("confidence", 0.5)
                
                return ExplainableResponse(
                    answer=data.get("answer", content),
                    confidence=confidence,
                    confidence_level=self._get_confidence_level(confidence),
                    sources=[
                        SourceReference(**s) for s in data.get("sources", [])
                    ] if data.get("sources") else (default_sources or []),
                    reasoning_steps=data.get("reasoning_steps", []),
                    suggestions=data.get("suggestions", []),
                    requires_human_validation=data.get("requires_human_validation", confidence < 0.8),
                )
            
        except Exception:
            pass
        
        # Fallback: return plain text response
        return ExplainableResponse(
            answer=content,
            confidence=0.5,
            confidence_level=ConfidenceLevel.MEDIUM,
            sources=default_sources or [],
            reasoning_steps=["Resposta gerada sem estrutura JSON"],
            suggestions=["Posso ajudar com mais alguma coisa?"],
            requires_human_validation=True,
        )
    
    def _get_confidence_level(self, confidence: float) -> ConfidenceLevel:
        """Map confidence score to level"""
        if confidence >= 0.8:
            return ConfidenceLevel.HIGH
        elif confidence >= 0.6:
            return ConfidenceLevel.MEDIUM
        return ConfidenceLevel.LOW
    
    def clear_memory(self):
        """Clear conversation history"""
        self.memory.clear()
    
    def get_history(self) -> List[ChatMessage]:
        """Get conversation history as list of messages"""
        messages = self.memory.messages
        return [
            ChatMessage(
                role="user" if isinstance(m, HumanMessage) else "assistant",
                content=m.content,
            )
            for m in messages
        ]


# =============================================================================
# Factory
# =============================================================================

_chatbot_instances: Dict[str, ExplainableChatbot] = {}


def get_chatbot(
    tenant_id: str,
    llm_config: Optional[Dict[str, Any]] = None,
    force_refresh: bool = False,
) -> ExplainableChatbot:
    """
    Get or create chatbot instance for tenant.
    
    Args:
        tenant_id: Tenant identifier
        llm_config: Optional LLM configuration dict. If provided, the chatbot
                   will be updated with this configuration.
        force_refresh: Force recreation of chatbot instance with new config
    
    Returns:
        ExplainableChatbot instance
    """
    if force_refresh and tenant_id in _chatbot_instances:
        del _chatbot_instances[tenant_id]
    
    if tenant_id not in _chatbot_instances:
        _chatbot_instances[tenant_id] = ExplainableChatbot(tenant_id, llm_config)
    elif llm_config:
        # Update existing instance with new config
        _chatbot_instances[tenant_id].update_llm_config(llm_config)
    
    return _chatbot_instances[tenant_id]


def clear_chatbot_cache(tenant_id: Optional[str] = None):
    """
    Clear cached chatbot instances.
    
    Args:
        tenant_id: Specific tenant to clear, or None to clear all
    """
    if tenant_id:
        _chatbot_instances.pop(tenant_id, None)
    else:
        _chatbot_instances.clear()


async def get_chatbot_with_db_config(
    tenant_id: str,
    db_session,
) -> ExplainableChatbot:
    """
    Get chatbot with LLM configuration from database.
    
    Args:
        tenant_id: Tenant identifier
        db_session: SQLAlchemy async session
    
    Returns:
        ExplainableChatbot configured from database
    """
    from adapters.repositories.llm_config_repository import LLMConfigRepository
    
    repo = LLMConfigRepository(db_session)
    active_config = await repo.get_active_config(tenant_id)
    
    if active_config:
        try:
            # Get decrypted API key (pass the config object, not just id)
            api_key = repo.get_decrypted_api_key(active_config)
            
            llm_config = {
                "provider": active_config.provider,
                "model_name": active_config.model_name,
                "api_key": api_key,
                "api_base_url": active_config.base_url,
                "temperature": active_config.temperature,
                "max_tokens": active_config.max_tokens,
            }
            
            return get_chatbot(tenant_id, llm_config)
        except ValueError as e:
            # Decryption failed - ENCRYPTION_KEY changed or data corrupted
            # Return chatbot with explicit error message instead of crashing
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to decrypt LLM API key for tenant {tenant_id}: {e}")
            
            # Create chatbot with error state
            chatbot = get_chatbot(tenant_id)
            chatbot._llm = None
            chatbot._llm_error = (
                "A chave de API do provedor LLM não pôde ser descriptografada. "
                "A ENCRYPTION_KEY pode ter sido alterada. "
                "Por favor, reconfigure o provedor LLM em Configurações > Provedor IA."
            )
            return chatbot
    
    # No DB config, use environment fallback
    return get_chatbot(tenant_id)
