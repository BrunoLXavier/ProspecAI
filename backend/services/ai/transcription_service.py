"""
Audio/Video Transcription Service using External Whisper Docker Service
Implements transcription for communication recordings with report generation.

This service calls the dedicated Whisper Docker container via HTTP API
and can generate structured reports based on the transcription content.

Architecture:
- Whisper runs in separate Docker container (prospecai-whisper)
- Backend calls Whisper service via HTTP API
- This decouples heavy ML workload from the main backend
"""
import os
import tempfile
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

# Whisper service configuration
WHISPER_SERVICE_URL = os.getenv("WHISPER_SERVICE_URL", "http://whisper:8001")
WHISPER_TIMEOUT = float(os.getenv("WHISPER_TIMEOUT", "300"))  # 5 minutes default

# Try to import OpenAI for cloud transcription fallback
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class TranscriptionProvider(str, Enum):
    """Supported transcription providers"""
    DOCKER_WHISPER = "docker_whisper"  # External Whisper Docker service
    OPENAI_WHISPER = "openai_whisper"   # OpenAI API
    MOCK = "mock"                        # For testing


class TranscriptionLanguage(str, Enum):
    """Supported transcription languages"""
    PORTUGUESE = "pt"
    ENGLISH = "en"
    SPANISH = "es"
    AUTO = "auto"


class TranscriptionResult(BaseModel):
    """Result of audio/video transcription"""
    text: str
    language: str
    duration_seconds: float
    segments: List[Dict[str, Any]]  # Timed segments
    confidence: float  # Average confidence 0-1
    provider: TranscriptionProvider
    transcribed_at: datetime
    
    class Config:
        use_enum_values = True


class ReportFromTranscription(BaseModel):
    """Report generated from transcription"""
    transcription: TranscriptionResult
    template_id: str
    template_name: str
    report_content: str
    report_format: str
    generated_at: datetime
    thread_id: Optional[str] = None


