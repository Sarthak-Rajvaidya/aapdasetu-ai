"""
Embeddings provider abstraction.

Current implementation: TF-IDF (see retriever.py), computed on the fly with
scikit-learn — no model download, no network call required.

Production upgrade path (kept isolated here so it's a one-file change):

    from sentence_transformers import SentenceTransformer
    _model = SentenceTransformer("all-MiniLM-L6-v2")

    def embed(texts: list[str]) -> list[list[float]]:
        return _model.encode(texts, normalize_embeddings=True).tolist()

Then in retriever.py, swap `TfidfVectorizer` + `cosine_similarity` for a
ChromaDB or FAISS collection built from `embed()` output. The rest of the
RAG pipeline (prompt.py, api/ai.py) is unaffected because it only depends
on `Retriever.retrieve()` returning `RetrievedChunk` objects.
"""
