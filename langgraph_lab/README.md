# EVN LangGraph Learning Lab — Backend

Backend độc lập chạy runtime **LangGraph thật (Python StateGraph)**, phục vụ môi trường học tập và trực quan hóa Agent Workflow của **EVN PowerBot AI**.

---

## 🚀 Khởi chạy Backend

### 1. Cài đặt Thư viện Phụ thuộc:
```bash
pip install -r requirements.txt
```

### 2. Khởi động Server FastAPI:
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend sẽ lắng nghe tại: `http://127.0.0.1:8000`
Swagger API Docs: `http://127.0.0.1:8000/docs`

---

## 🧪 Chạy Bộ Kiểm Thử Tự Động (Pytest)

```bash
python -m pytest tests/test_lab.py -v
```

Bộ kiểm thử bao gồm:
* `test_electricity_bill_calculator`: Xác thực bộ tính tiền điện 6 bậc thang lũy tiến chuẩn xác theo QĐ-05/2024/BG-BCT.
* `test_rag_tool`: Kiểm tra bộ tìm kiếm RAG từ kho văn bản quy chuẩn `documents.json`.
* `test_customer_tools`: Tra cứu chỉ số công tơ và hóa đơn từ `customers.json`.
* `test_outage_tool`: Tra cứu lịch cắt điện và phát hiện điều kiện bồi thường > 8 giờ.
* `test_intent_routing`: Kiểm thử Conditional Edges và phân loại ý định câu hỏi.
* `test_full_graph_pure_rag_execution`: Luồng thực thi đồ thị hoàn chỉnh cho RAG thuần túy.
* `test_full_graph_calculator_execution`: Luồng thực thi tính toán tiền điện.
* `test_human_in_the_loop_interrupt_and_resume`: Tạm dừng tại ngắt `interrupt` và tiếp tục khi có phê duyệt.

---

## 📂 Cấu trúc Thư mục

```text
langgraph_lab/
├── app/
│   ├── __init__.py
│   ├── state.py         # Định nghĩa AgentState TypedDict
│   ├── models.py        # Pydantic schemas cho API
│   ├── retriever.py     # Adapter RAG tri thức EVN (documents.json)
│   ├── tools.py         # Bộ công cụ @tool LangChain
│   ├── nodes.py         # Các hàm xử lý Node và Routers
│   ├── graph.py         # Xây dựng & biên dịch StateGraph với MemorySaver
│   ├── checkpoints.py   # State snapshot & history inspection
│   ├── llm.py           # Bộ tổng hợp câu trả lời chuẩn xác
│   └── main.py          # FastAPI application & REST endpoints
├── tests/
│   ├── __init__.py
│   └── test_lab.py      # Unit & Integration tests
├── requirements.txt
├── .env.example
└── README.md
```
