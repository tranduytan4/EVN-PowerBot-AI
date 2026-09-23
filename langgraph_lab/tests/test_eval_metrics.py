import pytest
import math
from langgraph_lab.eval.metrics import (
    compute_recall_at_k,
    compute_hit_rate_at_k,
    compute_reciprocal_rank,
    compute_ndcg_at_k,
    compute_retrieval_metrics,
    compute_aggregate_metrics
)

# =========================================================================
# UNIT TESTS FOR EVALUATION RETRIEVAL METRICS
# =========================================================================

def test_recall_at_k():
    gold = {"doc-01", "doc-02"}
    
    # 1. Full recall at k=2
    retrieved_perfect = ["doc-01", "doc-02", "doc-03"]
    assert compute_recall_at_k(retrieved_perfect, gold, k=2) == 1.0
    assert compute_recall_at_k(retrieved_perfect, gold, k=1) == 0.5
    
    # 2. Zero recall
    retrieved_none = ["doc-05", "doc-06", "doc-07"]
    assert compute_recall_at_k(retrieved_none, gold, k=3) == 0.0
    
    # 3. Partial recall
    retrieved_partial = ["doc-05", "doc-01", "doc-06"]
    assert compute_recall_at_k(retrieved_partial, gold, k=1) == 0.0
    assert compute_recall_at_k(retrieved_partial, gold, k=2) == 0.5
    assert compute_recall_at_k(retrieved_partial, gold, k=5) == 0.5
    
    # 4. Empty edge cases
    assert compute_recall_at_k([], set(), k=5) == 1.0
    assert compute_recall_at_k(["doc-01"], set(), k=5) == 0.0
    assert compute_recall_at_k([], gold, k=5) == 0.0

def test_hit_rate_at_k():
    gold = {"doc-01"}
    
    # Hit at rank 1
    assert compute_hit_rate_at_k(["doc-01", "doc-02"], gold, k=1) == 1.0
    
    # Hit at rank 3
    retrieved = ["doc-02", "doc-03", "doc-01", "doc-04"]
    assert compute_hit_rate_at_k(retrieved, gold, k=1) == 0.0
    assert compute_hit_rate_at_k(retrieved, gold, k=2) == 0.0
    assert compute_hit_rate_at_k(retrieved, gold, k=3) == 1.0
    assert compute_hit_rate_at_k(retrieved, gold, k=5) == 1.0

def test_reciprocal_rank():
    gold = {"doc-03"}
    
    # Rank 1 -> 1.0
    assert compute_reciprocal_rank(["doc-03", "doc-01", "doc-02"], gold) == 1.0
    
    # Rank 2 -> 0.5
    assert compute_reciprocal_rank(["doc-01", "doc-03", "doc-02"], gold) == 0.5
    
    # Rank 4 -> 0.25
    assert compute_reciprocal_rank(["doc-01", "doc-02", "doc-04", "doc-03"], gold) == 0.25
    
    # Not found -> 0.0
    assert compute_reciprocal_rank(["doc-01", "doc-02", "doc-04"], gold) == 0.0

def test_ndcg_at_k():
    gold = {"doc-01", "doc-02"}
    
    # Perfect ranking -> 1.0
    perfect = ["doc-01", "doc-02", "doc-03", "doc-04"]
    assert math.isclose(compute_ndcg_at_k(perfect, gold, k=10), 1.0, rel_tol=1e-5)
    
    # Second item at rank 3 instead of rank 2 -> nDCG < 1.0
    suboptimal = ["doc-01", "doc-03", "doc-02", "doc-04"]
    score = compute_ndcg_at_k(suboptimal, gold, k=10)
    assert 0.0 < score < 1.0
    
    # No matches -> 0.0
    none = ["doc-08", "doc-09"]
    assert compute_ndcg_at_k(none, gold, k=10) == 0.0

def test_compute_retrieval_metrics():
    retrieved_chunks = ["doc-01-sec-1", "doc-01-sec-2", "doc-02-sec-1"]
    retrieved_docs = ["QĐ-01/2025/ATĐ-EVN", "QĐ-01/2025/ATĐ-EVN", "QT-02/2024/SCD-EVN"]
    gold_chunks = ["doc-01-sec-1"]
    gold_docs = ["QĐ-01/2025/ATĐ-EVN"]
    
    metrics = compute_retrieval_metrics(
        retrieved_chunk_ids=retrieved_chunks,
        retrieved_doc_codes=retrieved_docs,
        gold_chunk_ids=gold_chunks,
        gold_doc_codes=gold_docs,
        latency_ms=12.5
    )
    
    assert metrics["latency_ms"] == 12.5
    assert metrics["recall_1"] == 1.0
    assert metrics["recall_5"] == 1.0
    assert metrics["hit_rate_1"] == 1.0
    assert metrics["mrr"] == 1.0
    assert metrics["ndcg_10"] == 1.0

def test_compute_aggregate_metrics():
    queries_data = [
        {
            "type": "Type-1",
            "metrics": {
                "recall_1": 1.0, "recall_5": 1.0, "hit_rate_5": 1.0,
                "mrr": 1.0, "ndcg_10": 1.0, "latency_ms": 10.0
            }
        },
        {
            "type": "Type-1",
            "metrics": {
                "recall_1": 0.0, "recall_5": 0.5, "hit_rate_5": 1.0,
                "mrr": 0.5, "ndcg_10": 0.6, "latency_ms": 20.0
            }
        },
        {
            "type": "Type-2",
            "metrics": {
                "recall_1": 1.0, "recall_5": 1.0, "hit_rate_5": 1.0,
                "mrr": 1.0, "ndcg_10": 1.0, "latency_ms": 15.0
            }
        }
    ]
    
    summary = compute_aggregate_metrics(queries_data)
    
    assert summary["total_queries"] == 3
    assert math.isclose(summary["overall"]["recall_1"], (1.0 + 0.0 + 1.0) / 3.0, rel_tol=1e-3)
    assert math.isclose(summary["overall"]["recall_5"], (1.0 + 0.5 + 1.0) / 3.0, rel_tol=1e-3)
    assert summary["overall"]["hit_rate_5"] == 1.0
    assert summary["overall"]["latency_p50"] == 15.0
    assert summary["overall"]["latency_mean"] == 15.0
    
    # Check by-type stats
    assert summary["by_type"]["Type-1"]["count"] == 2
    assert summary["by_type"]["Type-2"]["count"] == 1
    assert summary["by_type"]["Type-1"]["recall_5"] == 0.75
