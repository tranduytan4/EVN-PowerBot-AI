import pytest
from langgraph_lab.app.nodes import analyze_question
from langgraph_lab.app.retriever import EVNDocumentRetriever
from langgraph_lab.app.state import AgentState

retriever = EVNDocumentRetriever()

CHARACTERIZATION_CASES = [
    # ---------------------------------------------------------------------
    # TYPE 1: Document & Regulatory Policy Queries
    # ---------------------------------------------------------------------
    {
        "id": "char-01",
        "query": "Khoảng cách an toàn phóng điện với đường dây 22kV và 110kV là bao nhiêu mét?",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-01/2025/ATĐ-EVN"
    },
    {
        "id": "char-02",
        "query": "Quy định xử lý khi phát hiện dây điện đứt rơi xuống đất bán kính an toàn là bao nhiêu?",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-01/2025/ATĐ-EVN"
    },
    {
        "id": "char-03",
        "query": "Quy trình 4 bước tiếp nhận và xử lý báo mất điện khẩn cấp qua tổng đài 19001909",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QT-02/2024/SCD-EVN"
    },
    {
        "id": "char-04",
        "query": "Thời hạn thông báo cắt điện bảo trì định kỳ cho khách hàng sinh hoạt trước mấy ngày?",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-04/2024/BT-EVN"
    },
    {
        "id": "char-05",
        "query": "Biểu giá điện sinh hoạt bậc 1 bậc 2 bậc 3 quy định thế nào?",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-05/2024/BG-BCT"
    },
    {
        "id": "char-06",
        "query": "Thủ tục hồ sơ đăng ký lắp đặt công tơ điện mới 1 pha qua VNeID",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-06/2023/LĐ-EVN"
    },
    {
        "id": "char-07",
        "query": "Mức hỗ trợ và bồi thường cho khách hàng khi bị mất điện kéo dài trên 8 giờ",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-07/2024/BTTH-EVN"
    },
    {
        "id": "char-08",
        "query": "Hướng dẫn sử dụng máy lạnh tiết kiệm điện và kiểm tra rò điện âm tường",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "HD-08/2024/TKĐ-EVN"
    },
    {
        "id": "char-09",
        "query": "Chính sách khuyến khích lắp điện mặt trời mái nhà tự sản tự tiêu dưới 100kW",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-09/2026/ĐMT-EVN"
    },
    {
        "id": "char-10",
        "query": "Biểu giá điện ưu đãi cho trạm sạc xe điện vào khung giờ thấp điểm là bao nhiêu?",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "TT-10/2026/TT-BCT"
    },
    {
        "id": "char-11",
        "query": "Quy định hệ số cos phi và đấu nối trạm biến áp chuyên dùng 22kV của doanh nghiệp",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-11/2026/TBA-EVN"
    },
    {
        "id": "char-12",
        "query": "Tính năng cảnh báo sự cố mất điện Last Gasp trên công tơ thông minh AMI",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-12/2026/AMI-EVN"
    },
    {
        "id": "char-13",
        "query": "Cơ chế mua bán điện trực tiếp DPPA theo Nghị định 80/2024 cho khách hàng lớn",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "NĐ-80/2024/NĐ-CP",
        "in_legacy_corpus": False  # Will be active in Phase 2 expanded corpus
    },
    {
        "id": "char-14",
        "query": "Thời gian khôi phục cấp điện khi có sự cố mất điện các cấp độ 1 2 3 4",
        "expected_intent": "DOCUMENT_QUERY",
        "expected_doc_code": "QĐ-03/2024/TG-EVN"
    },

    # ---------------------------------------------------------------------
    # TYPE 2: Customer Tools & Private Data Lookup
    # ---------------------------------------------------------------------
    {
        "id": "char-15",
        "query": "Tra cứu chỉ số công tơ điện của khách hàng PE01000123456",
        "expected_intent": "CUSTOMER_LOOKUP",
        "expected_customer_id": "PE01000123456"
    },
    {
        "id": "char-16",
        "query": "Kiểm tra hóa đơn tiền điện tháng này của mã PE02000234567",
        "expected_intent": "CUSTOMER_LOOKUP",
        "expected_customer_id": "PE02000234567"
    },

    # ---------------------------------------------------------------------
    # TYPE 3: Multi-step Calculation & Outage Schedule
    # ---------------------------------------------------------------------
    {
        "id": "char-17",
        "query": "Tính tiền điện sinh hoạt cho 250 kWh theo biểu giá 6 bậc thang",
        "expected_intent": "BILL_CALCULATION",
        "expected_kwh": 250.0
    },
    {
        "id": "char-18",
        "query": "Tính tiền điện cho gia đình sử dụng 450 kWh trong tháng",
        "expected_intent": "BILL_CALCULATION",
        "expected_kwh": 450.0
    },
    {
        "id": "char-19",
        "query": "Khu vực của tôi ngày mai có bị cắt điện bảo trì không?",
        "expected_intent": "OUTAGE_QUERY"
    },

    # ---------------------------------------------------------------------
    # TYPE 4: Out-of-Scope & Guardrails (Must Abstain / Route to OUT_OF_SCOPE)
    # ---------------------------------------------------------------------
    {
        "id": "char-20",
        "query": "Giá vàng SJC hôm nay bao nhiêu một lượng?",
        "expected_intent": "OUT_OF_SCOPE"
    },
    {
        "id": "char-21",
        "query": "Tư vấn cho tôi cổ phiếu chứng khoán ngành ngân hàng nên mua mã nào?",
        "expected_intent": "OUT_OF_SCOPE"
    },
    {
        "id": "char-22",
        "query": "Dự báo thời tiết Hà Nội ngày mai trời mưa hay nắng?",
        "expected_intent": "OUT_OF_SCOPE"
    },

    # ---------------------------------------------------------------------
    # SPECIAL TYPE: Human In The Loop Inspection Request
    # ---------------------------------------------------------------------
    {
        "id": "char-23",
        "query": "Hóa đơn tiền điện tháng này tăng vọt bất thường, tôi yêu cầu phúc tra kiểm tra công tơ",
        "expected_intent": "INSPECTION_REQUEST"
    }
]

@pytest.mark.parametrize("case", CHARACTERIZATION_CASES)
def test_characterization_intent_routing(case):
    """
    Asserts that the intent router classifies each query exactly as expected.
    """
    state: AgentState = {
        "question": case["query"],
        "intent": "",
        "execution_status": "PENDING"
    }
    result = analyze_question(state)
    assert result["intent"] == case["expected_intent"], (
        f"Query: '{case['query']}' | Expected Intent: {case['expected_intent']} | Got: {result['intent']}"
    )
    
    if "expected_customer_id" in case:
        assert result.get("customer_id") == case["expected_customer_id"]

    if "expected_kwh" in case:
        assert result.get("kwh") == case["expected_kwh"]

@pytest.mark.parametrize("case", [c for c in CHARACTERIZATION_CASES if c["expected_intent"] == "DOCUMENT_QUERY" and c.get("in_legacy_corpus", True)])
def test_characterization_retrieval_top_document(case):
    """
    Asserts that the retrieval pipeline retrieves the target authoritative regulatory document in Top-3.
    """
    results = retriever.search(case["query"], top_k=3)
    assert len(results) > 0, f"Retriever returned no results for query: '{case['query']}'"
    
    retrieved_doc_codes = [r.get("docCode") for r in results]
    assert case["expected_doc_code"] in retrieved_doc_codes, (
        f"Query: '{case['query']}' | Expected docCode: {case['expected_doc_code']} | Retrieved: {retrieved_doc_codes}"
    )
