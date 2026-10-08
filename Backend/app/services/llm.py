"""
Thin wrapper around the configured LLM provider. Keeping this isolated
means api/ai.py doesn't need to know whether Gemini, another provider, or
no provider at all is active.
"""
from typing import Optional

from app.core.config import settings

_gemini_model = None
_gemini_init_attempted = False


def _init_gemini():
    global _gemini_model, _gemini_init_attempted
    if _gemini_init_attempted:
        return
    _gemini_init_attempted = True
    if settings.LLM_PROVIDER != "gemini" or not settings.GEMINI_API_KEY:
        return
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
    except Exception as exc:  # pragma: no cover - defensive, depends on network/creds
        print(f"[llm] Gemini initialization failed: {exc}")
        _gemini_model = None


def is_llm_available() -> bool:
    _init_gemini()
    return _gemini_model is not None


def generate(prompt: str) -> Optional[str]:
    """Returns the generated text, or None if no provider is available/it failed."""
    _init_gemini()
    if _gemini_model is None:
        return None
    try:
        response = _gemini_model.generate_content(prompt)
        return getattr(response, "text", None)
    except Exception as exc:  # pragma: no cover - network/quota dependent
        print(f"[llm] Gemini generation failed: {exc}")
        return None