class TranscriptionService:
    """
    Service for transcribing audio/video files via external Whisper Docker service.
    Falls back to OpenAI Whisper API or mock for testing.
    """
    
    def __init__(
        self,
        provider: TranscriptionProvider = TranscriptionProvider.DOCKER_WHISPER,
        whisper_url: Optional[str] = None,
        openai_api_key: Optional[str] = None,
    ):
        self.provider = provider
        self.whisper_url = whisper_url or WHISPER_SERVICE_URL
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self._openai_client = None
    
    def _get_openai_client(self):
        """Lazy load OpenAI client"""
        if self._openai_client is None and OPENAI_AVAILABLE and self.openai_api_key:
            self._openai_client = AsyncOpenAI(api_key=self.openai_api_key)
        return self._openai_client
    
    async def check_whisper_health(self) -> bool:
        """Check if Whisper Docker service is available"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.whisper_url}/health")
                if response.status_code == 200:
                    data = response.json()
                    return data.get("status") == "healthy"
        except Exception as e:
            logger.warning(f"Whisper health check failed: {e}")
        return False
    
    async def transcribe(
        self,
        audio_data: bytes,
        filename: str,
        language: TranscriptionLanguage = TranscriptionLanguage.AUTO,
    ) -> TranscriptionResult:
        """
        Transcribe audio/video file to text.
        
        Args:
            audio_data: Raw bytes of audio/video file
            filename: Original filename for format detection
            language: Target language or auto-detect
        
        Returns:
            TranscriptionResult with text and metadata
        """
        if self.provider == TranscriptionProvider.MOCK:
            return await self._transcribe_mock(audio_data, filename, language)
        elif self.provider == TranscriptionProvider.OPENAI_WHISPER:
            return await self._transcribe_openai(audio_data, filename, language)
        else:
            return await self._transcribe_docker(audio_data, filename, language)
    
    async def _transcribe_docker(
        self,
        audio_data: bytes,
        filename: str,
        language: TranscriptionLanguage,
    ) -> TranscriptionResult:
        """Transcribe using external Whisper Docker service"""
        logger.info(f"Transcribing via Whisper Docker service: {filename} ({len(audio_data)} bytes)")
        
        try:
            # Prepare multipart form data
            files = {
                "file": (filename, audio_data, "application/octet-stream")
            }
            params = {
                "language": language.value
            }
            
            async with httpx.AsyncClient(timeout=WHISPER_TIMEOUT) as client:
                response = await client.post(
                    f"{self.whisper_url}/transcribe",
                    files=files,
                    params=params,
                )
                
                if response.status_code != 200:
                    error_detail = response.json().get("detail", "Unknown error")
                    raise RuntimeError(f"Whisper service error: {error_detail}")
                
                data = response.json()
                
                # Convert response to TranscriptionResult
                segments = [
                    {
                        "start": seg.get("start", 0),
                        "end": seg.get("end", 0),
                        "text": seg.get("text", ""),
                    }
                    for seg in data.get("segments", [])
                ]
                
                return TranscriptionResult(
                    text=data.get("text", ""),
                    language=data.get("language", language.value),
                    duration_seconds=data.get("duration_seconds", 0.0),
                    segments=segments,
                    confidence=data.get("confidence", 0.85),
                    provider=TranscriptionProvider.DOCKER_WHISPER,
                    transcribed_at=datetime.fromisoformat(
                        data.get("transcribed_at", datetime.utcnow().isoformat())
                    ),
                )
                
        except httpx.TimeoutException:
            logger.error("Whisper service timeout")
            raise RuntimeError("Transcription timed out. The audio may be too long.")
        except httpx.ConnectError:
            logger.error(f"Cannot connect to Whisper service at {self.whisper_url}")
            raise RuntimeError("Whisper service unavailable. Please try again later.")
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            raise RuntimeError(f"Transcription failed: {str(e)}")
    
    async def _transcribe_openai(
        self,
        audio_data: bytes,
        filename: str,
        language: TranscriptionLanguage,
    ) -> TranscriptionResult:
        """Transcribe using OpenAI Whisper API"""
        client = self._get_openai_client()
        if client is None:
            raise RuntimeError("OpenAI client not available. Set OPENAI_API_KEY.")
        
        # Write to temp file
        ext = os.path.splitext(filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name
        
        try:
            lang = None if language == TranscriptionLanguage.AUTO else language.value
            
            with open(tmp_path, "rb") as audio_file:
                # Use verbose_json for segments
                response = await client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=lang,
                    response_format="verbose_json",
                )
            
            segments = [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text,
                }
                for seg in getattr(response, "segments", [])
            ]
            
            duration = getattr(response, "duration", 0.0)
            
            return TranscriptionResult(
                text=response.text.strip(),
                language=getattr(response, "language", language.value),
                duration_seconds=duration,
                segments=segments,
                confidence=0.90,  # OpenAI generally high quality
                provider=TranscriptionProvider.OPENAI_WHISPER,
                transcribed_at=datetime.now(),
            )
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    async def _transcribe_mock(
        self,
        audio_data: bytes,
        filename: str,
        language: TranscriptionLanguage,
    ) -> TranscriptionResult:
        """Mock transcription for testing"""
        return TranscriptionResult(
            text="Esta é uma transcrição de teste para desenvolvimento. "
                 "O sistema gravou um áudio de reunião discutindo oportunidades "
                 "de projetos de P&D na área de inteligência artificial.",
            language=language.value if language != TranscriptionLanguage.AUTO else "pt",
            duration_seconds=30.0,
            segments=[
                {"start": 0.0, "end": 10.0, "text": "Esta é uma transcrição de teste para desenvolvimento."},
                {"start": 10.0, "end": 20.0, "text": "O sistema gravou um áudio de reunião."},
                {"start": 20.0, "end": 30.0, "text": "Discussão sobre projetos de P&D em IA."},
            ],
            confidence=0.95,
            provider=TranscriptionProvider.MOCK,
            transcribed_at=datetime.now(),
        )


class TranscriptionReportGenerator:
    """
    Generates reports from transcriptions using LLM and report templates.
    """
    
    def __init__(
        self,
        tenant_id: str,
        openai_api_key: Optional[str] = None,
    ):
        self.tenant_id = tenant_id
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self._openai_client = None
    
    def _get_openai_client(self):
        """Lazy load OpenAI client"""
        if self._openai_client is None and OPENAI_AVAILABLE and self.openai_api_key:
            self._openai_client = AsyncOpenAI(api_key=self.openai_api_key)
        return self._openai_client
    
    async def generate_report_from_transcription(
        self,
        transcription: TranscriptionResult,
        template_id: str,
        additional_context: Optional[str] = None,
        output_format: str = "html",
    ) -> Dict[str, Any]:
        """
        Generate a structured report from transcription using LLM.
        
        Args:
            transcription: The transcription result
            template_id: Report template to use
            additional_context: Optional extra context for the report
            output_format: html, pdf, docx, json
        
        Returns:
            Dict with report content and metadata
        """
        from services.report_service import REPORT_TEMPLATES, ReportGenerator
        
        template = REPORT_TEMPLATES.get(template_id)
        if not template:
            raise ValueError(f"Template not found: {template_id}")
        
        # Generate structured data from transcription using LLM
        structured_data = await self._extract_report_data(
            transcription=transcription,
            template=template,
            additional_context=additional_context,
        )
        
        # Use ReportGenerator to create final output
        generator = ReportGenerator(self.tenant_id)
        report = await generator.generate(
            template_id=template_id,
            data=structured_data,
            format=None,  # Use template default
        )
        
        # Add transcription metadata
        report["transcription_source"] = {
            "duration_seconds": transcription.duration_seconds,
            "language": transcription.language,
            "confidence": transcription.confidence,
            "provider": transcription.provider,
            "transcribed_at": transcription.transcribed_at.isoformat(),
        }
        
        return report
    
    async def _extract_report_data(
        self,
        transcription: TranscriptionResult,
        template,
        additional_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Use LLM to extract structured report data from transcription.
        """
        client = self._get_openai_client()
        
        # Build section extraction prompt
        sections_description = "\n".join([
            f"- {section}: Extract relevant information for this section"
            for section in template.sections
        ])
        
        system_prompt = f"""You are a professional report writer. Your task is to extract 
structured information from a meeting transcription and organize it into a report format.

Report Type: {template.name}
Description: {template.description}

Required Sections:
{sections_description}

For each section, extract relevant quotes, key points, action items, and decisions.
If a section has no relevant content in the transcription, provide a brief note.

Respond in JSON format with section IDs as keys.
Always respond in the same language as the transcription.
"""
        
        user_prompt = f"""Transcription:
{transcription.text}

{f"Additional Context: {additional_context}" if additional_context else ""}

Extract the structured report data for each section."""
        
        if client:
            try:
                response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.3,
                )
                
                import json
                return json.loads(response.choices[0].message.content)
            except Exception as e:
                logger.error(f"LLM extraction failed: {e}")
        
        # Fallback: Create basic structure from transcription
        return self._fallback_extraction(transcription, template)
    
    def _fallback_extraction(
        self,
        transcription: TranscriptionResult,
        template,
    ) -> Dict[str, Any]:
        """Fallback extraction without LLM"""
        data = {}
        
        # Put full transcription in first content section
        content_sections = [s for s in template.sections if s != "header"]
        
        if "executive_summary" in template.sections:
            # Truncate for summary
            summary = transcription.text[:500]
            if len(transcription.text) > 500:
                summary += "..."
            data["executive_summary"] = {
                "summary": summary,
                "source": "audio_transcription",
            }
        
        # Add header info
        if "header" in template.sections:
            data["header"] = {
                "title": f"Relatório de Transcrição - {template.name}",
                "date": datetime.now().strftime("%d/%m/%Y"),
                "duration": f"{transcription.duration_seconds:.1f} segundos",
                "language": transcription.language,
            }
        
        # Add transcription to first available content section
        if content_sections:
            first_section = content_sections[0]
            if first_section not in data:
                data[first_section] = {}
            data[first_section]["transcription"] = transcription.text
            data[first_section]["segments"] = transcription.segments[:10]  # First 10 segments
        
        return data


# =============================================================================
# Factory Functions
# =============================================================================

def get_transcription_service(
    provider: Optional[str] = None,
) -> TranscriptionService:
    """Factory function to create transcription service"""
    # Determine provider - Docker Whisper is the default
    if provider:
        prov = TranscriptionProvider(provider)
    elif os.getenv("WHISPER_SERVICE_URL"):
        prov = TranscriptionProvider.DOCKER_WHISPER
    elif os.getenv("OPENAI_API_KEY"):
        prov = TranscriptionProvider.OPENAI_WHISPER
    else:
        # Default to Docker Whisper (internal Docker network)
        prov = TranscriptionProvider.DOCKER_WHISPER
    
    return TranscriptionService(provider=prov)


def get_transcription_report_generator(tenant_id: str) -> TranscriptionReportGenerator:
    """Factory function for transcription report generator"""
    return TranscriptionReportGenerator(tenant_id=tenant_id)
