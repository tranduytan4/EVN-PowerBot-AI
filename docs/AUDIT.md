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

### 2.4. Mô-đun LangGraph Agent, Routing & Checkpointer (`langgraph_lab/app/graph.py`, `checkpoints.py` & `nodes.py`)
- **Tuyên bố trong README**: LangGraph StateGraph Multi-Agent Orchestration, Human-in-the-loop Checkpoint lưu trạng thái PostgreSQL, Self-Correction Loop.
- **Thực tế trong mã nguồn**:
  - **Cơ chế Checkpointer**: Mặc định hệ thống sử dụng `MemorySaver()` (in-memory state checkpointer). Bảng `langgraph_checkpoints` trong PostgreSQL DDL đã được tạo schema, nhưng `PostgresSaver` chưa được kết nối làm checkpointer runtime cho `evn_graph`. Khi tiến trình FastAPI khởi động lại, các thread state trong RAM sẽ bị mất.
  - **Cơ chế Human-in-the-Loop (HITL)**: Điểm ngắt `interrupt_before=["human_approval"]` hoạt động tốt trên `MemorySaver` trong phiên chạy hiện tại, kết hợp cờ trạng thái `requires_human=True` trong state. Chưa hỗ trợ phục hồi phiên sau khi restart server (chưa có persistent PostgresSaver).
  - **Bộ định tuyến Intent**: Dựa hoàn toàn trên Regex và danh mục từ khóa deterministic.

### 2.5. Mô-đun Semantic Cache (`langgraph_lab/app/semantic_cache.py`)
- **Tuyên bố trong README**: Semantic Vector Cache trên Redis với độ trễ $< 25\text{ms}$, giảm 65% chi phí API LLM, hạ độ trễ từ 2.1s xuống 35ms.
- **Thực tế trong mã nguồn**:
  - Hoạt động với ngưỡng `similarity_threshold = 0.90`.
  - Lưu trữ Redis dạng Key-Value (`semcache:{hash}` chứa `{question, vector, response}`).
  - Khi tra cứu, gọi `redis_client.keys("semcache:*")` và duyệt vòng lặp Python để tính `cosine_similarity(query_vec, cached_vec)`.
  - **Đánh giá trung thực**:
    - Đây là quét tuyến tính (Linear In-Memory Scan) trên Redis keys chứ không phải RediSearch Vector Index (`FT.SEARCH`).
    - Chưa có namespace phân tách theo `EMBEDDING_BACKEND` và `CORPUS_SCOPE`.
    - Các con số "giảm từ 2.1s xuống 35ms" và "giảm 65% chi phí" là số liệu ước tính mục tiêu thiết kế ban đầu, chưa qua đo lường benchmark thực tế trên tập câu hỏi chuẩn.

---

## 3. Bảng Đối Chiếu Chi Tiết Toàn Diện (README Claims vs. Code Reality)

| Hạng mục Tuyên bố trong README | Hiện trạng Thực tế trong Code | Đánh giá & Rủi ro Kỹ thuật | Hướng khắc phục trong Eval Foundation |
| :--- | :--- | :--- | :--- |
| **"Universal 1536D Vector Embedding"** | Fallback sang `_local_semantic_embedding` (12 neo từ khóa + N-gram hash) khi không có OpenAI key. | Không có khả năng hiểu ngữ nghĩa sâu ngoài 12 chủ đề cứng. | Thêm `EMBEDDING_BACKEND=legacy\|gemini\|bge-m3` với Gemini API / BGE-M3 thật. |
| **"Cross-Encoder Reranker (BGE-Reranker-M3)"** | Thuật toán Heuristic (`_compute_relevance_score`) dựa trên coverage, heading overlap, n-gram. | Không tính toán Cross-Attention bằng mô hình Transformer. | Thêm `RERANKER_BACKEND=legacy\|bge_reranker_v2_m3` (chạy mô hình Cross-Encoder thật khi bật cờ). |
| **"Sparse BM25 Full-Text Search"** | Dùng `ts_rank_cd(search_vector, plainto_tsquery('simple', ...))` của PostgreSQL. | Không phải Okapi BM25; không hỗ trợ tiếng Việt không dấu (`unaccent`); không tách từ ghép. | Thêm `SPARSE_BACKEND=legacy\|vi_unaccent\|bm25` (tách từ tiếng Việt + unaccent). |
| **"Recall@5 cải thiện +28% so với Vector đơn thuần"** | Chưa có pipeline benchmark tự động để đo lường. | Số liệu mục tiêu thiết kế ban đầu. | Xây dựng Harness đo đạc chính xác Recall@k trên tập Golden Set. |
| **"Zero Hallucination Guarantee"** | Prompt constraint + citation regex matching. | Không có bộ xác thực toán học/formal verification để cam kết 0% ảo giác. | Tích hợp Ragas Faithfulness metric & Hallucination Guardrails có đo lường. |
| **"Persistent Checkpointing (HITL)"** | Sử dụng `MemorySaver()` (RAM). Schema `langgraph_checkpoints` đã tạo trên Postgres nhưng chưa nối runtime. | Thread state bị mất khi restart service; HITL phụ thuộc vào phiên RAM và in-state flag. | Duy trì MemorySaver cho baseline; có thể bổ sung PostgresSaver tùy chọn sau này. |
| **"Redis Semantic Cache hạ từ 2.1s xuống 35ms"** | Quét tuyến tính Python trên các keys `semcache:*`. | Đo lường nội bộ chưa có tải thực tế; chưa namespace theo model. | Bổ sung namespace `semcache:{backend}:{scope}:...` và cờ `EVAL_MODE` bypass cache. |

---

## 4. Kết luận & Khuyến nghị Kỹ thuật cho Phase 1 - 6

1. **Bảo tồn Tuyệt đối Hành vi Mặc định (Non-Regression)**:
   - Toàn bộ các cơ chế cũ (`legacy` embedding, `legacy` heuristic reranker, `legacy` sparse search) phải được giữ nguyên 100% khi không đặt các biến môi trường mới.
2. **Khởi tạo Hệ thống Đánh giá Độc lập**:
   - Xây dựng Harness độc lập trong thư mục `eval/` (hoặc `langgraph_lab/eval/`) có khả năng đo đạc chính xác hiệu năng của cấu hình `legacy` làm **Baseline V0**.
   - Mọi cải tiến tiếp theo (Sparse có dấu/không dấu, Embedding thật, Reranker thật) sẽ được đo lường so sánh trực tiếp với Baseline V0 trên cùng một tập Golden Dataset.

