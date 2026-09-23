import re
import time
from typing import Dict, Any, List, Optional
from .state import AgentState, TraceStep
from .tools import (
    search_ev_power_documents,
    tra_cuu_chi_so_dien,
    tra_cuu_hoa_don,
    tinh_hoa_don_tien_dien,
    check_maintenance_outage,
    submit_meter_inspection
)
from .llm import generate_llm_response

def _add_trace(
    state: AgentState,
    node_name: str,
    duration_ms: float,
    decision: Optional[str] = None,
    output_delta: Optional[Dict[str, Any]] = None,
    tool_name: Optional[str] = None,
    tool_input: Optional[Dict[str, Any]] = None,
    tool_output: Optional[Dict[str, Any]] = None,
    explanation_vi: str = ""
) -> List[TraceStep]:
    trace = list(state.get("trace", []))
    step_num = len(trace) + 1
    
    # Snapshot input summary
    input_summary = {
        "question": state.get("question"),
        "intent": state.get("intent"),
        "selected_tool": state.get("selected_tool"),
        "retry_count": state.get("retry_count", 0),
        "requires_human": state.get("requires_human", False),
        "approved": state.get("approved")
    }
    
    step: TraceStep = {
        "step_number": step_num,
        "node_name": node_name,
        "timestamp": time.strftime("%H:%M:%S"),
        "duration_ms": duration_ms,
        "decision": decision,
        "input_state_summary": input_summary,
        "output_state_delta": output_delta or {},
        "tool_name": tool_name,
        "tool_input": tool_input,
        "tool_output": tool_output,
        "explanation_vi": explanation_vi
    }
    trace.append(step)
    return trace

