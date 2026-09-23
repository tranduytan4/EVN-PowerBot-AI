# EVN PowerBot AI — Trợ lý Ảo RAG & AI Agent Ngành Điện Lực

Ứng dụng mô phỏng hoàn chỉnh **Trợ lý Ảo AI chuyên ngành Điện lực (EVN Assistant)**, kết hợp kiến trúc **Retrieval-Augmented Generation (RAG)** và **AI Agent (Tool Calling / ReAct Loop)** với 2 chế độ hiển thị song song: **Chế độ Khách hàng (Customer Mode)** và **Chế độ Kỹ sư (Engineer / Under-the-Hood Mode)**.

---

## 📑 Mục Lục
1. [Kiến trúc Tổng quan Hệ thống (System Architecture)](#1-kiến-trúc-tổng-quan-hệ-thống)
2. [Chi tiết RAG Pipeline (Tính toán Thực tế)](#2-chi-tiết-rag-pipeline)
3. [Kiến trúc AI Agent & Tool Calling (ReAct Loop)](#3-kiến-trúc-ai-agent--tool-calling)
4. [Cắt đoạn Văn bản Động (Sentence-Aware Chunking Engine)](#4-cắt-đoạn-văn-bản-động)
5. [Không gian Vector & Nhúng Ngữ nghĩa (Embedding & Cosine Similarity)](#5-không-gian-vector--nhúng-ngữ-nghĩa)
6. [Chỉ mục Vector & Chiếu Không gian 2D PCA (Dimensionality Reduction)](#6-chỉ-mục-vector--chiếu-không-gian-2d-pca)
7. [Truy xuất Lai BM25 + Vector (Hybrid Search)](#7-truy-xuất-lai-bm25--vector)
8. [Hợp nhất Thứ hạng Reciprocal Rank Fusion (RRF k=60)](#8-hợp-nhất-thứ-hạng-rrf)
9. [Tái Xếp Hạng Ngữ Cảnh (Contextual Reranking & Rank Delta)](#9-tái-xếp-hạng-ngữ-cảnh)
10. [Điều phối & Nhận diện Ý định (Agent Query Routing)](#10-điều-phối--nhận-diện-ý-định)
11. [Sinh Phản hồi & Trích dẫn Minh bạch (Grounded Citations)](#11-sinh-phản-hồi--trích-dẫn-minh-bạch)
12. [Hiện thực 4 Luồng Nghiệp vụ Chuẩn (Business Flows Type 1 - 4)](#12-hiện-thực-4-luồng-nghiệp-vụ-chuẩn)
13. [Cấu trúc Thư mục Dự án (Project Structure)](#13-cấu-trúc-thư-mục-dự-án)
14. [Hướng dẫn Cài đặt & Chạy Local (Quickstart)](#14-hướng-dẫn-cài-đặt--chạy-local)
15. [Cấu hình Khóa API & Biến Môi trường (API Keys & Config)](#15-cấu-hình-khóa-api--biến-môi-trường)
16. [Hướng dẫn Thay thế Bộ Tài liệu Thật (Production Ingestion)](#16-hướng-dẫn-thay-thế-bộ-tài-liệu-thật)
17. [Hướng dẫn Thay thế Mock Tools bằng API Thật (Production APIs)](#17-hướng-dẫn-thay-thế-mock-tools-bằng-api-thật)
18. [Hướng dẫn Tích hợp Vector DB & Production Reranker](#18-hướng-dẫn-tích-hợp-vector-db--production-reranker)
19. [Lý do Lựa chọn Kiến trúc & Đánh giá Đánh đổi (Architectural Decisions)](#19-lý-do-lựa-chọn-kiến-trúc)

---

## 1. Kiến trúc Tổng quan Hệ thống

```
+-----------------------------------------------------------------------------------+
|                           GIAO DIỆN NGƯỜI DÙNG (REACT 19 + TAILWIND)              |
|  [Customer Mode (Intercom/Stripe Style)]  <--->  [Engineer Mode (Under-the-Hood)] |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        AGENT INTENT ROUTING & QUERY DISPATCH                      |
|  - Type 1: Policy/Procedure  --> Kích hoạt RAG Pipeline                            |
|  - Type 2: Customer Data     --> Kích hoạt Tool Calling API                       |
|  - Type 3: Multi-step Flow   --> Kích hoạt ReAct Loop (Tool -> RAG -> Synthesize)  |
|  - Type 4: Out-of-Scope      --> Kích hoạt Guardrail & Human Handoff (19001909)   |
+-----------------------------------------------------------------------------------+
           │                                                        │
           ▼                                                        ▼
+------------------------------------+    +-----------------------------------------+
|        RAG PIPELINE CORE           |    |            AGENT TOOLS ENGINE           |
| 1. Sentence-Aware Chunking         |    | - get_meter_reading(customerId)         |
| 2. BM25 Lexical Inverted Search    |    | - get_current_bill(customerId)          |
| 3. Vector Cosine Similarity (128D) |    | - get_payment_history(customerId)       |
| 4. Reciprocal Rank Fusion (RRF)    |    | - check_maintenance_outage(customerId)  |
| 5. 2D PCA Vector Space Projection  |    | - estimate_current_bill(customerId)     |
| 6. Contextual Cross-Reranker       |    | - create_support_ticket(customerId,...) |
+------------------------------------+    +-----------------------------------------+
           │                                                        │
           └──────────────────────────┬─────────────────────────────┘
                                      ▼
+-----------------------------------------------------------------------------------+
|                   GROUNDED LLM GENERATION & CITATION FORMATTER                    |
|  - Kiểm soát chống ảo giác (Zero Hallucination Guarantee)                          |
|  - Định dạng trích dẫn chuẩn: [Nguồn: Văn bản, Điều/Mục, Ngày hiệu lực]          |
|  - Ghi nhận vi độ trễ (Telemetry Latency Breakdown ms)                           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Chi tiết RAG Pipeline

Pipeline RAG được hiện thực bằng thuật toán tính toán thời gian thực:
1. **Ingest & Chunking**: Chia nhỏ 8 tài liệu gốc thành các đoạn văn bản (Chunks), lưu giữ metadata tiêu đề mục (`sectionHeading`), mã văn bản (`docCode`), ngày hiệu lực (`effectiveDate`).
2. **BM25 Inverted Indexing**: Xây dựng bảng tra cứu từ vựng tiếng Việt, tính $TF$, $DF$, $IDF$ và chuẩn hóa theo độ dài trung bình $avgdl$.
3. **Vector Semantic Embedding**: Ánh xạ văn bản vào không gian vector 128 chiều L2-normalized.
4. **Dual Retrieval**: Chạy song song BM25 và Cosine Similarity để lấy Top-10 ứng viên mỗi nhánh.
5. **Rank Fusion (RRF)**: Dung hòa thứ hạng với hằng số $k=60$.
6. **2D PCA Projection**: Giảm chiều từ 128D về 2D bằng thuật toán Phân tích Thành phần Chính (PCA) để vẽ biểu đồ phân tán tương tác.
7. **Reranking**: Chấm điểm lại Top-K ứng viên dựa trên mật độ cụm từ khóa và độ khớp tiêu đề điều khoản.
8. **Generation**: Đưa ngữ cảnh cô đọng vào LLM kèm trích dẫn nguồn.

---

## 3. Kiến trúc AI Agent & Tool Calling

Sử dụng mô hình **ReAct (Reasoning + Acting)** chuẩn mực:
* **Thought**: LLM phân tích câu hỏi của khách hàng và quyết định xem cần gọi công cụ nào và truyền tham số gì (JSON Schema).
* **Action**: Thực thi mock API (ví dụ: `get_current_bill(customerId='PE01000123456')`) với độ trễ mạng mô phỏng (80-180ms).
* **Observation**: Đọc kết quả JSON trả về từ backend EVN.
* **Secondary Action (nếu là Type 3)**: Nhận thấy thời gian mất điện > 8 giờ, kích hoạt tiếp bước RAG tra cứu chính sách bồi thường `QĐ-07/2024/BTTH-EVN`.
* **Synthesis**: Tổng hợp toàn bộ dữ liệu thành câu trả lời hoàn chỉnh.

---

## 4. Cắt đoạn Văn bản Động (Sentence-Aware Chunking Engine)

* Triển khai trong [`src/services/chunker.ts`](src/services/chunker.ts).
* Thuật toán phân đoạn tôn trọng ranh giới câu (`. `) và xuống dòng (`\n`), tránh cắt ngang từ ngữ hoặc cụm từ có nghĩa.
* Người dùng có thể kéo trực tiếp thanh trượt **`chunk_size`** (150 - 800 ký tự) và **`overlap`** (0 - 200 ký tự) trên Sidebar. Hệ thống sẽ tự động re-chunk và re-index toàn bộ dữ liệu ngay lập tức.

---

## 5. Không gian Vector & Nhúng Ngữ nghĩa

* Triển khai trong [`src/services/vectorStore.ts`](src/services/vectorStore.ts).
* Vector embedding 128 chiều tích hợp các điểm neo khái niệm ngữ nghĩa chuyên ngành điện lực (an toàn, điện áp bước, sự cố lưới, biểu giá lũy tiến, bồi thường mất điện...).
* Công thức tính Cosine Similarity:
  $$\text{CosineSim}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\|_2 \|\vec{v}\|_2}$$
* Do các vector đều được L2-normalize ($\|\vec{u}\|_2 = 1.0$), tích vô hướng chính là Cosine Similarity, đem lại tốc độ xử lý tức thì.

---

## 6. Chỉ mục Vector & Chiếu Không gian 2D PCA

* Triển khai trong [`src/services/pca.ts`](src/services/pca.ts).
* Thuật toán Principal Component Analysis (PCA) thực hiện:
  1. Tính vector trung bình $\vec{\mu} = \frac{1}{N} \sum \vec{x}_i$.
  2. Khử trung bình (Mean-centering): $X_c = X - \vec{\mu}$.
  3. Tìm vector riêng thứ nhất $\vec{v}_1$ bằng thuật toán Power Iteration.
  4. Trực giao hóa (Deflation) để tìm vector riêng thứ hai $\vec{v}_2$.
  5. Chiếu tất cả vector chunks và vector câu hỏi lên $(\vec{v}_1, \vec{v}_2)$ và ánh xạ về tọa độ phần trăm viewport $[5\%, 95\%]$.
* Biểu đồ phân tán (2D Scatter Plot) tương tác hiển thị rõ ràng cụm ngữ nghĩa và khoảng cách giữa câu hỏi với các đoạn tài liệu được chọn.

---

## 7. Truy xuất Lai BM25 + Vector

* Triển khai trong [`src/services/bm25.ts`](src/services/bm25.ts).
* Công thức BM25Okapi chuẩn mực:
  $$\text{Score}(D, Q) = \sum_{q_i \in Q} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$
  * $k_1 = 1.5, b = 0.75$.
  * Bộ tách từ tiếng Việt tự động loại bỏ hư từ (stopwords), tách unigram và n-gram chuyên môn.

---

## 8. Hợp nhất Thứ hạng RRF

* Triển khai trong [`src/services/rrf.ts`](src/services/rrf.ts).
* Công thức Reciprocal Rank Fusion:
  $$\text{RRF\_Score}(d) = \frac{1}{k + \text{rank}_{\text{BM25}}(d)} + \frac{1}{k + \text{rank}_{\text{Vector}}(d)} \quad (k = 60)$$
* Bảng so sánh Under-the-Hood hiển thị điểm BM25, điểm Vector Cosine và điểm RRF tổng hợp cho từng chunk.

---

## 9. Tái Xếp Hạng Ngữ Cảnh (Contextual Reranking)

* Triển khai trong [`src/services/reranker.ts`](src/services/reranker.ts).
* Chấm điểm tương quan chéo (Cross-Score) dựa trên:
  * Mật độ khớp cụm từ liên tiếp (N-gram phrase density).
  * Độ khớp tiêu đề điều khoản quy chuẩn.
  * Độ khớp các số liệu và đơn vị (ví dụ: `10 mét`, `150.000đ`, `250 kWh`).
* Bảng Under-the-Hood hiển thị rõ thứ hạng ban đầu, thứ hạng mới và độ dịch chuyển $\Delta$ (+1, -1, 0) kèm lý do kỹ thuật.

---

## 10. Điều phối & Nhận diện Ý định (Agent Routing)

* Triển khai trong [`src/services/agentEngine.ts`](src/services/agentEngine.ts).
* Bộ phân loại phân tích câu hỏi và điều phối chính xác về một trong 4 loại nghiệp vụ:
  * **`TYPE_1_RAG_ONLY`**: Tra cứu quy định, an toàn, biểu giá $\rightarrow$ Chỉ kích hoạt RAG Pipeline.
  * **`TYPE_2_TOOL_ONLY`**: Tra cứu tiền điện, công tơ, lịch sử thanh toán $\rightarrow$ Gọi API khách hàng.
  * **`TYPE_3_MULTI_STEP`**: Lịch cắt điện + bồi thường $\rightarrow$ Gọi API kiểm tra lịch $\rightarrow$ Kích hoạt RAG lấy chính sách bồi thường $\rightarrow$ Tổng hợp.
  * **`TYPE_4_OUT_OF_SCOPE`**: Cổ phiếu, vay vốn, giá vàng $\rightarrow$ Từ chối lịch sự, kích hoạt nút **Gọi 19001909** (Human Handoff).

---

## 11. Sinh Phản hồi & Trích dẫn Minh bạch

* Triển khai trong [`src/services/llmService.ts`](src/services/llmService.ts).
* System Prompt chỉ thị LLM chỉ được trả lời dựa trên ngữ cảnh đã xác thực (Grounded Context).
* Mọi câu trả lời đều đính kèm trích dẫn văn bản pháp lý chính xác:
  `[Nguồn: Quy chuẩn An toàn điện ATĐ-01/2025, Điều 2: Xử lý đứt dây, Hiệu lực: 01/01/2025]`.

---

## 12. Hiện thực 4 Luồng Nghiệp vụ Chuẩn

| Loại Truy Vấn | Câu Hỏi Mẫu | Hành Vi Pipeline | Nguồn Dữ Liệu |
|---|---|---|---|
| **Type 1: Quy định / Biểu giá (Pure RAG)** | *"Khi phát hiện dây điện đứt rơi xuống đất, tôi cần làm gì?"* hoặc *"Biểu giá điện 6 bậc thang tính như thế nào?"* | • Không gọi Tool cá nhân.<br>• BM25 + Vector $\rightarrow$ RRF $\rightarrow$ Rerank $\rightarrow$ LLM.<br>• Trích dẫn điều 2 ATĐ-01/2025 (khoảng cách 10m). | 8 Văn bản nội bộ EVN (`documents.json`) |
| **Type 2: Dữ liệu Khách hàng (Pure Tool)** | *"Kiểm tra giúp tôi hóa đơn tiền điện tháng này của mã KH PE01000123456 là bao nhiêu?"* | • Agent phát hiện cần dữ liệu cá nhân.<br>• Gọi `get_current_bill(customerId='PE01000123456')`.<br>• Trả lời: 285 kWh, 715.662đ, Chưa thanh toán. | Mock API Backend (`customers.json`) |
| **Type 3: Đa bước (RAG + Tool)** | *"Khu vực của tôi (PE01000123456) tuần này có bị cắt điện bảo trì không? Nếu có thì tôi được hỗ trợ bồi thường gì?"* | • **Bước 1**: Gọi `check_maintenance_outage` $\rightarrow$ Phát hiện cắt điện 14 giờ vào Thứ Bảy.<br>• **Bước 2**: Tự động gọi RAG tra cứu `QĐ-07/2024/BTTH-EVN`.<br>• **Bước 3**: Tổng hợp trả lời giảm 10% tiền điện Bậc 1. | Tool API + RAG Document `BTTH-07/2024` |
| **Type 4: Ngoài phạm vi (Guardrail)** | *"Tôi muốn mua cổ phiếu EVN hoặc vay vốn tín chấp qua hợp đồng điện lực"* | • Độ tương đồng thấp & ngoài thẩm quyền.<br>• Từ chối lịch sự, chống ảo giác.<br>• Hiển thị nút **Chuyển tiếp Tổng đài 19001909 (Human Handoff)**. | Guardrail Engine + Hotline Modal |

---

## 13. Cấu trúc Thư mục Dự án

```
d:/BT_RAG_LLM/
├── index.html                   # HTML template với Inter & JetBrains Mono fonts
├── package.json                 # Cấu hình dự án React 19 + TypeScript + Vite + Tailwind
├── postcss.config.js
├── tailwind.config.js           # Theme màu Enterprise: Copper (Cam) & Cyan (Xanh điện)
├── tsconfig.json
├── vite.config.ts               # Vite bundler config (port 3000)
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Master application container
│   ├── index.css                # Custom CSS tokens, scrollbars, electric glow
│   ├── types/
│   │   └── index.ts             # Toàn bộ Type definitions (Document, Chunk, BM25, RRF, PCA, Agent)
│   ├── data/
│   │   ├── documents.json       # 8 bộ văn bản quy chuẩn, biểu giá, bồi thường chuẩn hóa
│   │   ├── customers.json       # 4 hồ sơ khách hàng EVN demo (PE01... đến PE04...)
│   │   └── prompts.json         # Danh sách câu hỏi mẫu cho 4 loại truy vấn
│   ├── services/
│   │   ├── chunker.ts           # Thuật toán cắt đoạn Sentence-aware
│   │   ├── bm25.ts              # Thuật toán BM25Okapi tiếng Việt
│   │   ├── vectorStore.ts       # Vector Embedding 128D & Cosine Similarity
│   │   ├── pca.ts               # Thuật toán giảm chiều PCA 2D
│   │   ├── rrf.ts               # Thuật toán Reciprocal Rank Fusion (k=60)
│   │   ├── reranker.ts          # Cross-scoring Contextual Reranker
│   │   ├── tools.ts             # Mock EVN Customer APIs & Tool Schemas
│   │   ├── agentEngine.ts       # ReAct Loop, Intent Router, Telemetry Timing
│   │   ├── llmService.ts        # Built-in Grounded Generator & OpenAI/Claude Integration
│   │   └── ragPipeline.ts       # Global RAG Pipeline Coordinator & Live Re-indexer
│   └── components/
│       ├── common/
│       │   ├── Header.tsx       # Header với Dual Mode Switch, Tabs, Dark/Light toggle
│       │   ├── SettingsModal.tsx# Cài đặt API key & Live Chunking Sliders
│       │   └── HumanHandoffModal.tsx # Modal chuyển tiếp tổng đài 19001909
│       ├── sidebar/
│       │   ├── CustomerSelector.tsx      # Chuyển đổi hồ sơ khách hàng demo
│       │   ├── KnowledgeBaseExplorer.tsx # Xem 8 tài liệu gốc & danh sách chunks
│       │   └── ChunkingConfigPanel.tsx   # Tinh chỉnh chunk_size & overlap trực tiếp
│       ├── chat/
│       │   ├── ChatArea.tsx              # Khung chat chính với auto-scroll
│       │   ├── MessageItem.tsx           # Tin nhắn với Dual Mode inspector & citations
│       │   └── QuickPrompts.tsx          # Quick-reply chips cho 4 loại câu hỏi
│       ├── underTheHood/
│       │   ├── UnderTheHoodPanel.tsx     # Master Inspector panel
│       │   ├── PipelineStageMetrics.tsx  # Bảng đo thời gian (Latency ms)
│       │   ├── HybridComparisonTable.tsx # Bảng so sánh BM25 vs Vector vs RRF
│       │   ├── VectorSpace2DPlot.tsx     # Biểu đồ phân tán 2D PCA Vector Space
│       │   ├── RerankDeltaView.tsx       # Bảng biến thiên thứ hạng Reranking
│       │   ├── AgentTraceViewer.tsx      # Trực quan hóa vòng lặp ReAct Agent
│       │   ├── GroundingCitationsView.tsx# Trích dẫn nguồn & Raw Context
│       │   └── EducationalBanner.tsx     # Banner giải thích kiến thức tiếng Việt
│       └── tabs/
│           ├── ArchitectureTab.tsx       # Sơ đồ tương tác 8 bước Ingest -> Cite
│           ├── RagComparisonTab.tsx      # So sánh 3 chế độ (No-RAG vs RAG vs RAG+Agent)
│           └── MonitoringDashboardTab.tsx# Dashboard giám sát vận hành & Groundedness
└── README.md
```

---

## 14. Hướng dẫn Cài đặt & Chạy Local

### Yêu cầu Môi trường:
* **Node.js**: Phiên bản 18.x trở lên (khuyên dùng Node 20.x hoặc 22.x).
* **NPM**: Phiên bản 9.x trở lên.

### Các bước chạy:
```bash
# 1. Clone hoặc chuyển vào thư mục dự án
cd d:/BT_RAG_LLM

# 2. Cài đặt các thư viện phụ thuộc (Dependencies)
npm install

# 3. Khởi chạy Development Server
npm run dev

# 4. Mở trình duyệt tại địa chỉ:
http://localhost:3000/
```

---

## 15. Cấu hình Khóa API & Biến Môi trường

Ứng dụng được thiết kế sẵn chế độ **Local High-Fidelity Simulator** hoạt động **100% offline ngay lập tức mà không bắt buộc phải có API Key hay tốn chi phí**.

Nếu muốn thử nghiệm gọi trực tiếp mô hình ngôn ngữ đám mây (OpenAI GPT-4o / Claude 3.5 / Gemini 1.5):
1. Nhấn vào biểu tượng **Bánh răng (Cài đặt)** ở góc trên bên phải thanh Header.
2. Chọn nhà cung cấp: **OpenAI API (GPT-4o)**.
3. Nhập khóa `sk-proj-...` của bạn.
4. Nhấn **Lưu thay đổi**. Khóa API chỉ lưu cục bộ trong bộ nhớ trình duyệt (session memory), tuyệt đối không gửi ra ngoài.

---

## 16. Hướng dẫn Thay thế Bộ Tài liệu Thật

Để đưa các tài liệu quy định thực tế của công ty vào hệ thống:
1. Mở file [`src/data/documents.json`](src/data/documents.json).
2. Thêm hoặc sửa đổi đối tượng tài liệu theo cấu trúc chuẩn:
```json
{
  "id": "doc-09",
  "docCode": "QĐ-09/2026/...",
  "title": "Tên văn bản quy định mới",
  "department": "Ban Kỹ thuật / Ban Kinh doanh",
  "effectiveDate": "01/01/2026",
  "docType": "Quy chế nội bộ",
  "category": "Kinh doanh điện lực",
  "summary": "Tóm tắt ngắn gọn nội dung văn bản",
  "content": "Toàn văn nội dung tài liệu...",
  "sections": [
    {
      "heading": "Điều 1: Phạm vi điều chỉnh",
      "text": "Nội dung chi tiết của điều 1..."
    }
  ]
}
```
3. Lưu file, hệ thống sẽ tự động nạp và lập chỉ mục lại toàn bộ kho tri thức.

---

## 17. Hướng dẫn Thay thế Mock Tools bằng API Thật

Trong môi trường Production, để kết nối với hệ thống Core Billing, Hệ thống Đo xa (AMR/AMI) và Hệ thống Quản lý Mất điện (OMS) của EVN:
1. Mở file [`src/services/tools.ts`](src/services/tools.ts).
2. Thay thế logic trong hàm `executeTool`:
```typescript
case 'get_current_bill': {
  // Thay bằng lệnh gọi REST API thật đến EVN Core Billing Service
  const response = await fetch(`https://api.cskh.evn.com.vn/v1/bills?customerId=${customerId}`, {
    headers: { 'Authorization': `Bearer ${process.env.EVN_API_TOKEN}` }
  });
  const data = await response.json();
  return { success: true, data, message: `Truy xuất hóa đơn kỳ ${data.month}` };
}
```

---

## 18. Hướng dẫn Tích hợp Vector DB & Production Reranker

Khi quy mô tri thức tăng lên hàng trăm nghìn tài liệu PDF:
* **Vector Database Chuyên dụng**:
  * Thay thế `VectorStore` in-memory bằng kết nối **Qdrant / Milvus / Pinecone / pgvector (PostgreSQL)**.
  * Vector Embedding: Sử dụng mô hình `text-embedding-3-small` của OpenAI hoặc `bge-m3` hỗ trợ tiếng Việt sâu sắc.
* **Production Cross-Encoder Reranker**:
  * Tích hợp **Cohere Rerank API (`rerank-v3.5`)** hoặc mô hình `BAAI/bge-reranker-v2-m3` tự host trên Kubernetes để đạt độ chính xác tối đa ở bước Reranking.

---

## 19. Lý do Lựa chọn Kiến trúc & Đánh giá Đánh đổi

### Tại sao chọn Client-Side Hybrid Execution?
1. **Mục tiêu Giáo dục & Minh bạch**: Kỹ sư có thể mở Developer Tools hoặc Under-the-Hood Inspector để trực tiếp quan sát ma trận điểm số, mảng vector 128D, thuật toán PCA 2D và bảng hợp nhất RRF hoạt động theo thời gian thực mà không bị giấu kín sau một hộp đen (blackbox backend).
2. **Khả năng Tương tác Trực tiếp (Realtime Interactivity)**: Việc thay đổi `chunk_size` và `overlap` trên Sidebar cho phép tính toán lại và vẽ lại biểu đồ vector không gian 2D ngay lập tức trong vài mili-giây.
3. **Zero Configuration & Instant Demo**: Dự án chạy được ngay lập tức trên máy tính của bất kỳ ai chỉ với lệnh `npm install && npm run dev`, không cần cài đặt Docker database hay cấu hình các biến môi trường phức tạp khi thuyết trình trước ban giám đốc.
4. **Sẵn sàng Chuyển đổi Production (Production-Ready Code)**: Cấu trúc dịch vụ (`services/chunker.ts`, `services/bm25.ts`, `services/vectorStore.ts`, `services/agentEngine.ts`) được đóng gói theo mô hình lớp (Clean Architecture), giúp đội ngũ kỹ sư có thể bóc tách thành các Microservices backend (Python FastAPI / Java Spring Boot) trong vòng chưa đầy 1 ngày làm việc.

---
*Phát triển bởi Đội ngũ Kỹ sư Trợ lý Ảo AI EVN — Sẵn sàng cho Kỷ nguyên Chuyển đổi Số Ngành Điện lực.*
