"""AI helper routes (translations, helpers)
"""
import os
import logging
from typing import List, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.ai.chatbot_service import get_llm_from_config, DEFAULT_LLM_PROVIDER, DEFAULT_OPENAI_API_KEY, DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])


class TranslateRequest(BaseModel):
    text: str = Field(..., description="Source text to translate")
    from_locale: str = Field(default="pt-BR", description="Source locale")
    targets: List[str] = Field(..., description="Target locales, e.g. ['en-US','es-ES']")


class TranslateResponse(BaseModel):
    translations: Dict[str, str]


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(req: TranslateRequest):
    """Translate text using configured LLM. Returns a mapping of locale->translation.

    If LLM is not configured or unavailable, returns the original text as fallback for each target.
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    # Build a deterministic prompt that asks the LLM to return strict JSON
    targets = req.targets
    target_list = ", ".join(targets)
    prompt = (
        f"Translate the following text from {req.from_locale} to {target_list}. "
        "Respond ONLY with a JSON object mapping locale codes to the translated text, for example: {\"en-US\": \"Hello\", \"es-ES\": \"Hola\"}.\n"
        f"Text:\n\"{text}\"\n"
    )

    # First try an offline translator (Argos Translate) if available.
    try:
        import argostranslate.translate as at_translate
        installed = at_translate.get_installed_languages()
        result = {}
        for target in targets:
            # map locale codes like 'en-US' -> 'en', 'pt-BR' -> 'pt', 'es-ES' -> 'es'
            tgt_code = target.split('-')[0]
            src_code = req.from_locale.split('-')[0]
            try:
                # find source and target language objects
                src_lang = next((l for l in installed if l.code.startswith(src_code)), None)
                tgt_lang = next((l for l in installed if l.code.startswith(tgt_code)), None)
                if src_lang and tgt_lang:
                    translation_obj = src_lang.get_translation(tgt_lang)
                    translated = translation_obj.translate(text)
                    result[target] = translated
                else:
                    # Model not installed for this language pair
                    result[target] = text
            except Exception as e:
                logger.warning(f"Argos translate error for {src_code}->{tgt_code}: {e}")
                result[target] = text
        return TranslateResponse(translations=result)
    except ImportError:
        logger.info("Argos Translate not installed; falling back to LLM or echo")
    except Exception as e:
        logger.warning(f"Argos Translate failed: {e}; falling back to LLM/echo")

    # If Argos isn't available, try configured LLM as before.
    provider = os.getenv('LLM_PROVIDER', DEFAULT_LLM_PROVIDER)
    api_key = os.getenv('OPENAI_API_KEY', DEFAULT_OPENAI_API_KEY)
    model_name = os.getenv('LLM_MODEL', DEFAULT_OLLAMA_MODEL)
    api_base = os.getenv('OLLAMA_BASE_URL', DEFAULT_OLLAMA_BASE_URL)

    try:
        llm = get_llm_from_config(provider=provider, model_name=model_name, api_key=api_key, api_base_url=api_base)
        # Use async invocation if available
        try:
            resp = await llm.ainvoke(prompt)
        except AttributeError:
            resp = llm.invoke(prompt)

        # Attempt to parse JSON from the response
        import json
        text_resp = resp if isinstance(resp, str) else str(resp)
        try:
            parsed = json.loads(text_resp)
            result = {k: parsed.get(k, text) for k in targets}
            return TranslateResponse(translations=result)
        except Exception:
            logger.warning("LLM returned non-JSON response for translation; falling back to echo")
    except Exception as e:
        logger.warning(f"LLM translation failed or not configured: {e}")

    # Final fallback: return the original text for each target
    return TranslateResponse(translations={t: text for t in targets})