# =========================================================================
# NODE 1: analyze_question
# =========================================================================
def analyze_question(state: AgentState) -> Dict[str, Any]:
    """
    Phân tích câu hỏi người dùng, nhận diện ý định (Intent), trích xuất mã KH và tham số.
    """
    t0 = time.time()
    q = state.get("question", "").strip()
    q_lower = q.lower()
    
    # 1. Trích xuất Customer ID (PE01... đến PE04...)
    cid_match = re.search(r'PE\d{2,12}', q, re.IGNORECASE)
    customer_id = cid_match.group(0).upper() if cid_match else state.get("customer_id") or "PE01000123456"
    
    # 2. Trích xuất kWh nếu có
    kwh_match = re.search(r'(\d+(?:\.\d+)?)\s*kwh', q_lower)
    if not kwh_match:
        # Check pure number if query mentions calculation
        if any(term in q_lower for term in ["tính tiền", "tiền điện", "bậc thang"]):
            num_match = re.search(r'(\d+)\s*(?:số|ký|kwh|độ)', q_lower)
            kwh = float(num_match.group(1)) if num_match else 250.0
        else:
            kwh = None
    else:
        kwh = float(kwh_match.group(1))

    # 3. Phân loại Ý định (Intent Classification)
    out_of_scope_terms = ["cổ phiếu", "chứng khoán", "vay vốn", "vay tiền", "ngân hàng", "giá vàng", "bất động sản", "crypto", "xổ số", "thời tiết"]
    
    # Nhận diện câu hỏi hỏi lịch cắt điện / mất điện cụ thể của khách hàng / khu vực
    is_outage_query = any(term in q_lower for term in [
        "lịch cắt", "lịch mất điện", "tra cứu cắt điện", "tra cứu mất điện", 
        "có bị cắt điện", "bị cắt điện không", "có cắt điện không", "nhà tôi mất điện", 
        "khu vực của tôi", "cắt điện bảo trì không", "lịch bảo trì"
    ])

    # Các từ khóa hỏi về tài liệu/kỹ thuật/quy chuẩn/tính năng (Ưu tiên DOCUMENT_QUERY)
    is_technical_or_policy_query = any(t in q_lower for t in [
        "thế nào", "như thế nào", "là gì", "tính năng", "quy định", "quy chuẩn", 
        "tiêu chuẩn", "last gasp", "ami", "công tơ thông minh", "đo đếm từ xa", 
        "trạm sạc", "điện mặt trời", "trạm biến áp", "an toàn điện", "bậc thang",
        "hướng dẫn", "thủ tục", "nghiệm thu", "đấu nối", "điều khoản", "bán kính"
    ])

    if any(term in q_lower for term in out_of_scope_terms):
        intent = "OUT_OF_SCOPE"
        explanation = "Phát hiện từ khóa ngoài phạm vi dịch vụ điện lực EVN -> Kích hoạt Guardrail."
    elif any(term in q_lower for term in ["phúc tra", "khiếu nại công tơ", "kiểm tra công tơ", "chạy sai", "công tơ tăng", "yêu cầu kiểm định"]):
        intent = "INSPECTION_REQUEST"
        explanation = "Phát hiện yêu cầu kiểm định/phúc tra công tơ -> Cần quy trình Human-in-the-loop phê duyệt."
    elif (kwh is not None and any(t in q_lower for t in ["tính", "bao nhiêu tiền", "bậc thang", "tính tiền"])) or "450 kwh" in q_lower or "250 kwh" in q_lower:
        intent = "BILL_CALCULATION"
        explanation = f"Phát hiện yêu cầu tính toán tiền điện bậc thang ({kwh or 450} kWh) -> Điều hướng tới Calculator Tool."
    elif is_outage_query:
        intent = "OUTAGE_QUERY"
        explanation = "Phát hiện yêu cầu tra cứu lịch cắt điện & bồi thường -> Điều hướng tới Outage Tool & RAG."
    elif is_technical_or_policy_query:
        intent = "DOCUMENT_QUERY"
        explanation = "Yêu cầu tra cứu quy chuẩn kỹ thuật, chính sách, tính năng công nghệ -> Điều hướng tới RAG Knowledge Base."
    elif cid_match or any(term in q_lower for term in ["chỉ số", "hóa đơn", "sản lượng", "thanh toán", "tiền điện tháng"]):
        intent = "CUSTOMER_LOOKUP"
        explanation = f"Phát hiện yêu cầu dữ liệu cá nhân của khách hàng {customer_id} -> Điều hướng tới Customer API Tools."
    else:
        intent = "DOCUMENT_QUERY"
        explanation = "Yêu cầu tra cứu quy định, an toàn, thủ tục chung -> Điều hướng tới RAG Knowledge Base."

    duration_ms = round((time.time() - t0) * 1000, 2)
    delta = {
        "intent": intent,
        "customer_id": customer_id,
        "kwh": kwh or (450.0 if intent == "BILL_CALCULATION" else None),
        "execution_status": "RUNNING",
        "retry_count": state.get("retry_count", 0),
        "max_retries": state.get("max_retries", 2)
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="analyze_question",
        duration_ms=duration_ms,
        decision=f"Intent: {intent} (Customer: {customer_id})",
        output_delta=delta,
        explanation_vi=f"Node `analyze_question` phân tích câu hỏi người dùng, nhận diện ý định là `{intent}` và trích xuất tham số: Mã KH = `{customer_id}`. {explanation}"
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# CONDITIONAL ROUTER: route_question
# =========================================================================
def route_question(state: AgentState) -> str:
    """
    Conditional Edge: Quyết định Node tiếp theo dựa trên Intent trong State.
    """
    intent = state.get("intent", "DOCUMENT_QUERY")
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

# =========================================================================
# NODE 2A: search_rag
# =========================================================================
def search_rag(state: AgentState) -> Dict[str, Any]:
    """
    Thực thi tìm kiếm RAG từ kho tri thức 8 tài liệu EVN.
    """
    t0 = time.time()
    # If in multi-step compensation flow, search specific compensation policy
    if state.get("needs_compensation_rag"):
        query = "Quy định bồi thường và hỗ trợ khi mất điện kéo dài trên 8 giờ QĐ-07"
    else:
        query = state.get("question", "")
        
    tool_res = search_ev_power_documents.invoke({"query": query})
    docs = tool_res.get("documents", [])
    duration_ms = round((time.time() - t0) * 1000, 2)
    
    citations = [{
        "docCode": d.get("docCode"),
        "docTitle": d.get("docTitle"),
        "heading": d.get("heading"),
        "effectiveDate": d.get("effectiveDate")
    } for d in docs]
    
    delta = {
        "selected_tool": "search_ev_power_documents",
        "tool_input": {"query": query},
        "tool_output": tool_res,
        "retrieved_documents": docs,
        "citations": citations
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="search_rag",
        duration_ms=duration_ms,
        decision=f"Tìm thấy {len(docs)} đoạn tài liệu quy chuẩn khớp cao.",
        output_delta=delta,
        tool_name="search_ev_power_documents",
        tool_input={"query": query},
        tool_output=tool_res,
        explanation_vi=f"Node `search_rag` thực thi công cụ tìm kiếm trong kho tri thức văn bản quy chuẩn EVN (`documents.json`), lấy ra {len(docs)} đoạn trích dẫn bám sát."
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# NODE 2B: customer_lookup
# =========================================================================
def customer_lookup(state: AgentState) -> Dict[str, Any]:
    """
    Gọi Mock API tra cứu chỉ số công tơ hoặc hóa đơn tiền điện.
    """
    t0 = time.time()
    cid = state.get("customer_id", "PE01000123456")
    q_lower = state.get("question", "").lower()
    
    # Decide which tool to call
    if any(t in q_lower for t in ["hóa đơn", "tiền điện tháng", "thanh toán"]):
        tool_name = "tra_cuu_hoa_don"
        tool_res = tra_cuu_hoa_don.invoke({"customer_id": cid})
    else:
        tool_name = "tra_cuu_chi_so_dien"
        tool_res = tra_cuu_chi_so_dien.invoke({"customer_id": cid})
        
    duration_ms = round((time.time() - t0) * 1000, 2)
    delta = {
        "selected_tool": tool_name,
        "tool_input": {"customer_id": cid},
        "tool_output": tool_res
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="customer_lookup",
        duration_ms=duration_ms,
        decision=f"Đã gọi Tool `{tool_name}` cho khách hàng {cid}.",
        output_delta=delta,
        tool_name=tool_name,
        tool_input={"customer_id": cid},
        tool_output=tool_res,
        explanation_vi=f"Node `customer_lookup` gọi công cụ API nghiệp vụ `{tool_name}` với tham số `customer_id='{cid}'` để lấy dữ liệu thực tế."
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# NODE 2C: calculate_bill
# =========================================================================
def calculate_bill(state: AgentState) -> Dict[str, Any]:
    """
    Tính toán tiền điện bậc thang 6 bậc (Python code, không để LLM tính sai).
    """
    t0 = time.time()
    kwh = state.get("kwh") or 450.0
    tool_res = tinh_hoa_don_tien_dien.invoke({"kwh": kwh})
    duration_ms = round((time.time() - t0) * 1000, 2)
    
    delta = {
        "selected_tool": "tinh_hoa_don_tien_dien",
        "tool_input": {"kwh": kwh},
        "tool_output": tool_res
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="calculate_bill",
        duration_ms=duration_ms,
        decision=f"Tính xong tiền điện cho {kwh} kWh: {tool_res.get('formatted_total')}.",
        output_delta=delta,
        tool_name="tinh_hoa_don_tien_dien",
        tool_input={"kwh": kwh},
        tool_output=tool_res,
        explanation_vi=f"Node `calculate_bill` thực thi logic tính toán lũy tiến 6 bậc chuẩn xác bằng code Python theo QĐ-05/2024/BG-BCT: Tổng số tiền = {tool_res.get('formatted_total')}."
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# NODE 2D: check_outage
# =========================================================================
def check_outage(state: AgentState) -> Dict[str, Any]:
    """
    Tra cứu lịch cắt điện và kiểm tra điều kiện bồi thường > 8h.
    """
    t0 = time.time()
    cid = state.get("customer_id", "PE01000123456")
    tool_res = check_maintenance_outage.invoke({"customer_id": cid})
    duration_ms = round((time.time() - t0) * 1000, 2)
    
    comp_eligible = tool_res.get("compensationEligible", False)
    
    delta = {
        "selected_tool": "check_maintenance_outage",
        "tool_input": {"customer_id": cid},
        "tool_output": tool_res,
        "needs_compensation_rag": comp_eligible
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="check_outage",
        duration_ms=duration_ms,
        decision=f"Lịch cắt điện: {tool_res.get('durationHours')}h. Cần bồi thường RAG: {comp_eligible}",
        output_delta=delta,
        tool_name="check_maintenance_outage",
        tool_input={"customer_id": cid},
        tool_output=tool_res,
        explanation_vi=f"Node `check_outage` kiểm tra lịch cắt điện: Phát hiện cắt {tool_res.get('durationHours')} giờ ({'Đủ điều kiện bồi thường -> kích hoạt RAG tra cứu QĐ-07' if comp_eligible else 'Không phát sinh bồi thường'})."
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# NODE 2E: prepare_inspection
# =========================================================================
def prepare_inspection(state: AgentState) -> Dict[str, Any]:
    """
    Chuẩn bị hồ sơ phúc tra công tơ, đánh dấu cần phê duyệt Human-in-the-loop.
    """
    t0 = time.time()
    cid = state.get("customer_id", "PE01000123456")
    
    inspection_draft = {
        "action": "Tạo phiếu công tác phúc tra & kiểm định sai số công tơ điện",
        "customerId": cid,
        "reason": "Phát hiện nghi vấn hóa đơn tăng cao hoặc công tơ đo đếm bất thường",
        "department": "Đội Kiểm định Đo lường Điện lực",
        "sla": "24 giờ làm việc"
    }
    
    duration_ms = round((time.time() - t0) * 1000, 2)
    delta = {
        "requires_human": True,
        "execution_status": "PAUSED",
        "inspection_request": inspection_draft
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="prepare_inspection",
        duration_ms=duration_ms,
        decision="Chuẩn bị phiếu công tác kiểm định -> Tạm dừng chờ Quản lý phê duyệt (Human-in-the-loop).",
        output_delta=delta,
        explanation_vi="Node `prepare_inspection` lập hồ sơ yêu cầu kiểm định và đặt cờ `requires_human=True`. Luồng LangGraph sẽ dừng lại tại đây để chờ con người bấm duyệt."
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# NODE 3: evaluate_result
# =========================================================================
def evaluate_result(state: AgentState) -> Dict[str, Any]:
    """
    Đánh giá chất lượng dữ liệu thu thập được:
    - Nếu là sự cố mất điện > 8h -> chuyển sang tìm kiếm RAG bồi thường (Agentic RAG Multi-step).
    - Nếu RAG chưa đủ tài liệu & retry_count < max_retries -> chuyển sang rewrite_query (Retry Loop).
    - Nếu đã đủ -> chuyển sang generate_answer.
    """
    t0 = time.time()
    needs_comp = state.get("needs_compensation_rag", False)
    docs = state.get("retrieved_documents", [])
    retry_count = state.get("retry_count", 0)
    max_retries = state.get("max_retries", 2)
    intent = state.get("intent")
    
    needs_retry = False
    if intent == "DOCUMENT_QUERY" and len(docs) == 0 and retry_count < max_retries:
        needs_retry = True
        
    duration_ms = round((time.time() - t0) * 1000, 2)
    
    if needs_comp and len(docs) == 0:
        decision = "Phát hiện thời gian cắt điện > 8h -> Tiếp tục gọi Node `search_rag` để tra cứu chính sách bồi thường QĐ-07."
    elif needs_retry:
        decision = f"Chưa tìm thấy đoạn văn bản phù hợp -> Kích hoạt vòng lặp thử lại (Retry Loop lần {retry_count + 1})."
    else:
        decision = "Dữ liệu đã đầy đủ và đạt chuẩn -> Chuyển sang Node `generate_answer`."
        
    delta = {
        "needs_retry": needs_retry
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="evaluate_result",
        duration_ms=duration_ms,
        decision=decision,
        output_delta=delta,
        explanation_vi=f"Node `evaluate_result` thẩm định dữ liệu đầu ra: {decision}"
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# CONDITIONAL ROUTER: route_evaluation
# =========================================================================
def route_evaluation(state: AgentState) -> str:
    """
    Conditional Edge sau khi đánh giá kết quả:
    - Multi-step Agentic RAG: route to search_rag
    - Retry Loop: route to rewrite_query
    - Human-in-the-loop: route to human_approval
    - Complete: route to generate_answer
    """
    if state.get("needs_compensation_rag") and len(state.get("retrieved_documents", [])) == 0:
        return "search_rag"
    if state.get("needs_retry") and state.get("retry_count", 0) < state.get("max_retries", 2):
        return "rewrite_query"
    if state.get("requires_human") and state.get("approved") is None:
        return "human_approval"
    return "generate_answer"

# =========================================================================
# NODE 4: rewrite_query (Retry Loop Node)
# =========================================================================
def rewrite_query(state: AgentState) -> Dict[str, Any]:
    """
    Node viết lại câu hỏi mở rộng từ khóa để tìm kiếm lại trong RAG (LangGraph Self-Correction Loop).
    """
    t0 = time.time()
    old_q = state.get("question", "")
    new_retry_count = state.get("retry_count", 0) + 1
    
    # Add domain terms for better match
    rewritten_q = f"Quy định an toàn điện và xử lý sự cố đứt dây lưới điện EVN {old_q}"
    duration_ms = round((time.time() - t0) * 1000, 2)
    
    delta = {
        "question": rewritten_q,
        "retry_count": new_retry_count,
        "needs_retry": False
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="rewrite_query",
        duration_ms=duration_ms,
        decision=f"Viết lại câu hỏi thành công (Lần {new_retry_count}). Quay lại `search_rag`.",
        output_delta=delta,
        explanation_vi=f"Node `rewrite_query` thực thi vòng lặp **Self-Correction Retry Loop** trong LangGraph. Mở rộng câu hỏi để tăng độ phủ ngữ nghĩa, sau đó điều hướng quay ngược lại Node `search_rag`."
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# NODE 5: human_approval (Interrupt Node)
# =========================================================================
def human_approval(state: AgentState) -> Dict[str, Any]:
    """
    Node Human-in-the-loop: Xử lý trạng thái duyệt của con người.
    """
    t0 = time.time()
    approved = state.get("approved")
    duration_ms = round((time.time() - t0) * 1000, 2)
    
    if approved is True:
        decision = "Quản trị viên đã PHÊ DUYỆT yêu cầu -> Tiến hành xuất lệnh công tác."
    elif approved is False:
        decision = "Quản trị viên đã TỪ CHỐI yêu cầu -> Hủy bỏ xuất lệnh."
    else:
        decision = "Đang chờ phê duyệt từ Quản trị viên (Paused at interrupt)."
        
    delta = {
        "execution_status": "RUNNING" if approved is not None else "PAUSED"
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="human_approval",
        duration_ms=duration_ms,
        decision=decision,
        output_delta=delta,
        explanation_vi=f"Node `human_approval` ghi nhận quyết định từ con người: {decision}"
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# CONDITIONAL ROUTER: route_after_approval
# =========================================================================
def route_after_approval(state: AgentState) -> str:
    """
    Conditional Edge sau duyệt: Nếu Approve -> execute_approved_request, nếu Reject -> generate_answer.
    """
    if state.get("approved") is True:
        return "execute_approved_request"
    return "generate_answer"

# =========================================================================
# NODE 6: execute_approved_request
# =========================================================================
def execute_approved_request(state: AgentState) -> Dict[str, Any]:
    """
    Thực thi tạo Ticket chính thức sau khi có phê duyệt.
    """
    t0 = time.time()
    cid = state.get("customer_id", "PE01000123456")
    reason = state.get("inspection_request", {}).get("reason", "Phúc tra chỉ số công tơ")
    
    tool_res = submit_meter_inspection.invoke({"customer_id": cid, "reason": reason})
    duration_ms = round((time.time() - t0) * 1000, 2)
    
    delta = {
        "selected_tool": "submit_meter_inspection",
        "tool_output": tool_res
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="execute_approved_request",
        duration_ms=duration_ms,
        decision=f"Tạo thành công phiếu công tác `{tool_res.get('ticketId')}`.",
        output_delta=delta,
        tool_name="submit_meter_inspection",
        tool_input={"customer_id": cid, "reason": reason},
        tool_output=tool_res,
        explanation_vi=f"Node `execute_approved_request` thực thi công cụ ghi nhận vào hệ thống CRM/OMS của EVN: Phiếu `{tool_res.get('ticketId')}` đã được phát hành."
    )
    
    return {**delta, "trace": updated_trace}

# =========================================================================
# NODE 7: generate_answer (Final Synthesis)
# =========================================================================
def generate_answer(state: AgentState) -> Dict[str, Any]:
    """
    Node tổng hợp câu trả lời cuối cùng từ toàn bộ dữ liệu trong State.
    """
    t0 = time.time()
    question = state.get("question", "")
    intent = state.get("intent", "DOCUMENT_QUERY")
    tool_output = state.get("tool_output")
    docs = state.get("retrieved_documents", [])
    approved = state.get("approved")
    inspection_res = tool_output if state.get("selected_tool") == "submit_meter_inspection" else None
    
    synth_res = generate_llm_response(
        question=question,
        intent=intent,
        tool_output=tool_output,
        retrieved_documents=docs,
        inspection_result=inspection_res,
        approved=approved
    )
    
    duration_ms = round((time.time() - t0) * 1000, 2)
    delta = {
        "answer": synth_res.get("answer"),
        "confidence": synth_res.get("confidence", 0.95),
        "execution_status": "COMPLETED"
    }
    
    updated_trace = _add_trace(
        state=state,
        node_name="generate_answer",
        duration_ms=duration_ms,
        decision="Hoàn thành tổng hợp câu trả lời bám sát nguồn dữ liệu đã kiểm chứng.",
        output_delta=delta,
        explanation_vi="Node `generate_answer` tổng hợp toàn bộ dữ liệu từ State thành câu trả lời hoàn chỉnh đính kèm trích dẫn văn bản pháp lý chính xác."
    )
    
    return {**delta, "trace": updated_trace}
