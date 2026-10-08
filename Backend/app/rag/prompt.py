"""
Builds the grounded prompt sent to the LLM, and provides an offline
extractive fallback for when no LLM provider/key is configured. The
fallback is not a gimmick — it guarantees the assistant always answers
from the retrieved documents, and it is clearly labelled as such in the
API response (`provider: "extractive-fallback"`) so the frontend never
claims Gemini generated something it didn't.
"""
from typing import List, Optional

from app.rag.retriever import RetrievedChunk

SYSTEM_INSTRUCTIONS = """You are the AapdaSetu AI Assistant, a disaster-preparedness
education assistant. Answer ONLY using the CONTEXT provided below, which comes from
the platform's disaster-safety knowledge base. If the context does not contain the
answer, say you don't have grounded information on that specific point and suggest a
related topic you can help with instead of inventing procedures.

Rules:
- Never invent emergency procedures that are not supported by the context.
- Clearly distinguish general educational guidance from emergency dispatch — you are
  not a substitute for local emergency services.
- Keep answers concise, practical, and structured (short paragraphs or bullet points).
- If user learning-progress context is provided, you may reference it briefly to
  personalize the recommendation, but never invent mistakes the user did not make.
"""


def build_prompt(question: str, chunks: List[RetrievedChunk], user_context: Optional[str] = None) -> str:
    context_block = "\n\n".join(
        f"[Source: {c.title} | {c.disaster_type}]\n{c.text}" for c in chunks
    ) or "(no relevant documents found)"

    personalization = f"\n\nUSER LEARNING CONTEXT:\n{user_context}" if user_context else ""

    return (
        f"{SYSTEM_INSTRUCTIONS}\n\n"
        f"CONTEXT:\n{context_block}{personalization}\n\n"
        f"USER QUESTION:\n{question}\n\n"
        f"ANSWER:"
    )


def extractive_fallback_answer(question: str, chunks: List[RetrievedChunk]) -> str:
    """
    Used when no LLM provider is configured (no GEMINI_API_KEY, or the call
    fails). Returns a clearly-labelled, grounded summary built directly from
    the retrieved documents instead of pretending an LLM produced it.
    """
    if not chunks:
        return (
            "I couldn't find grounded information on that in the current knowledge "
            "base. Try asking about emergency kits, or earthquake, flood, wildfire, "
            "tornado, or cyclone safety."
        )

    lines = [
        "Here's what the knowledge base has on this (assistant is running in "
        "offline retrieval mode — no LLM key is configured, so this is a direct "
        "summary of the most relevant guidance rather than a generated answer):",
        "",
    ]
    for chunk in chunks:
        # Take the first few non-empty lines of the doc as a compact summary.
        snippet_lines = [ln.strip() for ln in chunk.text.splitlines() if ln.strip()][:4]
        lines.append(f"**{chunk.title}**")
        for ln in snippet_lines:
            lines.append(f"- {ln.lstrip('#').strip()}")
        lines.append("")
    return "\n".join(lines).strip()
