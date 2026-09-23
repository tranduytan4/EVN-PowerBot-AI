import asyncio
import sys
import os
from pathlib import Path

# Ensure langgraph_lab root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.semantic_cache import (
    SemanticCache,
    compute_text_embedding,
    cosine_similarity,
    normalize_vietnamese_text
)
from app.db_pgvector import PgVectorDatabaseManager
from app.middleware import SimpleRateLimiter, get_server_metrics
from app.streaming import stream_langgraph_execution
from app.embeddings import DEFAULT_EMBEDDING_DIM

def test_vietnamese_text_normalization():
    raw = "Hóa Đơn Tiền Điện Tháng 05/2024! Có Bị Tăng Giá Không?"
    clean = normalize_vietnamese_text(raw)
    assert "hóa đơn tiền điện tháng 05 2024" in clean
    assert "!" not in clean
    assert "?" not in clean

def test_semantic_embedding_and_similarity():
    q1 = "Biểu giá điện 6 bậc thang năm 2025 là bao nhiêu?"
    q2 = "Bảng giá bán lẻ điện sinh hoạt 6 bậc năm 2025"
    q3 = "Lịch bảo trì cắt điện tại khu vực quận Hoàn Kiếm"

    vec1 = compute_text_embedding(q1)
    vec2 = compute_text_embedding(q2)
    vec3 = compute_text_embedding(q3)

    assert len(vec1) == DEFAULT_EMBEDDING_DIM
    assert len(vec2) == DEFAULT_EMBEDDING_DIM
    assert len(vec3) == DEFAULT_EMBEDDING_DIM

    # High similarity between price-related questions
    sim_1_2 = cosine_similarity(vec1, vec2)
    # Lower similarity between price vs outage maintenance
    sim_1_3 = cosine_similarity(vec1, vec3)

    assert sim_1_2 >= 0.80, f"Expected high similarity between q1 and q2, got {sim_1_2}"
    assert sim_1_2 > sim_1_3, f"Expected sim(q1, q2) > sim(q1, q3), got {sim_1_2} vs {sim_1_3}"

def test_semantic_cache_lifecycle():
    cache = SemanticCache(similarity_threshold=0.85)
    
    # 1. Miss on empty cache
    miss_res = cache.get("Biểu giá điện 2025")
    assert miss_res is None

    # 2. Set entry
    sample_response = {
        "answer": "Biểu giá điện 2025 gồm 6 bậc từ 1.893đ đến 3.302đ/kWh.",
        "state": {"status": "COMPLETED"},
        "trace": []
    }
    cache.set("Biểu giá điện sinh hoạt 6 bậc thang 2025", sample_response)

    # 3. Hit on semantically similar query
    hit_res = cache.get("Bảng giá bán lẻ điện sinh hoạt 6 bậc năm 2025")
    assert hit_res is not None
    data, score, matched_q = hit_res
    assert score >= 0.85
    assert "1.893đ" in data["answer"]

    # 4. Check statistics
    stats = cache.get_stats()
    assert stats["cached_entries_count"] == 1
    assert stats["cache_hits"] >= 1
    assert stats["total_tokens_saved"] > 0

    # 5. Clear cache
    cache.clear()
    assert cache.get_stats()["cached_entries_count"] == 0
    assert cache.get("Biểu giá điện sinh hoạt 6 bậc thang 2025") is None

def test_pgvector_info_and_hybrid():
    db_mgr = PgVectorDatabaseManager()
    info = db_mgr.get_info()
    
    assert "PostgreSQL 16" in info["engine"]
    assert info["vector_dimension"] == DEFAULT_EMBEDDING_DIM
    assert "HNSW" in info["index_type"]

def test_rate_limiter():
    limiter = SimpleRateLimiter(requests_per_minute=3)
    client = "192.168.1.100"

    assert limiter.is_allowed(client) is True
    assert limiter.is_allowed(client) is True
    assert limiter.is_allowed(client) is True
    # 4th request within 1 minute exceeds limit
    assert limiter.is_allowed(client) is False

def test_system_metrics():
    import time
    start = time.time() - 10.0
    metrics = get_server_metrics(start)
    assert metrics["status"] == "healthy"
    assert metrics["uptime_seconds"] >= 10.0
    assert metrics["features"]["sse_streaming"] is True
    assert metrics["features"]["semantic_cache"] is True

def test_sse_streaming_generator():
    async def _run_stream():
        events = []
        async for sse_chunk in stream_langgraph_execution(
            question="Giá điện bậc 1 là bao nhiêu?",
            thread_id="test-sse-thread",
            use_semantic_cache=False
        ):
            events.append(sse_chunk)
        return events

    events_received = asyncio.run(_run_stream())
    assert len(events_received) > 0
    full_text = "".join(events_received)
    assert "event: init" in full_text
    assert "event: node_start" in full_text
    assert "event: done" in full_text

