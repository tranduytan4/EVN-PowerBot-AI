import os
import sys
import argparse
from pathlib import Path

# Ensure project root is in sys.path
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from langgraph_lab.eval.config import get_eval_config, PRESET_CONFIGS
from langgraph_lab.eval.dataset import GoldenDatasetLoader
from langgraph_lab.eval.runner import EvaluationRunner

def main():
    parser = argparse.ArgumentParser(description="EVN PowerBot AI RAG Evaluation Harness Runner")
    parser.add_argument(
        "--config",
        type=str,
        default="baseline_v0",
        help=f"Named preset configuration ({', '.join(PRESET_CONFIGS.keys())}) or custom config name"
    )
    parser.add_argument(
        "--split",
        type=str,
        default="dev",
        choices=["dev", "test", "all"],
        help="Dataset split to evaluate ('dev' | 'test' | 'all')"
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=5,
        help="Top-K candidate limit for retrieval evaluation"
    )
    parser.add_argument(
        "--dataset-path",
        type=str,
        default=None,
        help="Path to custom golden dataset JSONL file"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print estimated cost and number of queries without executing"
    )
    parser.add_argument(
        "--export-review-csv",
        type=str,
        default=None,
        help="Export dataset to CSV review sheet and exit"
    )

    args = parser.parse_args()

    loader = GoldenDatasetLoader(args.dataset_path)
    
    if args.export_review_csv:
        loader.export_review_csv(args.export_review_csv)
        sys.exit(0)

    # Load questions for split
    questions = loader.load(split=args.split)
    if not questions:
        print(f"[Warning] No questions found for split '{args.split}' at '{loader.data_path}'.")
        print("Creating a seed sample question set for skeleton verification...")
        from langgraph_lab.eval.dataset import GoldenQuestion
        sample_questions = [
            GoldenQuestion(
                id="gold-01",
                question="Khoảng cách an toàn phóng điện với đường dây 22kV và 110kV là bao nhiêu mét?",
                type="Type-1",
                gold_chunk_ids=["doc-01-sec-1"],
                gold_doc_codes=["QĐ-01/2025/ATĐ-EVN"],
                reference_answer="Đường dây 22kV tối thiểu 2.0m, đường dây 110kV tối thiểu 4.0m.",
                split="dev",
                review_status="auto"
            ),
            GoldenQuestion(
                id="gold-02",
                question="Biểu giá điện ưu đãi trạm sạc xe điện giờ thấp điểm",
                type="Type-1",
                gold_chunk_ids=["doc-10-sec-2"],
                gold_doc_codes=["TT-10/2026/TT-BCT"],
                reference_answer="Đơn giá ưu đãi giờ thấp điểm là 1.450 đ/kWh từ 22h00 đến 04h00.",
                split="dev",
                review_status="auto"
            ),
            GoldenQuestion(
                id="gold-03",
                question="Quy định bồi thường khi bị cắt điện kéo dài liên tục trên 8 giờ",
                type="Type-1",
                gold_chunk_ids=["doc-07-sec-2"],
                gold_doc_codes=["QĐ-07/2024/BTTH-EVN"],
                reference_answer="Giảm 10% tiền điện bậc 1 nếu mất điện từ 8-16h, hỗ trợ 150.000đ nếu mất 16-24h.",
                split="test",
                review_status="auto"
            )
        ]
        loader.save(sample_questions)
        questions = loader.load(split=args.split)

    # Load configuration
    cfg = get_eval_config(args.config, split=args.split, top_k=args.top_k)
    
    # Run evaluation
    runner = EvaluationRunner(cfg)
    results = runner.run(questions, dry_run=args.dry_run)
    
    if not args.dry_run:
        ov = results["summary"].get("overall", {})
        print(f"[EVAL] Evaluation Complete: Recall@5 = {ov.get('recall_5', 0.0):.4f} | MRR = {ov.get('mrr', 0.0):.4f} | p50 = {ov.get('latency_p50', 0.0):.2f}ms")

if __name__ == "__main__":
    main()
