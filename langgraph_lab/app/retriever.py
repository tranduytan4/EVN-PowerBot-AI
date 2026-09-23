import json
import os
import re
from typing import List, Dict, Any
from .db_pgvector import global_db_manager
from .reranker import global_reranker

class EVNDocumentRetriever:
    """
    Two-Stage Production RAG Retriever for EVN Knowledge Base:
    - Stage 1: Fast Candidate Retrieval via PostgreSQL Hybrid Search (Dense HNSW + Sparse FTS + RRF).
    - Stage 2: Contextual Cross-Encoder Reranking for high-precision Top-K filtering.
    """
    def __init__(self, data_path: str = None):
        if not data_path:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(current_dir, "..", "..", "src", "data", "documents.json")
            if not os.path.exists(data_path):
                data_path = os.path.join(os.getcwd(), "src", "data", "documents.json")

        self.data_path = data_path
        self.documents = []
        self.sections = []
        self._load_and_index()

    def _load_and_index(self):
        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                self.documents = json.load(f)
            
            for doc in self.documents:
                for sec in doc.get("sections", []):
                    self.sections.append({
                        "docId": doc.get("id"),
                        "docCode": doc.get("docCode"),
                        "docTitle": doc.get("title"),
                        "department": doc.get("department", "EVN"),
                        "effectiveDate": doc.get("effectiveDate", "01/01/2024"),
                        "heading": sec.get("heading", ""),
                        "text": sec.get("text", ""),
                        "full_content": f"{doc.get('title')} - {sec.get('heading')}: {sec.get('text')}"
                    })
        except Exception as e:
            print(f"[EVNDocumentRetriever] Error loading local documents: {e}")
            self.documents = []
            self.sections = []

    def _tokenize(self, text: str) -> List[str]:
        cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
        return [t for t in cleaned.split() if len(t) > 1]

    def search(
        self,
        query: str,
        top_k: int = 3,
        candidate_pool_size: int = 12,
        start_date: str = None,
        end_date: str = None,
        category: str = None
    ) -> List[Dict[str, Any]]:
        """
        Executes Stage 1 (Hybrid Retrieval) followed by Stage 2 (Cross-Encoder Reranking).
        """
        candidates: List[Dict[str, Any]] = []

        # 1. Stage 1: Query Live PostgreSQL pgvector Database first
        try:
            live_db_results = global_db_manager.query_chunks(
                query_text=query,
                top_k=candidate_pool_size,
                start_date=start_date,
                end_date=end_date,
                category=category
            )
            if live_db_results:
                candidates = [
                    {
                        "docCode": r["docCode"],
                        "docTitle": r["docTitle"],
                        "heading": r["heading"],
                        "department": r["department"],
                        "effectiveDate": r["effectiveDate"],
                        "content": r["text"],
                        "denseScore": r.get("denseScore", 0.0),
                        "sparseScore": r.get("sparseScore", 0.0),
                        "score": r.get("score", 0.0),
                        "source": r.get("source", "PostgreSQL + pgvector")
                    }
                    for r in live_db_results
                ]
        except Exception as e:
            print(f"[Retriever] Live DB search fallback: {e}")

        # 2. Local Fallback Candidate Generator if DB is empty/offline
        if not candidates and self.sections:
            q_lower = query.lower()
            q_tokens = set(self._tokenize(query))
            
            scored_sections = []
            for sec in self.sections:
                content_lower = sec["full_content"].lower()
                sec_tokens = set(self._tokenize(sec["full_content"]))
                
                overlap = len(q_tokens.intersection(sec_tokens))
                score = overlap * 2.0
                
                # Domain specific keywords
                if any(term in q_lower and term in content_lower for term in ["last gasp", "ami", "công tơ thông minh", "đo đếm từ xa"]):
                    score += 15.0
                if any(term in q_lower and term in content_lower for term in ["trạm biến áp", "22kv", "cos phi", "công suất phản kháng"]):
                    score += 15.0
                if any(term in q_lower and term in content_lower for term in ["điện mặt trời", "tự sản tự tiêu", "100kw", "công tơ 2 chiều"]):
                    score += 15.0
                if any(term in q_lower and term in content_lower for term in ["trạm sạc", "xe điện", "1.450", "thấp điểm"]):
                    score += 15.0
                if any(term in q_lower and term in content_lower for term in ["đứt dây", "10 mét", "10m", "điện giật"]):
                    score += 10.0
                if any(term in q_lower and term in content_lower for term in ["bồi thường", "mất điện kéo dài", "8 giờ", "8h"]):
                    score += 10.0
                if any(term in q_lower and term in content_lower for term in ["biểu giá", "giá điện", "bậc 1", "bậc 2", "bậc 3"]):
                    score += 10.0
                    
                if score > 0:
                    scored_sections.append({
                        "docCode": sec["docCode"],
                        "docTitle": sec["docTitle"],
                        "heading": sec["heading"],
                        "department": sec["department"],
                        "effectiveDate": sec["effectiveDate"],
                        "content": sec["text"],
                        "score": round(score, 2),
                        "source": "Local JSON Knowledge Base"
                    })

            scored_sections.sort(key=lambda x: x["score"], reverse=True)
            candidates = scored_sections[:candidate_pool_size]

        if not candidates:
            return []

        # 3. Stage 2: Cross-Encoder Contextual Reranking
        reranked_results = global_reranker.rerank(
            query=query,
            documents=candidates,
            top_k=top_k,
            min_relevance_score=0.20
        )

        return reranked_results

retriever = EVNDocumentRetriever()

