# BÁO CÁO KIỂM TOÁN HỆ THỐNG TOÀN DIỆN (SYSTEM AUDIT REPORT)
**Dự án**: EVN PowerBot AI — Production RAG & Multi-Agent Assistant System  
**Nhánh kiểm toán**: `feat/eval-foundation`  
**Ngày thực hiện**: 2026-09-23  
**Người thực hiện**: Senior AI/ML Engineer  

---

## 1. Mục đích Kiểm toán
Kiểm toán độc lập toàn bộ mã nguồn hiện tại của hệ thống **EVN PowerBot AI** nhằm đánh giá trung thực giữa kiến trúc được triển khai trong mã nguồn thực tế và các tuyên bố trong tài liệu `README.md`, trước khi xây dựng nền tảng đánh giá (Evaluation Harness), tích hợp Langfuse Tracing và Ragas Evaluation.

---

## 2. Kết quả Kiểm toán Chi tiết theo từng Mô-đun

### 2.1. Mô-đun Embedding (`langgraph_lab/app/embeddings.py`)
- **Tuyên bố trong README**: Sử dụng mô hình OpenAI `text-embedding-3-small` (1536D) hoặc mô hình Multilingual SOTA.
- **Thực tế trong mã nguồn**:
  - Khi có biến môi trường `OPENAI_API_KEY` hợp lệ, hệ thống khởi tạo `langchain_openai.OpenAIEmbeddings`.
  - Khi không có `OPENAI_API_KEY` (hoặc chế độ mặc định cục bộ `provider="local"`), hệ thống chuyển sang hàm `_local_semantic_embedding(text)`.
  - Bản chất hàm cục bộ này là **bộ vectorizer dựa trên luật (rule-based / deterministic heuristic)**:
    1. Định nghĩa 12 nhóm từ khóa neo ngữ nghĩa (`semantic_anchors`) đặc thù ngành điện lực EVN và chiếu trọng số vào các khối kích thước cố định trong không gian 1536 chiều.
    2. Chiếu N-gram Hashing phân tán cho từng từ đơn và cặp từ (bi-gram) thông qua hàm băm `hash(word) % 1536`.
    3. Chuẩn hóa độ dài vector L2 ($\|\vec{v}\|_2 = 1.0$).
  - **Đánh giá trung thực**: Đây **không phải** là mô hình Deep Learning Transformer (như BGE-M3 hay MiniLM). Nó đóng vai trò fallback nhanh không cần GPU hoặc API key, bảo đảm tính tất định (deterministic), nhưng không có khả năng hiểu ngữ nghĩa sâu hoặc suy luận đa ngôn ngữ thực thụ.

### 2.2. Mô-đun Reranker (`langgraph_lab/app/reranker.py`)
- **Tuyên bố trong README**: Sử dụng Cross-Encoder Reranker (`BAAI/bge-reranker-v2-m3` / `bge-reranker-large`) để tính toán Cross-Attention và chấm điểm Rank Delta.
- **Thực tế trong mã nguồn**:
  - Class có tên `CrossEncoderReranker(model_name="bge-reranker-v2-m3")` và có đoạn thử import `sentence_transformers.CrossEncoder`.
  - Tuy nhiên, trong logic xếp hạng thực tế (`_compute_relevance_score`), hệ thống **hoàn toàn sử dụng thuật toán Heuristic**:
    1. Đo lường tỷ lệ bao phủ token (`coverage ratio`).
    2. Điểm thưởng trùng khớp tiêu đề (`heading_boost`).
    3. Điểm thưởng cụm từ N-gram chính xác (`phrase_boost`).
    4. Bảng tra cứu tương quan từ khóa đặc thù EVN (`evn_alignments`).
    5. Chuẩn hóa qua hàm Sigmoid: $\text{score} = \frac{1}{1 + e^{-2.5(\text{raw\_score} - 0.5)}}$.
  - **Đánh giá trung thực**: Đây là bộ Heuristic Re-scorer được thiết kế tốt cho ngữ cảnh ngành điện, nhưng **chưa phải là mô hình Cross-Encoder Neural Network** thực tế.

### 2.3. Mô-đun Truy xuất Cơ sở Dữ liệu (`langgraph_lab/app/db_pgvector.py`)
- **Tuyên bố trong README**: Hybrid Search kết hợp Dense Cosine Similarity (HNSW) + Sparse BM25 Full-Text Search + Reciprocal Rank Fusion ($k=60$).
- **Thực tế trong mã nguồn**:
  - **Dense Search**: Truy vấn `1 - (embedding <=> %s::vector)` trên chỉ mục HNSW vector cosine (`vector_cosine_ops`).
  - **Sparse Search**: Sử dụng hàm tích hợp sẵn của PostgreSQL `ts_rank_cd(search_vector, plainto_tsquery('simple', %s))` trên cấu hình từ điển `'simple'`.
  - **Reciprocal Rank Fusion**: Triển khai chính xác công thức RRF $k=60$: $\text{RRF\_score} = \frac{1}{60 + r_{dense}} + \frac{1}{60 + r_{sparse}}$.
  - **Đánh giá trung thực**:
    - Truy vấn Sparse **không phải là thuật toán Okapi BM25 chuẩn**, mà là thuật toán Cover Density Ranking (`ts_rank_cd`) của PostgreSQL.
    - Chưa áp dụng bộ mở rộng `unaccent` để tìm kiếm không dấu (ví dụ: gõ *"cat dien"* sẽ không khớp văn bản có dấu *"cắt điện"* qua Full-Text Search).
    - Chưa có bước tách từ tiếng Việt chuyên dụng (Vietnamese Word Segmentation) như `pyvi` hoặc `underthesea` (PostgreSQL `'simple'` chỉ tách từ theo khoảng trắng thông thường).

