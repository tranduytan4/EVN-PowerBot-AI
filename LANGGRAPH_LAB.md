# EVN PowerBot AI — Hướng dẫn Toàn diện LangGraph Learning Lab

Tài liệu này cung cấp kiến thức nền tảng và hướng dẫn thực hành chuyên sâu về **LangGraph** thông qua hệ thống thực tế **EVN PowerBot AI LangGraph Learning Lab** chạy trên **Python StateGraph Runtime**.

---

## 📑 Mục Lục
1. [LangGraph là gì?](#1-langgraph-là-gì)
2. [Tại sao chọn LangGraph thay vì LangChain Chains truyền thống?](#2-tại-sao-chọn-langgraph)
3. [Khái niệm Cốt lõi: State (Trạng thái Trung tâm)](#3-khái-niệm-cốt-lõi-state)
4. [Nodes & Edges (Nút và Cung kết nối)](#4-nodes--edges)
5. [Conditional Edges & Routing (Định tuyến có điều kiện)](#5-conditional-edges--routing)
6. [Tool Calling trong LangGraph (@tool)](#6-tool-calling-trong-langgraph)
7. [Tích hợp RAG như một Node / Tool](#7-tích-hợp-rag-như-một-node--tool)
8. [Vòng lặp Tự sửa sai (Self-Correction Retry Loop)](#8-vòng-lặp-tự-sửa-sai)
9. [Lưu trữ Trạng thái Bền vững (Persistence & Checkpointing với Thread ID)](#9-lưu-trữ-trạng-thái-bền-vững)
10. [Cơ chế Human-in-the-loop (Interrupt & Resume)](#10-cơ-chế-human-in-the-loop)
11. [So sánh: LangChain Chains vs LangGraph](#11-so-sánh-langchain-chains-vs-langgraph)
12. [Kiến trúc Tổng quan Hệ thống Lab](#12-kiến-trúc-tổng-quan-hệ-thống-lab)
13. [Hướng dẫn Khởi chạy Local (Backend & Frontend)](#13-hướng-dẫn-khởi-chạy-local)
14. [6 Kịch bản Thực nghiệm Mẫu (Quick Test Scenarios)](#14-6-kịch-bản-thực-nghiệm-mẫu)
15. [Hướng dẫn Đọc Vết Thực thi (Execution Trace) & State Diffs](#15-hướng-dẫn-đọc-vết-thực-thi)
16. [Giải thích Chi tiết Mã nguồn Cốt lõi](#16-giải-thích-chi-tiết-mã-nguồn-cốt-lõi)

---

## 1. LangGraph là gì?

**LangGraph** là một thư viện mở rộng mạnh mẽ của hệ sinh thái LangChain, được thiết kế chuyên biệt để xây dựng các **Hệ thống AI Agent Đa tác nhân (Multi-Agent Systems)** và các **Quy trình làm việc Trạng thái (Stateful Multi-step Workflows)**.

Khác với các chuỗi xử lý tuyến tính thông thường, LangGraph mô hình hóa luồng xử lý dưới dạng một **Đồ thị Trạng thái (State Machine / Cyclic Graph)**, cho phép:
* Tạo các vòng lặp tự sửa sai (*Feedback Loops / Retries*).
* Quản lý trạng thái chia sẻ (*Shared Global State*) an toàn.
* Tạm dừng đồ thị tại các điểm nhạy cảm chờ con người phê duyệt (*Human-in-the-loop*).
* Lưu vết và khôi phục trạng thái (*Persistence & Time-travel*).

---

## 2. Tại sao chọn LangGraph?

Trong bài toán trợ lý ảo ngành điện **EVN PowerBot AI**, nghiệp vụ không chỉ dừng lại ở việc hỏi đáp đơn giản (Single-turn QA), mà đòi hỏi:
1. **Phân loại ý định đa dạng**: Tra cứu quy chuẩn, tra cứu chỉ số công tơ, tính tiền điện lũy tiến 6 bậc, kiểm tra lịch cắt điện.
2. **Suy luận đa bước (Agentic RAG)**: Khi khách hàng hỏi về mất điện $\rightarrow$ Kiểm tra hệ thống thấy mất 14 giờ $\rightarrow$ Tự động rẽ nhánh tra cứu chính sách bồi thường QĐ-07/2024/BTTH-EVN $\rightarrow$ Tổng hợp quyền lợi.
3. **Độ chính xác tính toán tuyệt đối**: Việc tính tiền điện 6 bậc thang phải do code Python thực thi, không để LLM tự tính để tránh nhầm lẫn số học.
4. **An toàn kiểm soát**: Các hành động như *Xuất lệnh phúc tra công tơ tại hiện trường* bắt buộc phải có sự xác nhận của Quản trị viên trước khi phát hành phiếu công tác.

LangGraph cung cấp nền tảng chuẩn mực và mạnh mẽ nhất để hiện thực hóa các yêu cầu trên.

---

## 3. Khái niệm Cốt lõi: State

Trong LangGraph, **State** là nguồn chân lý duy nhất (*Single Source of Truth*) được truyền qua từng Node. Trong dự án, `AgentState` được định nghĩa trong [`langgraph_lab/app/state.py`](file:///d:/BT_RAG_LLM/langgraph_lab/app/state.py):

```python
class AgentState(TypedDict, total=False):
    question: str
    thread_id: str
    intent: Optional[str]            # DOCUMENT_QUERY, CUSTOMER_LOOKUP, BILL_CALCULATION, ...
    customer_id: Optional[str]       # PE01000123456
    kwh: Optional[float]             # 450.0
    selected_tool: Optional[str]     # tinh_hoa_don_tien_dien
    tool_input: Optional[dict]
    tool_output: Optional[dict]
    retrieved_documents: list[dict]  # Kết quả từ documents.json
    citations: list[dict]
    needs_compensation_rag: bool     # Cờ kích hoạt Agentic RAG
    needs_retry: bool                # Cờ kích hoạt Retry Loop
    requires_human: bool             # Cờ kích hoạt Interrupt
    approved: Optional[bool]         # Quyết định từ con người (True/False)
    inspection_request: Optional[dict]
    retry_count: int
    max_retries: int
    answer: Optional[str]
    confidence: Optional[float]
    execution_status: str
    trace: list[dict]                # Vết thực thi chi tiết
```

> [!NOTE]
> Mỗi Node trong LangGraph nhận toàn bộ `state` làm tham số đầu vào và chỉ trả về một dictionary chứa **phần thay đổi (State Delta)**. LangGraph sẽ tự động hợp nhất Delta này vào State chung.

---

## 4. Nodes & Edges

* **Node**: Là một hàm Python nhận `state: AgentState` và trả về một phần cập nhật State.
* **Edge**: Định nghĩa cung nối trực tiếp giữa Node nguồn và Node đích.

Ví dụ trong [`langgraph_lab/app/graph.py`](file:///d:/BT_RAG_LLM/langgraph_lab/app/graph.py):
```python
builder = StateGraph(AgentState)

# Đăng ký các Node
builder.add_node("analyze_question", analyze_question)
builder.add_node("search_rag", search_rag)
builder.add_node("generate_answer", generate_answer)

# Cung nối cố định
builder.add_edge(START, "analyze_question")
builder.add_edge("generate_answer", END)
```

---

## 5. Conditional Edges & Routing

**Conditional Edge** cho phép đồ thị rẽ nhánh động dựa trên kết quả trả về từ một hàm định tuyến (*Router Function*).

```python
def route_question(state: AgentState) -> str:
    intent = state.get("intent")
    if intent == "DOCUMENT_QUERY":
        return "search_rag"
    elif intent == "CUSTOMER_LOOKUP":
        return "customer_lookup"
    elif intent == "BILL_CALCULATION":
        return "calculate_bill"
    elif intent == "OUTAGE_QUERY":
        return "check_outage"
    elif intent == "INSPECTION_REQUEST":
        return "prepare_inspection"
    else:
        return "generate_answer"

# Khai báo Conditional Edge
builder.add_conditional_edges(
    "analyze_question",
    route_question,
    {
        "search_rag": "search_rag",
        "customer_lookup": "customer_lookup",
        "calculate_bill": "calculate_bill",
        "check_outage": "check_outage",
        "prepare_inspection": "prepare_inspection",
        "generate_answer": "generate_answer"
    }
)
```

---

## 6. Tool Calling trong LangGraph

Các công cụ được định nghĩa bằng decorator `@tool` trong LangChain ([`langgraph_lab/app/tools.py`](file:///d:/BT_RAG_LLM/langgraph_lab/app/tools.py)):

```python
@tool
def tinh_hoa_don_tien_dien(kwh: float) -> dict:
    """Tính tiền điện sinh hoạt 6 bậc thang lũy tiến theo QĐ-05/2024/BG-BCT."""
    # Logic tính toán chính xác bằng Python code
    ...
```

Khi một Node cần gọi công cụ, Node đó gọi phương thức `.invoke()` của Tool:
```python
def calculate_bill(state: AgentState) -> dict:
    kwh = state.get("kwh", 450.0)
    res = tinh_hoa_don_tien_dien.invoke({"kwh": kwh})
    return {
        "selected_tool": "tinh_hoa_don_tien_dien",
        "tool_output": res
    }
```

---

## 7. Tích hợp RAG như một Node / Tool

Trong LangGraph, RAG không chỉ là một chuỗi cố định mà có thể được triệu gọi linh hoạt:
1. **Gọi đơn lẻ**: Khi câu hỏi là hỏi đáp chính sách chung (`DOCUMENT_QUERY`).
2. **Gọi đa bước (Agentic RAG)**: Sau khi gọi Tool `check_outage` phát hiện mất điện 14 giờ $\rightarrow$ Node `evaluate_result` nhận diện cần đối chiếu bồi thường $\rightarrow$ Điều hướng tiếp sang Node `search_rag` để tìm văn bản `QĐ-07/2024/BTTH-EVN`.

---

## 8. Vòng lặp Tự sửa sai (Self-Correction Retry Loop)

LangGraph hỗ trợ tạo chu trình quay ngược tự nhiên:

```
search_rag ──> evaluate_result
                     │ (Thiếu tài liệu & retry_count < 2)
                     ▼
               rewrite_query ──> search_rag (Loop Back)
```

Cấu hình trong `graph.py`:
```python
# Cung nối lặp từ rewrite_query quay lại search_rag
builder.add_edge("rewrite_query", "search_rag")
```

---

## 9. Lưu trữ Trạng thái Bền vững (Persistence & Checkpointing)

LangGraph tích hợp sẵn `MemorySaver` (hoặc `SqliteSaver`):
* Mỗi phiên làm việc được định danh bằng một `thread_id` (ví dụ: `thread-a1b2c3`).
* Sau mỗi Node hoàn thành, toàn bộ State được tự động snapshot vào Checkpointer.
* Có thể truy vấn trạng thái hiện tại hoặc lịch sử trạng thái của bất kỳ thread nào qua API:
  `GET /api/langgraph/state/{thread_id}`

---

## 10. Cơ chế Human-in-the-loop (Interrupt & Resume)

Khi quy trình yêu cầu sự phê duyệt từ con người (ví dụ: *Xuất lệnh phúc tra công tơ điện*):

1. Khi biên dịch đồ thị, thiết lập `interrupt_before=["human_approval"]`:
   ```python
   graph = builder.compile(
       checkpointer=checkpointer,
       interrupt_before=["human_approval"]
   )
   ```
2. Đồ thị tự động tạm dừng trước khi thực thi Node `human_approval`, trả trạng thái `PAUSED` cho UI.
3. Người dùng trên UI xem chi tiết phiếu công tác và bấm **Phê duyệt** hoặc **Từ chối**.
4. UI gửi request `POST /api/langgraph/resume`:
   ```python
   # Cập nhật quyết định của người dùng vào state
   graph.update_state(config, {"approved": True}, as_node="prepare_inspection")
   # Tiếp tục chạy từ điểm tạm dừng
   result = graph.invoke(None, config=config)
   ```

---

## 11. So sánh: LangChain Chains vs LangGraph

| Tiêu Chí | LangChain Chains | LangGraph StateGraph |
|---|---|---|
| **Cấu trúc Đồ thị** | Chỉ hỗ trợ DAG 1 chiều tuyến tính | Hỗ trợ Đồ thị trạng thái có chu trình (Cyclic Graphs) |
| **Quản lý State** | State rời rạc, khó theo dõi biến đổi | `AgentState` tập trung, chuẩn hóa qua TypedDict |
| **Vòng lặp & Thử lại** | Rất khó cấu hình, dễ gây loop vô hạn | Tự nhiên, an toàn với biến đếm `retry_count` |
| **Human-in-the-loop** | Phải tự code thủ công ngoài chain | Tích hợp sẵn `interrupt_before` & `update_state` |
| **Persistence / Time Travel** | Không có sẵn theo từng Node | Tích hợp sẵn qua Checkpointers (Memory/SQLite) |

---

## 12. Kiến trúc Tổng quan Hệ thống Lab

```text
d:/BT_RAG_LLM/
├── src/
│   ├── types/index.ts                           # Định nghĩa types mở rộng cho LangGraph Lab
│   ├── App.tsx                                  # Tích hợp tab 'langgraph'
│   └── components/
│       ├── common/Header.tsx                    # Thêm nút điều hướng '⚡ LangGraph Lab'
│       ├── tabs/LangGraphLabTab.tsx             # Master Container của Lab
│       └── langgraph/
│           ├── QuickScenariosBar.tsx            # Thanh 6 kịch bản thử nghiệm nhanh
│           ├── LiveGraphView.tsx                # Sơ đồ tương tác StateGraph theo thời gian thực
│           ├── ExecutionTraceTimeline.tsx       # Dòng thời gian vết thực thi chi tiết
│           ├── StateDiffInspector.tsx           # Thanh tra State & Snapshot từng bước
│           ├── ToolCallInspector.tsx            # Thanh tra Tool, Tham số & Observation
│           ├── HumanApprovalPrompt.tsx          # Card tương tác Human-in-the-loop Interrupt
│           ├── EducationPanel.tsx               # Giải thích cơ chế kỹ thuật ("What just happened?")
│           ├── SourceCodeBrowser.tsx            # Trình duyệt mã nguồn Python trực tiếp
│           └── ArchitectureDiagram.tsx          # Sơ đồ kiến trúc phân tầng
│
└── langgraph_lab/                               # Module Python Backend độc lập
    ├── app/
    │   ├── state.py                             # AgentState TypedDict
    │   ├── tools.py                             # @tool LangChain (RAG, Billing, Outage, CRM)
    │   ├── retriever.py                         # Adapter nạp documents.json cho Python RAG
    │   ├── nodes.py                             # 7 Node logic & hàm điều phối
    │   ├── graph.py                             # StateGraph compilation & MemorySaver
    │   ├── checkpoints.py                       # Helper trích xuất State snapshot
    │   ├── llm.py                               # Grounded generator & OpenAI integration
    │   ├── models.py                            # Pydantic schemas cho API
    │   └── main.py                              # FastAPI REST Server (Port 8000)
    ├── tests/
    │   └── test_lab.py                          # 8 Unit/Integration tests Pytest
    ├── requirements.txt
    └── .env.example
```

---

## 13. Hướng dẫn Khởi chạy Local

### Bước 1: Khởi động Backend Python LangGraph:
```bash
cd d:/BT_RAG_LLM/langgraph_lab
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend API sẽ chạy tại: `http://127.0.0.1:8000`
* Swagger Docs: `http://127.0.0.1:8000/docs`

### Bước 2: Khởi động Frontend React:
```bash
cd d:/BT_RAG_LLM
npm run dev
```
* Mở trình duyệt tại: `http://localhost:3000`
* Chọn tab **⚡ LangGraph Lab** trên thanh Header.

---

## 14. 6 Kịch bản Thực nghiệm Mẫu

| Kịch Bản | Câu Hỏi Mẫu | Luồng Thực Thi LangGraph Mong Đợi |
|---|---|---|
| **1. Pure RAG** | *"Khi phát hiện dây điện đứt rơi xuống đất, người dân cần làm gì?"* | `START` $\rightarrow$ `analyze_question` $\rightarrow$ `search_rag` $\rightarrow$ `evaluate_result` $\rightarrow$ `generate_answer` $\rightarrow$ `END`. (Trích dẫn ATĐ-01/2025: 10 mét). |
| **2. Customer Lookup** | *"Kiểm tra chỉ số công tơ tháng này của PE01000123456"* | `START` $\rightarrow$ `analyze_question` $\rightarrow$ `customer_lookup` (`tra_cuu_chi_so_dien`) $\rightarrow$ `evaluate_result` $\rightarrow$ `generate_answer` $\rightarrow$ `END`. |
| **3. Calculator** | *"450 kWh điện sinh hoạt hết bao nhiêu tiền?"* | `START` $\rightarrow$ `analyze_question` $\rightarrow$ `calculate_bill` (`tinh_hoa_don_tien_dien`) $\rightarrow$ `evaluate_result` $\rightarrow$ `generate_answer` $\rightarrow$ `END`. (Bảng 6 bậc thang). |
| **4. Agentic RAG** | *"PE01000123456 có bị cắt điện 14h không? Được bồi thường gì?"* | `START` $\rightarrow$ `analyze` $\rightarrow$ `check_outage` (14h) $\rightarrow$ `evaluate` (Phát hiện > 8h) $\rightarrow$ `search_rag` (QĐ-07) $\rightarrow$ `generate_answer` (Giảm 10% Bậc 1). |
| **5. Human Approval** | *"Tôi muốn yêu cầu phúc tra kiểm tra công tơ cho PE01000123456"* | `START` $\rightarrow$ `analyze` $\rightarrow$ `prepare_inspection` $\rightarrow$ **`⏸ INTERRUPT`** $\rightarrow$ Người dùng bấm **Approve** $\rightarrow$ `execute_approved_request` $\rightarrow$ `generate_answer`. |
| **6. Guardrail Check** | *"Tôi muốn mua cổ phiếu EVN hoặc vay vốn ngân hàng"* | `START` $\rightarrow$ `analyze_question` (OUT_OF_SCOPE) $\rightarrow$ `generate_answer` (Từ chối an toàn & Human Handoff 19001909). |

---

## 15. Hướng dẫn Đọc Vết Thực thi & State Diffs

1. **Live Graph View**: Quan sát node nào phát sáng màu xanh lá (đã hoàn thành) hoặc màu đỏ nhấp nháy (đang tạm dừng chờ duyệt).
2. **Execution Trace Timeline**: Nhấp vào từng bước để xem chính xác:
   * Thời gian thực thi (Latency ms).
   * Input State Snapshot tại thời điểm bước đó bắt đầu.
   * Output State Delta (những trường dữ liệu mới được thêm vào State).
   * Dữ liệu Tool gọi và Observation nhận về.
   * Ghi chú giải thích cơ chế kỹ thuật ("What just happened?").
3. **State Inspector**: Xem toàn bộ cấu trúc dữ liệu JSON của State hoặc xem dạng thẻ trực quan.
4. **Source Code Viewer**: Bấm chuyển giữa các file `graph.py`, `state.py`, `nodes.py`, `tools.py` để đối chiếu trực tiếp giữa giao diện và mã nguồn Python đang thực thi phía sau.

---

*Tài liệu kỹ thuật được biên soạn bởi Đội ngũ Kỹ sư AI EVN PowerBot.*
