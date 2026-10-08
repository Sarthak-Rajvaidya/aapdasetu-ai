"""
Retrieval layer for the AapdaSetu AI Assistant.

Architecture note (see README "AI/RAG Architecture" for the full picture):

    User question -> query processing -> embedding -> vector search
    -> relevant documents -> context assembly -> LLM -> grounded answer

For this deployment, the embedding + vector search step is implemented
with scikit-learn's TF-IDF vectorizer and cosine similarity. This is a
genuine, working retrieval mechanism that needs no external network call
and no downloaded model, which matters for offline development and for
environments where installing large embedding models isn't practical.

To upgrade to dense embeddings without touching any calling code:
    1. Replace `_build_index` to encode documents with, e.g.,
       `sentence-transformers` ("all-MiniLM-L6-v2") instead of TF-IDF.
    2. Persist vectors in ChromaDB or FAISS instead of the in-memory
       sklearn matrix.
    3. Keep `retrieve(query, k)` returning the same
       `List[RetrievedChunk]` shape.
This module is intentionally isolated so that swap is localized here.
"""
from dataclasses import dataclass
from typing import List

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.rag.ingest import KBDocument, load_documents


@dataclass
class RetrievedChunk:
    title: str
    disaster_type: str
    text: str
    score: float


class Retriever:
    def __init__(self):
        self.documents: List[KBDocument] = []
        self.vectorizer: TfidfVectorizer | None = None
        self.matrix = None
        self.reload()

    def reload(self):
        self.documents = load_documents()
        if not self.documents:
            self.vectorizer = None
            self.matrix = None
            return
        corpus = [d.text for d in self.documents]
        self.vectorizer = TfidfVectorizer(stop_words="english", max_features=4096)
        self.matrix = self.vectorizer.fit_transform(corpus)

    def retrieve(self, query: str, k: int = 3, disaster_hint: str | None = None) -> List[RetrievedChunk]:
        if not self.documents or self.vectorizer is None:
            return []

        query_vec = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self.matrix)[0]

        ranked = sorted(
            zip(self.documents, scores), key=lambda pair: pair[1], reverse=True
        )

        # Light re-ranking: if we know the user's disaster context (e.g. from
        # their weakest simulation), nudge matching documents up slightly.
        if disaster_hint:
            hint = disaster_hint.lower()
            ranked = sorted(
                ranked,
                key=lambda pair: (
                    pair[1] + (0.15 if pair[0].disaster_type.lower() == hint else 0.0)
                ),
                reverse=True,
            )

        results = [
            RetrievedChunk(title=doc.title, disaster_type=doc.disaster_type, text=doc.text, score=float(score))
            for doc, score in ranked[:k]
            if score > 0.02
        ]
        return results


# Single shared instance for the process (documents are small; reload() can
# be called again if the knowledge base changes at runtime).
retriever = Retriever()
