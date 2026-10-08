"""
Loads the markdown knowledge-base documents under app/rag/documents/**
into a simple in-memory list of {id, title, disaster_type, text}.

This intentionally has no external dependency (no network, no downloaded
embedding model) so it runs anywhere, including offline dev boxes and CI.
See retriever.py for how this feeds a TF-IDF vector index, and the module
docstring there for how to swap in a real embedding model + vector DB
(sentence-transformers + ChromaDB/FAISS) for production without changing
any calling code.
"""
from dataclasses import dataclass
from pathlib import Path
from typing import List

DOCS_DIR = Path(__file__).resolve().parent / "documents"


@dataclass
class KBDocument:
    id: str
    title: str
    disaster_type: str
    text: str


def _parse_frontmatter(raw: str):
    """Very small YAML-ish frontmatter parser for `--- key: value ---` blocks."""
    title, disaster_type = "Untitled", "general"
    body = raw
    if raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) >= 3:
            meta_block, body = parts[1], parts[2]
            for line in meta_block.strip().splitlines():
                if ":" in line:
                    key, _, value = line.partition(":")
                    key, value = key.strip(), value.strip()
                    if key == "title":
                        title = value
                    elif key == "disaster_type":
                        disaster_type = value
    return title, disaster_type, body.strip()


def load_documents() -> List[KBDocument]:
    docs: List[KBDocument] = []
    if not DOCS_DIR.exists():
        return docs
    for md_file in sorted(DOCS_DIR.rglob("*.md")):
        raw = md_file.read_text(encoding="utf-8")
        title, disaster_type, body = _parse_frontmatter(raw)
        docs.append(
            KBDocument(
                id=str(md_file.relative_to(DOCS_DIR)),
                title=title,
                disaster_type=disaster_type,
                text=body,
            )
        )
    return docs
