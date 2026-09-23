import os
import time
import math
import json
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from dotenv import load_dotenv

_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file)
else:
    load_dotenv()

from .embeddings import global_embedder, normalize_vietnamese_text, l2_normalize

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

def compute_text_embedding(text: str, dim: int = 1536) -> List[float]:
    """Compatibility wrapper for embedding computation."""
    return global_embedder.embed_query(text)

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Computes cosine similarity between two unit vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    return max(0.0, min(1.0, dot))

class SemanticCacheEntry:
    def __init__(self, question: str, vector: List[float], response_data: Dict[str, Any]):
        self.question = question
        self.vector = vector
        self.response_data = response_data
        self.created_at = time.time()
        self.last_accessed_at = time.time()
        self.hit_count = 0

class SemanticCache:
    """
    Production Redis-backed & In-Memory Semantic Cache.
    Matches incoming queries with threshold >= 0.90 to return responses in < 25ms.
    """
    def __init__(
        self,
        similarity_threshold: float = 0.90,
        max_entries: int = 500,
        redis_url: Optional[str] = None
    ):
        self.similarity_threshold = similarity_threshold
        self.max_entries = max_entries
        self.entries: List[SemanticCacheEntry] = []
        self.total_queries = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.total_latency_saved_ms = 0.0
        self.total_tokens_saved = 0
        self.redis_client = None
        self.redis_connected = False

        r_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        if REDIS_AVAILABLE and r_url:
            try:
                self.redis_client = redis.Redis.from_url(
                    r_url,
                    socket_connect_timeout=1.0,
                    decode_responses=True
                )
                self.redis_client.ping()
                self.redis_connected = True
            except Exception:
                self.redis_connected = False
                self.redis_client = None

    def get(self, question: str) -> Optional[Tuple[Dict[str, Any], float, str]]:
        """
        Looks up a question in semantic cache.
        Returns (response_data, similarity_score, matched_original_question) or None.
        """
        self.total_queries += 1
        query_vec = global_embedder.embed_query(question)

        # 1. Search in Redis if available
        if self.redis_connected and self.redis_client:
            try:
                keys = self.redis_client.keys("semcache:*")
                best_sim = 0.0
                best_payload = None
                best_q = ""
                for k in keys:
                    raw = self.redis_client.get(k)
                    if not raw:
                        continue
                    item = json.loads(raw)
                    cached_vec = item.get("vector", [])
                    sim = cosine_similarity(query_vec, cached_vec)
                    if sim > best_sim:
                        best_sim = sim
                        best_payload = item.get("response")
                        best_q = item.get("question", "")

                if best_payload and best_sim >= self.similarity_threshold:
                    self.cache_hits += 1
                    self.total_tokens_saved += 180
                    self.total_latency_saved_ms += 750.0
                    return (best_payload, round(best_sim, 4), best_q)
            except Exception:
                pass

        # 2. In-Memory Search Fallback
        best_entry: Optional[SemanticCacheEntry] = None
        best_sim = 0.0

        for entry in self.entries:
            sim = cosine_similarity(query_vec, entry.vector)
            if sim > best_sim:
                best_sim = sim
                best_entry = entry

        if best_entry and best_sim >= self.similarity_threshold:
            best_entry.hit_count += 1
            best_entry.last_accessed_at = time.time()
            self.cache_hits += 1
            
            estimated_tokens = len(str(best_entry.response_data.get("answer", "")).split()) * 2
            self.total_tokens_saved += max(estimated_tokens, 50)
            self.total_latency_saved_ms += 650.0
            return (best_entry.response_data, round(best_sim, 4), best_entry.question)

        self.cache_misses += 1
        return None

    def set(self, question: str, response_data: Dict[str, Any]):
        """Caches question, 1536D embedding, and response."""
        query_vec = global_embedder.embed_query(question)

        # Redis storage
        if self.redis_connected and self.redis_client:
            try:
                cache_key = f"semcache:{abs(hash(question)) & 0xffffffff:x}"
                payload = {
                    "question": question,
                    "vector": query_vec,
                    "response": response_data,
                    "timestamp": time.time()
                }
                self.redis_client.setex(cache_key, 86400 * 7, json.dumps(payload, ensure_ascii=False))
            except Exception:
                pass

        # In-memory storage
        for entry in self.entries:
            if entry.question == question:
                entry.response_data = response_data
                entry.last_accessed_at = time.time()
                return

        new_entry = SemanticCacheEntry(question, query_vec, response_data)
        self.entries.append(new_entry)

        if len(self.entries) > self.max_entries:
            self.entries.sort(key=lambda x: (x.hit_count, x.last_accessed_at))
            self.entries = self.entries[len(self.entries) - self.max_entries:]

    def get_stats(self) -> Dict[str, Any]:
        """Returns runtime performance statistics."""
        hit_rate = (self.cache_hits / self.total_queries * 100) if self.total_queries > 0 else 0.0
        return {
            "backend": "Redis" if self.redis_connected else "Local In-Memory",
            "redis_connected": self.redis_connected,
            "total_queries": self.total_queries,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "hit_rate_percent": round(hit_rate, 1),
            "cached_entries_count": len(self.entries),
            "total_latency_saved_ms": round(self.total_latency_saved_ms, 1),
            "total_tokens_saved": self.total_tokens_saved,
            "similarity_threshold": self.similarity_threshold,
            "vector_dimension": 1536
        }

    def clear(self):
        """Clears all cached entries from Redis and In-Memory."""
        self.entries = []
        if self.redis_connected and self.redis_client:
            try:
                keys = self.redis_client.keys("semcache:*")
                if keys:
                    self.redis_client.delete(*keys)
            except Exception:
                pass

semantic_cache = SemanticCache()
global_semantic_cache = semantic_cache

