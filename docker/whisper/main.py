"""
Whisper Transcription Service API
Standalone FastAPI service for audio/video transcription using OpenAI Whisper.

This service runs in its own Docker container and exposes a REST API
for the ProspecAI backend to call.
"""
import os
import tempfile
import logging
from typing import Optional
from datetime import datetime
from enum import Enum

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import whisper

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Whisper Transcription Service",
    description="Audio/Video transcription API using OpenAI Whisper",
    version="1.0.0",
)

# CORS middleware for internal Docker network
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")  # tiny, base, small, medium, large
MODEL_CACHE_DIR = os.getenv("WHISPER_MODEL_CACHE", "/app/models")

# Global model instance (lazy loaded)
_whisper_model = None


class TranscriptionLanguage(str, Enum):
    """Supported transcription languages"""
    AUTO = "auto"
    PORTUGUESE = "pt"
    ENGLISH = "en"
    SPANISH = "es"


class TranscriptionSegment(BaseModel):
    """A segment of transcribed text with timing"""
    start: float
    end: float
    text: str


class TranscriptionResponse(BaseModel):
    """Response from transcription endpoint"""
    text: str
    language: str
    duration_seconds: float
    confidence: float
    segments: list[TranscriptionSegment]
    model_size: str
    transcribed_at: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    model_size: str
    version: str


def get_whisper_model():
    """Lazy load the Whisper model"""
    global _whisper_model
    if _whisper_model is None:
        logger.info(f"Loading Whisper model: {MODEL_SIZE}")
        os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
        _whisper_model = whisper.load_model(MODEL_SIZE, download_root=MODEL_CACHE_DIR)
        logger.info(f"Whisper model {MODEL_SIZE} loaded successfully")
    return _whisper_model


@app.on_event("startup")
async def startup_event():
    """Pre-load the model on startup for faster first request"""
    logger.info("Whisper service starting up...")
    try:
        get_whisper_model()
        logger.info("Whisper model pre-loaded successfully")
    except Exception as e:
        logger.error(f"Failed to pre-load Whisper model: {e}")
        # Don't fail startup - model will be loaded on first request


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=_whisper_model is not None,
        model_size=MODEL_SIZE,
        version="1.0.0",
    )


@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "Whisper Transcription Service",
        "version": "1.0.0",
        "model_size": MODEL_SIZE,
        "endpoints": {
            "health": "/health",
            "transcribe": "/transcribe",
        }
    }


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio or video file to transcribe"),
    language: TranscriptionLanguage = Query(
        TranscriptionLanguage.AUTO,
        description="Language for transcription (auto-detect if not specified)"
    ),
):
    """
    Transcribe audio or video file using Whisper.
    
    Supported formats: mp3, wav, webm, mp4, ogg, flac, m4a
    Maximum file size: 50MB
    
    Returns transcription text with timing segments.
    """
    # Validate file size (50MB limit)
    content = await file.read()
    max_size = 50 * 1024 * 1024  # 50MB
    
    if len(content) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
        )
    
    # Validate file type
    allowed_extensions = {".mp3", ".wav", ".webm", ".mp4", ".ogg", ".flac", ".m4a"}
    file_ext = os.path.splitext(file.filename or ".webm")[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save to temporary file
    try:
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        logger.info(f"Transcribing file: {file.filename} ({len(content)} bytes)")
        
        # Get model
        model = get_whisper_model()
        
        # Prepare transcription options
        options = {}
        if language != TranscriptionLanguage.AUTO:
            options["language"] = language.value
        
        # Run transcription
        result = model.transcribe(tmp_path, **options)
        
        # Extract segments
        segments = [
            TranscriptionSegment(
                start=seg["start"],
                end=seg["end"],
                text=seg["text"].strip(),
            )
            for seg in result.get("segments", [])
        ]
        
        # Calculate duration from last segment
        duration = segments[-1].end if segments else 0.0
        
        # Calculate average confidence (using avg_logprob as proxy)
        avg_logprob = 0.0
        if segments:
            logprobs = [
                seg.get("avg_logprob", -0.5)
                for seg in result.get("segments", [])
            ]
            avg_logprob = sum(logprobs) / len(logprobs) if logprobs else -0.5
        
        # Convert logprob to confidence (rough approximation)
        # logprob ranges from ~-1.0 (low conf) to ~0 (high conf)
        confidence = min(1.0, max(0.0, 1.0 + avg_logprob))
        
        logger.info(f"Transcription complete: {len(result['text'])} chars, {len(segments)} segments")
        
        return TranscriptionResponse(
            text=result["text"].strip(),
            language=result.get("language", language.value),
            duration_seconds=duration,
            confidence=confidence,
            segments=segments,
            model_size=MODEL_SIZE,
            transcribed_at=datetime.utcnow().isoformat(),
        )
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )
    finally:
        # Clean up temp file
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/models")
async def list_available_models():
    """List available Whisper model sizes"""
    return {
        "current_model": MODEL_SIZE,
        "available_models": [
            {"size": "tiny", "parameters": "39M", "vram": "~1GB", "relative_speed": "~32x"},
            {"size": "base", "parameters": "74M", "vram": "~1GB", "relative_speed": "~16x"},
            {"size": "small", "parameters": "244M", "vram": "~2GB", "relative_speed": "~6x"},
            {"size": "medium", "parameters": "769M", "vram": "~5GB", "relative_speed": "~2x"},
            {"size": "large", "parameters": "1550M", "vram": "~10GB", "relative_speed": "1x"},
        ],
        "note": "Set WHISPER_MODEL_SIZE environment variable to change model"
    }
