import os
import time
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional

from .config import EvalConfig
from .dataset import GoldenQuestion, GoldenDatasetLoader
from .metrics import compute_retrieval_metrics, compute_aggregate_metrics
from ..app.retriever import EVNDocumentRetriever

class EvaluationRunner:
    """
    Executes reproducible benchmark runs for a specified EvalConfig.
    Evaluates Candidate Retrieval (Dense / Sparse / Hybrid RRF / Contextual Rerank)
    against Golden Dataset ground truths.
    """
    def __init__(self, config: EvalConfig):
        self.config = config
        self.retriever = EVNDocumentRetriever()
        
    def run(self, questions: List[GoldenQuestion], dry_run: bool = False) -> Dict[str, Any]:
        """
        Runs evaluation across all provided golden questions.
        """
        if dry_run:
            print(f"[EvalRunner] DRY RUN mode active for config '{self.config.name}'.")
            print(f"[EvalRunner] Would evaluate {len(questions)} queries on split '{self.config.split}'.")
            return {
                "config": self.config.__dict__,
                "dry_run": True,
                "total_queries": len(questions)
            }
            
        print("\n=======================================================")
        print(f"[EVAL] RUNNING EVALUATION: {self.config.name.upper()}")
        print(f"[EVAL] Split: {self.config.split} | Queries: {len(questions)}")
        print(f"[EVAL] Corpus: {self.config.corpus_scope} | Sparse: {self.config.sparse_backend} | Embedding: {self.config.embedding_backend}")
        print(f"[EVAL] Retrieval Mode: {self.config.retrieval_mode} | Top-K: {self.config.top_k}")
        print("=======================================================\n")
        
        per_query_results: List[Dict[str, Any]] = []
        
        for idx, q in enumerate(questions, start=1):
            t0 = time.perf_counter()
            
            # Execute Retrieval based on config
            retrieved_chunks = self.retriever.search(
                query=q.question,
                top_k=self.config.top_k,
                candidate_pool_size=self.config.candidate_pool_size
            )
            
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            
            retrieved_doc_codes = [r.get("docCode", "") for r in retrieved_chunks]
            retrieved_chunk_ids = [r.get("docId", "") for r in retrieved_chunks]
            
            # Compute retrieval metrics
            metrics = compute_retrieval_metrics(
                retrieved_chunk_ids=retrieved_chunk_ids,
                retrieved_doc_codes=retrieved_doc_codes,
                gold_chunk_ids=q.gold_chunk_ids,
                gold_doc_codes=q.gold_doc_codes,
                latency_ms=elapsed_ms
            )
            
            per_query_results.append({
                "id": q.id,
                "question": q.question,
                "type": q.type,
                "difficulty": q.difficulty,
                "should_abstain": q.should_abstain,
                "gold_docs": q.gold_doc_codes,
                "retrieved_docs": retrieved_doc_codes,
                "metrics": metrics
            })
            
            if idx % 10 == 0 or idx == len(questions):
                print(f"  [{idx}/{len(questions)}] Evaluated query '{q.id}' (Recall@5: {metrics['recall_5']:.2f}, Latency: {elapsed_ms:.1f}ms)")
                
        # Compute aggregate summary
        summary = compute_aggregate_metrics(per_query_results)
        
        run_record = {
            "config": self.config.__dict__,
            "timestamp": datetime.now().isoformat(),
            "summary": summary,
            "queries": per_query_results
        }
        
        self._save_results(run_record)
        return run_record

    def _save_results(self, record: Dict[str, Any]):
        """Persists evaluation results as JSON and Markdown reports."""
        out_dir = Path(self.config.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = f"{self.config.name}_{self.config.split}_{timestamp_str}"
        
        # 1. Save Full JSON
        json_path = out_dir / f"{base_name}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
            
        # 2. Save Markdown Report
        md_path = out_dir / f"{base_name}.md"
        md_content = self._generate_markdown_report(record)
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)
            
        print(f"\n[EVAL] Results saved successfully:")
        print(f"   - JSON: {json_path}")
        print(f"   - Markdown: {md_path}\n")

    def _generate_markdown_report(self, record: Dict[str, Any]) -> str:
        cfg = record["config"]
        summary = record["summary"]
        ov = summary.get("overall", {})
        
        lines = [
            f"# Báo Cáo Đánh Giá RAG: {cfg['name'].upper()}",
            f"- **Thời gian chạy**: {record['timestamp']}",
            f"- **Tập dữ liệu (Split)**: `{cfg['split']}` ({summary['total_queries']} câu hỏi)",
            f"- **Cấu hình**: Corpus=`{cfg['corpus_scope']}` | Sparse=`{cfg['sparse_backend']}` | Embedding=`{cfg['embedding_backend']}` | Reranker=`{cfg['reranker_backend']}`",
            "",
            "## 1. Chỉ Số Tổng Thể (Overall Metrics)",
            "| Chỉ số | Giá trị |",
            "| :--- | :--- |",
            f"| **Recall@1** | {ov.get('recall_1', 0.0):.4f} |",
            f"| **Recall@3** | {ov.get('recall_3', 0.0):.4f} |",
            f"| **Recall@5** | {ov.get('recall_5', 0.0):.4f} |",
            f"| **Recall@10** | {ov.get('recall_10', 0.0):.4f} |",
            f"| **HitRate@1** | {ov.get('hit_rate_1', 0.0):.4f} |",
            f"| **HitRate@5** | {ov.get('hit_rate_5', 0.0):.4f} |",
            f"| **MRR** | {ov.get('mrr', 0.0):.4f} |",
            f"| **nDCG@10** | {ov.get('ndcg_10', 0.0):.4f} |",
            f"| **Độ trễ p50** | {ov.get('latency_p50', 0.0):.2f} ms |",
            f"| **Độ trễ p95** | {ov.get('latency_p95', 0.0):.2f} ms |",
            f"| **Độ trễ trung bình** | {ov.get('latency_mean', 0.0):.2f} ms |",
            "",
            "## 2. Chi Tiết Theo Loại Câu Hỏi (By Question Type)",
            "| Loại Câu Hỏi | Số lượng | Recall@5 | HitRate@5 | MRR | nDCG@10 | Độ trễ p50 (ms) |",
            "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
        ]
        
        for q_type, m in summary.get("by_type", {}).items():
            lines.append(
                f"| `{q_type}` | {m.get('count', 0)} | {m.get('recall_5', 0.0):.4f} | {m.get('hit_rate_5', 0.0):.4f} | {m.get('mrr', 0.0):.4f} | {m.get('ndcg_10', 0.0):.4f} | {m.get('latency_p50', 0.0):.2f} |"
            )
            
        return "\n".join(lines) + "\n"
