import os
import json
import csv
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

@dataclass
class GoldenQuestion:
    """
    Schema for a Golden Evaluation Question.
    """
    id: str
    question: str
    type: str                         # 'Type-1' (Doc RAG), 'Type-2' (Customer Lookup), 'Type-3' (Calc/Outage), 'Type-4' (Out of scope)
    gold_chunk_ids: List[str]
    gold_doc_codes: List[str]
    reference_answer: str
    should_abstain: bool = False
    difficulty: str = "medium"        # 'easy' | 'medium' | 'hard'
    split: str = "dev"                # 'dev' | 'test'
    review_status: str = "auto"       # 'auto' | 'reviewed' | 'rejected'
    notes: Optional[str] = ""

class GoldenDatasetLoader:
    """
    Loads, filters, and manages Golden Evaluation Datasets from JSONL files.
    """
    def __init__(self, data_path: Optional[str] = None):
        if not data_path:
            base_dir = Path(__file__).resolve().parent.parent / "eval" / "data"
            data_path = str(base_dir / "golden.jsonl")
            
        self.data_path = Path(data_path)
        
    def load(self, split: Optional[str] = None, include_unreviewed: bool = True) -> List[GoldenQuestion]:
        """Loads and filters questions by split ('dev', 'test', 'all')."""
        if not self.data_path.exists():
            return []
        
        questions: List[GoldenQuestion] = []
        with open(self.data_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                data = json.loads(line)
                
                # Split filter
                if split and split != "all" and data.get("split") != split:
                    continue
                    
                if not include_unreviewed and data.get("review_status") == "rejected":
                    continue
                    
                q = GoldenQuestion(
                    id=data["id"],
                    question=data["question"],
                    type=data.get("type", "Type-1"),
                    gold_chunk_ids=data.get("gold_chunk_ids", []),
                    gold_doc_codes=data.get("gold_doc_codes", []),
                    reference_answer=data.get("reference_answer", ""),
                    should_abstain=data.get("should_abstain", False),
                    difficulty=data.get("difficulty", "medium"),
                    split=data.get("split", "dev"),
                    review_status=data.get("review_status", "auto"),
                    notes=data.get("notes", "")
                )
                questions.append(q)
                
        return questions

    def save(self, questions: List[GoldenQuestion]):
        """Saves questions list back to JSONL format."""
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.data_path, "w", encoding="utf-8") as f:
            for q in questions:
                f.write(json.dumps(asdict(q), ensure_ascii=False) + "\n")

    def export_review_csv(self, csv_output_path: str):
        """Exports questions to a clean CSV review sheet for manual inspection."""
        questions = self.load(split="all")
        out_path = Path(csv_output_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "ID", "Split", "Type", "Difficulty", "Review Status",
                "Question", "Gold Docs", "Should Abstain", "Reference Answer", "Notes"
            ])
            for q in questions:
                writer.writerow([
                    q.id,
                    q.split,
                    q.type,
                    q.difficulty,
                    q.review_status,
                    q.question,
                    ", ".join(q.gold_doc_codes),
                    "YES" if q.should_abstain else "NO",
                    q.reference_answer,
                    q.notes
                ])
                
        print(f"[Dataset] Exported {len(questions)} review rows to {out_path}")
