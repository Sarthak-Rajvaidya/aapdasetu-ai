"""
Vector store abstraction.

Current implementation: an in-memory scikit-learn TF-IDF matrix, rebuilt at
process start in `retriever.Retriever.reload()`. This is fully functional
and requires no external service, which keeps local setup and grading
environments simple.

Production upgrade path:

    import chromadb
    client = chromadb.PersistentClient(path="./chroma_store")
    collection = client.get_or_create_collection("aapdasetu_kb")
    collection.add(ids=[...], embeddings=[...], documents=[...], metadatas=[...])
    results = collection.query(query_embeddings=[...], n_results=k)

Swapping this in only requires changing `Retriever.reload()` and
`Retriever.retrieve()` in retriever.py; nothing else in the app depends on
the storage mechanism.
"""
