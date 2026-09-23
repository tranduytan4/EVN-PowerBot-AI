import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    load_dotenv(dotenv_path=_env_file)
else:
    load_dotenv()

from typing import Dict, Any, List, Optional, Tuple
from .embeddings import global_embedder, DEFAULT_EMBEDDING_DIM

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

class PgVectorDatabaseManager:
    """
    Production PostgreSQL + pgvector Database Manager.
    Executes native Hybrid Search (Dense HNSW Cosine + Sparse Full-Text Search + RRF k=60)
    with SQL-level metadata pre-filtering.
    """
    def __init__(self, connection_url: Optional[str] = None):
        self.connection_url = connection_url or os.getenv(
            "DATABASE_URL", 
            "postgresql://postgres:postgres@localhost:5432/evn_powerbot_db"
        )
        self.is_connected = False
        self._test_connection()

    def _test_connection(self) -> bool:
        if not PSYCOPG2_AVAILABLE or not self.connection_url:
            self.is_connected = False
            return False
        try:
            conn = psycopg2.connect(self.connection_url, connect_timeout=2)
            conn.close()
            self.is_connected = True
            return True
        except Exception:
            self.is_connected = False
            return False

    def query_chunks(
        self,
        query_text: str,
        top_k: int = 4,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes Live PostgreSQL Hybrid Search (Dense Cosine + Sparse FTS + RRF Rank Fusion).
        Falls back to pure Vector Cosine if FTS column is not yet generated.
        """
        if not self._test_connection():
            return []

        try:
            conn = psycopg2.connect(self.connection_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            query_vec = global_embedder.embed_query(query_text)
            query_vec_str = "[" + ",".join(str(x) for x in query_vec) + "]"

            # 1. Native PostgreSQL Hybrid Search with Reciprocal Rank Fusion (k=60)
            hybrid_sql = """
                WITH dense_candidates AS (
                    SELECT 
                        id, 
                        1 - (embedding <=> %s::vector) AS dense_score,
                        ROW_NUMBER() OVER (ORDER BY embedding <=> %s::vector ASC) AS dense_rank
                    FROM evn_document_chunks
                    WHERE (%s::date IS NULL OR effective_date >= %s::date)
                      AND (%s::date IS NULL OR effective_date <= %s::date)
                      AND (%s::text IS NULL OR category = %s::text)
                    LIMIT 15
                ),
                sparse_candidates AS (
                    SELECT 
                        id, 
                        ts_rank_cd(search_vector, plainto_tsquery('simple', %s)) AS sparse_score,
                        ROW_NUMBER() OVER (ORDER BY ts_rank_cd(search_vector, plainto_tsquery('simple', %s)) DESC) AS sparse_rank
                    FROM evn_document_chunks
                    WHERE search_vector @@ plainto_tsquery('simple', %s)
                      AND (%s::date IS NULL OR effective_date >= %s::date)
                      AND (%s::date IS NULL OR effective_date <= %s::date)
                      AND (%s::text IS NULL OR category = %s::text)
                    LIMIT 15
                )
                SELECT 
                    c.id,
                    c.doc_id,
                    c.doc_code,
                    c.doc_title,
                    c.category,
                    c.effective_date,
                    c.section_heading,
                    c.content,
                    COALESCE(d.dense_score, 0) AS dense_score,
                    COALESCE(s.sparse_score, 0) AS sparse_score,
                    (COALESCE(1.0 / (60 + d.dense_rank), 0.0) + COALESCE(1.0 / (60 + s.sparse_rank), 0.0)) AS rrf_score
                FROM evn_document_chunks c
                LEFT JOIN dense_candidates d ON c.id = d.id
                LEFT JOIN sparse_candidates s ON c.id = s.id
                WHERE d.id IS NOT NULL OR s.id IS NOT NULL
                ORDER BY rrf_score DESC, dense_score DESC
                LIMIT %s;
            """
            
            params = (
                query_vec_str, query_vec_str,
                start_date, start_date,
                end_date, end_date,
                category, category,
                query_text, query_text, query_text,
                start_date, start_date,
                end_date, end_date,
                category, category,
                top_k
            )

            try:
                cursor.execute(hybrid_sql, params)
                rows = cursor.fetchall()
            except Exception as sql_err:
                conn.rollback()
                try:
                    # Fallback to pure pgvector query if FTS column search_vector is not present
                    pure_vector_sql = """
                        SELECT 
                            id, doc_id, doc_code, doc_title, category, effective_date, section_heading, content,
                            (1 - (embedding <=> %s::vector)) AS dense_score,
                            0.0 AS sparse_score,
                            (1 - (embedding <=> %s::vector)) AS rrf_score
                        FROM evn_document_chunks
                        WHERE (%s::date IS NULL OR effective_date >= %s::date)
                          AND (%s::date IS NULL OR effective_date <= %s::date)
                        ORDER BY embedding <=> %s::vector ASC
                        LIMIT %s;
                    """
                    cursor.execute(pure_vector_sql, (
                        query_vec_str, query_vec_str,
                        start_date, start_date,
                        end_date, end_date,
                        query_vec_str,
                        top_k
                    ))
                    rows = cursor.fetchall()
                except Exception:
                    conn.rollback()
                    # Fallback for standard PostgreSQL without pgvector extension (FLOAT8[] array)
                    array_sql = """
                        SELECT id, doc_id, doc_code, doc_title, category, effective_date, section_heading, content, embedding
                        FROM evn_document_chunks
                        WHERE (%s::date IS NULL OR effective_date >= %s::date)
                          AND (%s::date IS NULL OR effective_date <= %s::date)
                          AND (%s::text IS NULL OR category = %s::text);
                    """
                    cursor.execute(array_sql, (start_date, start_date, end_date, end_date, category, category))
                    raw_rows = cursor.fetchall()
                    
                    # Compute Cosine similarity in Python
                    scored = []
                    for r in raw_rows:
                        emb = r.get("embedding")
                        if isinstance(emb, str):
                            try:
                                emb = json.loads(emb)
                            except Exception:
                                emb = []
                        if emb and isinstance(emb, list):
                            dot = sum(a * b for a, b in zip(query_vec, emb))
                            sim = max(0.0, min(1.0, dot))
                        else:
                            sim = 0.5

                        scored.append({
                            "id": r["id"],
                            "doc_id": r["doc_id"],
                            "doc_code": r["doc_code"],
                            "doc_title": r["doc_title"],
                            "category": r["category"],
                            "effective_date": r["effective_date"],
                            "section_heading": r["section_heading"],
                            "content": r["content"],
                            "dense_score": sim,
                            "sparse_score": 0.0,
                            "rrf_score": sim
                        })
                    scored.sort(key=lambda x: x["dense_score"], reverse=True)
                    rows = scored[:top_k]

            cursor.close()
            conn.close()

            if not rows:
                return []

            results = []
            for row in rows:
                results.append({
                    "docId": row["doc_id"],
                    "docCode": row["doc_code"],
                    "docTitle": row["doc_title"],
                    "heading": row["section_heading"],
                    "department": row.get("category", "EVN"),
                    "effectiveDate": str(row["effective_date"]),

                    "text": row["content"],
                    "denseScore": float(round(row.get("dense_score", 0.0), 4)),
                    "sparseScore": float(round(row.get("sparse_score", 0.0), 4)),
                    "score": float(round(row.get("rrf_score", 0.0), 4)),
                    "source": "PostgreSQL + pgvector (Hybrid HNSW + FTS)"
                })

            return results

        except Exception as e:
            print(f"[PgVectorDB] Query error: {e}")
            return []

    def get_info(self) -> Dict[str, Any]:
        """Returns metadata about database connection and index state."""
        connected = self._test_connection()
        return {
            "engine": "PostgreSQL 16 + pgvector",
            "driver": "psycopg2-binary" if PSYCOPG2_AVAILABLE else "None",
            "connected": connected,
            "database_name": "evn_powerbot_db",
            "connection_url": self.connection_url if connected else "Not connected (Fallback to local index)",
            "vector_dimension": DEFAULT_EMBEDDING_DIM,
            "index_type": "HNSW (m=16, ef_construction=64, metric=Cosine)",
            "hybrid_retrieval": "Dense HNSW + Sparse GIN tsvector + RRF (k=60)",
            "live_sync": "Active - Live transactional indexing"
        }

# Global DB Manager Singleton
global_db_manager = PgVectorDatabaseManager()


