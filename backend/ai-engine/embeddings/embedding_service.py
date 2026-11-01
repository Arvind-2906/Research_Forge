"""ResearchForge AI Engine - Embedding Service.

Provides text embeddings using BAAI/bge-small-en-v1.5 with strict 384-dimension vectors.
Supports Hugging Face Inference API with automatic fallback to local FastEmbed ONNX
and a deterministic unit-length fallback.
"""

import math
import hashlib
import numpy as np
from typing import List, Optional
import httpx

from config.settings import get_settings
from utils.logger import logger


class EmbeddingServiceError(Exception):
    """Raised when embedding generation fails."""
    pass


class EmbeddingService:
    """Embedding service strictly using BAAI/bge-small-en-v1.5 (dimension: 384)."""

    def __init__(self):
        self.settings = get_settings()
        self.dimension = self.settings.EMBEDDING_DIMENSION  # 384
        self.model_name = self.settings.EMBEDDING_MODEL      # BAAI/bge-small-en-v1.5
        self.batch_size = self.settings.EMBEDDING_BATCH_SIZE
        self._local_model = None

    def _get_local_model(self):
        """Lazy-loads local FastEmbed ONNX model."""
        if self._local_model is None:
            try:
                from fastembed import TextEmbedding
                logger.info(f"[Embedding Service] Initializing local FastEmbed model: {self.model_name}")
                self._local_model = TextEmbedding(model_name=self.model_name)
            except Exception as e:
                logger.warning(f"[Embedding Service] FastEmbed initialization warning: {e}")
                self._local_model = None
        return self._local_model

    def _fallback_deterministic_embed(self, text: str) -> List[float]:
        """Deterministic 384-d L2-normalized pseudo-embedding fallback for extreme offline conditions."""
        vec = [0.0] * self.dimension
        # Hash sliding n-grams and tokens into the 384 dimensions
        tokens = text.lower().split()
        if not tokens:
            tokens = ["empty"]
        for i, token in enumerate(tokens):
            h = int(hashlib.sha256(f"{i}_{token}".encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            val = ((h >> 16) % 2000 - 1000) / 1000.0
            vec[idx] += val

        # Normalize to unit vector
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        else:
            vec[0] = 1.0
        return vec

    async def _embed_via_hf_api(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Attempts embedding via Hugging Face Inference API."""
        token = self.settings.hf_api_token
        if not token:
            return None

        # Hugging Face feature extraction endpoint
        url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model_name}"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json={"inputs": texts, "options": {"wait_for_model": True}},
                )
                if response.status_code == 200:
                    data = response.json()
                    # Validate dimension
                    if isinstance(data, list) and len(data) == len(texts):
                        validated: List[List[float]] = []
                        for item in data:
                            if isinstance(item, list) and len(item) == self.dimension:
                                # Ensure L2 normalization
                                arr = np.array(item, dtype=np.float32)
                                norm = np.linalg.norm(arr)
                                if norm > 0:
                                    arr = arr / norm
                                validated.append(arr.tolist())
                            else:
                                return None
                        return validated
        except Exception as e:
            logger.debug(f"[Embedding Service] Remote HF Inference API attempt failed: {e}")
        return None

    def _embed_via_local_fastembed(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Generates embeddings using local FastEmbed ONNX."""
        try:
            model = self._get_local_model()
            if model is not None:
                embeddings_gen = model.embed(texts, batch_size=self.batch_size)
                results: List[List[float]] = []
                for emb in embeddings_gen:
                    arr = np.array(emb, dtype=np.float32)
                    norm = np.linalg.norm(arr)
                    if norm > 0:
                        arr = arr / norm
                    results.append(arr.tolist())
                if len(results) == len(texts):
                    return results
        except Exception as e:
            logger.warning(f"[Embedding Service] Local FastEmbed failed: {e}")
        return None

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embeds a list of document strings, returning a list of 384-dimensional float vectors."""
        if not texts:
            return []

        all_embeddings: List[List[float]] = []

        # Process in batches
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i : i + self.batch_size]

            # 1. Try remote Hugging Face API
            batch_result = await self._embed_via_hf_api(batch)

            # 2. Try local FastEmbed ONNX fallback
            if batch_result is None:
                batch_result = self._embed_via_local_fastembed(batch)

            # 3. Deterministic normalized fallback
            if batch_result is None:
                logger.info("[Embedding Service] Utilizing deterministic normalized 384-d fallback")
                batch_result = [self._fallback_deterministic_embed(t) for t in batch]

            all_embeddings.extend(batch_result)

        # Final invariant check: dimensions must strictly match pgvector 384 requirement
        for emb in all_embeddings:
            if len(emb) != self.dimension:
                raise EmbeddingServiceError(
                    f"Generated embedding dimension {len(emb)} does not match required {self.dimension} dimensions"
                )

        return all_embeddings

    async def embed_query(self, text: str) -> List[float]:
        """Embeds a single query string, returning a 384-dimensional float vector."""
        results = await self.embed_documents([text])
        if not results:
            raise EmbeddingServiceError("Failed to generate embedding for query")
        return results[0]

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Computes cosine similarity between two unit vectors."""
        arr_a = np.array(vec_a, dtype=np.float32)
        arr_b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(arr_a)
        norm_b = np.linalg.norm(arr_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(arr_a, arr_b) / (norm_a * norm_b))


# Global embedding service instance
embedding_service = EmbeddingService()
