"""ResearchForge Embedding Service.

Provides vector embeddings using Hugging Face models (BAAI/bge-small-en-v1.5).
"""


class EmbeddingService:
    """Handles text embedding generation for research document ingestion and retrieval."""

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        self.model_name = model_name

    async def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generates embedding vectors for a list of input strings."""
        raise NotImplementedError("Embeddings will be configured during RAG pipeline implementation.")

