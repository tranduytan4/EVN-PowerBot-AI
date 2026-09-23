import math
import numpy as np
from typing import List, Dict, Any, Set, Optional

def compute_recall_at_k(retrieved_ids: List[str], gold_ids: Set[str], k: int) -> float:
    """
    Computes Recall@k: Proportion of gold documents/chunks retrieved in the top k.
    """
    if not gold_ids:
        return 1.0 if not retrieved_ids else 0.0
    
    top_k_retrieved = set(retrieved_ids[:k])
    hits = len(top_k_retrieved.intersection(gold_ids))
    return hits / len(gold_ids)

def compute_hit_rate_at_k(retrieved_ids: List[str], gold_ids: Set[str], k: int) -> float:
    """
    Computes HitRate@k (Binary indicator if at least one gold item is in top k).
    """
    if not gold_ids:
        return 1.0 if not retrieved_ids else 0.0
    
    top_k_retrieved = set(retrieved_ids[:k])
    return 1.0 if len(top_k_retrieved.intersection(gold_ids)) > 0 else 0.0

def compute_reciprocal_rank(retrieved_ids: List[str], gold_ids: Set[str]) -> float:
    """
    Computes Reciprocal Rank (RR): 1 / rank of first relevant retrieved item (1-indexed).
    """
    if not gold_ids:
        return 1.0 if not retrieved_ids else 0.0
    
    for idx, item_id in enumerate(retrieved_ids, start=1):
        if item_id in gold_ids:
            return 1.0 / idx
    return 0.0

def compute_ndcg_at_k(retrieved_ids: List[str], gold_ids: Set[str], k: int = 10) -> float:
    """
    Computes Normalized Discounted Cumulative Gain at k (nDCG@k) with binary relevance.
    Deduplicates retrieved items so relevant items are not rewarded multiple times.
    """
    if not gold_ids:
        return 1.0 if not retrieved_ids else 0.0
    
    seen = set()
    top_k_retrieved = []
    for item in retrieved_ids:
        if item not in seen:
            seen.add(item)
            top_k_retrieved.append(item)
        if len(top_k_retrieved) == k:
            break
            
    dcg = 0.0
    for idx, item_id in enumerate(top_k_retrieved, start=1):
        rel = 1.0 if item_id in gold_ids else 0.0
        if rel > 0:
            dcg += rel / math.log2(idx + 1)
            
    # Compute Ideal DCG (IDCG)
    idcg = 0.0
    ideal_hits = min(len(gold_ids), k)
    for idx in range(1, ideal_hits + 1):
        idcg += 1.0 / math.log2(idx + 1)
        
    if idcg <= 0:
        return 0.0
    return dcg / idcg

def compute_retrieval_metrics(
    retrieved_chunk_ids: List[str],
    retrieved_doc_codes: List[str],
    gold_chunk_ids: List[str],
    gold_doc_codes: List[str],
    latency_ms: float = 0.0,
    k_values: List[int] = [1, 3, 5, 10]
) -> Dict[str, float]:
    """
    Computes comprehensive retrieval metrics for a single query instance.
    Evaluates at both chunk-level and document-level.
    """
    gold_chunks = set(gold_chunk_ids or [])
    gold_docs = set(gold_doc_codes or [])
    
    # We evaluate document-level retrieval if gold_docs is present
    target_raw = retrieved_doc_codes if gold_docs else retrieved_chunk_ids
    target_gold = gold_docs if gold_docs else gold_chunks
    
    # Deduplicate retrieved IDs preserving rank order
    seen = set()
    target_retrieved = []
    for item in target_raw:
        if item not in seen:
            seen.add(item)
            target_retrieved.append(item)
    
    metrics = {
        "latency_ms": latency_ms,
        "mrr": compute_reciprocal_rank(target_retrieved, target_gold),
        "ndcg_10": compute_ndcg_at_k(target_retrieved, target_gold, k=10)
    }
    
    for k in k_values:
        metrics[f"recall_{k}"] = compute_recall_at_k(target_retrieved, target_gold, k=k)
        metrics[f"hit_rate_{k}"] = compute_hit_rate_at_k(target_retrieved, target_gold, k=k)
        
    return metrics

def compute_aggregate_metrics(
    per_query_results: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Aggregates per-query metrics across the entire dataset and by Question Type.
    """
    if not per_query_results:
        return {}
    
    overall_metrics: Dict[str, List[float]] = {
        "recall_1": [],
        "recall_3": [],
        "recall_5": [],
        "recall_10": [],
        "hit_rate_1": [],
        "hit_rate_3": [],
        "hit_rate_5": [],
        "hit_rate_10": [],
        "mrr": [],
        "ndcg_10": [],
        "latency_ms": []
    }
    
    by_type_metrics: Dict[str, Dict[str, List[float]]] = {}
    
    for item in per_query_results:
        q_type = str(item.get("type", "Type-1"))
        if q_type not in by_type_metrics:
            by_type_metrics[q_type] = {k: [] for k in overall_metrics}
            
        m = item.get("metrics", {})
        for key in overall_metrics:
            if key in m:
                val = float(m[key])
                overall_metrics[key].append(val)
                by_type_metrics[q_type][key].append(val)
                
    summary: Dict[str, Any] = {
        "total_queries": len(per_query_results),
        "overall": {}
    }
    
    # Calculate means and percentiles
    for key, values in overall_metrics.items():
        if values:
            if key == "latency_ms":
                summary["overall"]["latency_p50"] = float(np.percentile(values, 50))
                summary["overall"]["latency_p90"] = float(np.percentile(values, 90))
                summary["overall"]["latency_p95"] = float(np.percentile(values, 95))
                summary["overall"]["latency_p99"] = float(np.percentile(values, 99))
                summary["overall"]["latency_mean"] = float(np.mean(values))
            else:
                summary["overall"][key] = round(float(np.mean(values)), 4)
                
    # By-type breakdown
    summary["by_type"] = {}
    for q_type, metrics_dict in by_type_metrics.items():
        summary["by_type"][q_type] = {
            "count": len(metrics_dict.get("recall_5", []))
        }
        for key, values in metrics_dict.items():
            if values and key != "latency_ms":
                summary["by_type"][q_type][key] = round(float(np.mean(values)), 4)
            elif values and key == "latency_ms":
                summary["by_type"][q_type]["latency_p50"] = round(float(np.percentile(values, 50)), 2)
                
    return summary