### 2.4. Mô-đun LangGraph Agent & Routing (`langgraph_lab/app/graph.py` & `nodes.py`)
- **Tuyên bố trong README**: LangGraph StateGraph Multi-Agent Orchestration, Human-in-the-loop Checkpoint, Self-Correction Loop.
- **Thực tế trong mã nguồn**:
  - Kiến trúc LangGraph StateGraph đã được xây dựng hoàn chỉnh với đầy đủ các node (`analyze_question`, `search_rag`, `customer_lookup`, `calculate_bill`, `check_outage`, `prepare_inspection`, `evaluate_result`, `rewrite_query`, `human_approval`, `generate_answer`).
  - **Bộ định tuyến Intent**: Hoàn toàn dựa trên tập luật Regex và từ khóa danh mục (`out_of_scope_terms`, `is_outage_query`, `is_technical_or_policy_query`).
  - **Checkpointer**: Mặc định sử dụng `MemorySaver` (in-memory state). Bảng PostgreSQL `langgraph_checkpoints` đã có schema trong DDL nhưng chưa được đấu nối làm checkpointer mặc định cho runtime.
  - **Human-in-the-loop**: Hoạt động chuẩn xác thông qua cơ chế `interrupt_before=["human_approval"]`.

### 2.5. Mô-đun Semantic Cache (`langgraph_lab/app/semantic_cache.py`)
- **Tuyên bố trong README**: Semantic Vector Cache trên Redis với độ trễ $< 25\text{ms}$, ngưỡng $\ge 0.90$.
- **Thực tế trong mã nguồn**:
  - Hoạt động với ngưỡng `similarity_threshold = 0.90`.
  - Khi lưu trữ vào Redis, nó ghi nhận key dưới dạng `semcache:{hash}`.
  - Khi đọc từ Redis, mã nguồn gọi `redis_client.keys("semcache:*")` và duyệt vòng lặp Python để tính `cosine_similarity(query_vec, cached_vec)`.
  - **Đánh giá trung thực**:
    - Đây là quét tuyến tính (Linear In-Memory Scan) trên Redis keys chứ không dùng module Redis RediSearch Vector (`FT.SEARCH`). Với quy mô vài trăm câu hỏi mẫu, độ trễ rất thấp (< 20ms), nhưng chưa phải index phân cấp.
    - Chưa có namespace phân tách theo `EMBEDDING_BACKEND` và `CORPUS_SCOPE` (nếu đổi mô hình embedding, cache cũ có thể tính sai cosine).

---

## 3. Bảng Đối Chiếu Chi Tiết (Claims vs. Code Reality)

| Tính năng | Tuyên bố trong README | Hiện trạng Thực tế trong Code | Đánh giá & Hướng nâng cấp trong Eval Foundation |
| :--- | :--- | :--- | :--- |
| **Embedding** | 1536D SOTA Multilingual Model | Deterministic rule-based vectorizer + OpenAI fallback | Bổ sung `EMBEDDING_BACKEND` (OpenAI / BGE-M3 / Qwen3-Embedding) phía sau cờ cấu hình |
| **Reranker** | Cross-Encoder BGE-Reranker-v2-m3 | Heuristic Rule-based Scorer (coverage, phrases, domain boosts) | Bổ sung Cross-Encoder thực tế `bge-reranker-v2-m3` phía sau cờ cấu hình |
| **Sparse Search** | BM25 Full-Text Search | PostgreSQL `ts_rank_cd` từ điển `simple` | Thêm `SPARSE_BACKEND=vi_unaccent` với `unaccent` và Vietnamese Tokenizer |
| **Semantic Cache** | Redis Vector Search | Redis Key-Value + In-Python Cosine Scan | Namespace cache keys theo backend/corpus, thêm cờ `EVAL_MODE` bypass cache |
| **Chỉ số (+28% Recall, 95% Faithfulness)** | Số liệu benchmark cố định | Số liệu mục tiêu thiết kế ban đầu | Xây dựng bộ đo đạc thực tế (Evaluation Harness + Ragas + Langfuse) với số liệu đo lường 100% minh bạch |

---

## 4. Kết luận & Khuyến nghị Kỹ thuật cho Phase 1 - 6

1. **Bảo tồn Tuyệt đối Hành vi Mặc định (Non-Regression)**:
   - Toàn bộ các cơ chế cũ (`legacy` embedding, `legacy` heuristic reranker, `legacy` sparse search) phải được giữ nguyên 100% khi không đặt các biến môi trường mới.
2. **Khởi tạo Hệ thống Đánh giá Độc lập**:
   - Xây dựng Harness độc lập trong thư mục `eval/` có khả năng đo đạc chính xác hiệu năng của cấu hình `legacy` làm **Baseline V0**.
   - Mọi cải tiến tiếp theo (Sparse có dấu/không dấu, Embedding thật, Reranker thật) sẽ được đo lường so sánh trực tiếp với Baseline V0 trên cùng một tập Golden Dataset.
