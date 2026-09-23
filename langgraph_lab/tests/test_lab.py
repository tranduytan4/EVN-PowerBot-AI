import pytest
import os
import sys

# Add langgraph_lab directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.tools import (
    search_ev_power_documents,
    tra_cuu_chi_so_dien,
    tra_cuu_hoa_don,
    tinh_hoa_don_tien_dien,
    check_maintenance_outage
)
from app.nodes import analyze_question, route_question
from app.graph import build_evn_langgraph
from langgraph.checkpoint.memory import MemorySaver

def test_electricity_bill_calculator():
    """Verify tier calculation matches EVN QĐ-05/2024/BG-BCT"""
    res = tinh_hoa_don_tien_dien.invoke({"kwh": 250})
    assert res["success"] is True
    assert res["input_kwh"] == 250
    # 50*1893 (94650) + 50*1956 (97800) + 100*2271 (227100) + 50*2860 (143000) = 562550
    assert res["subtotal"] == 562550
    assert res["vat_amount"] == round(562550 * 0.08)  # 45004
    assert res["total_amount"] == 607554

def test_rag_tool():
    """Verify RAG tool finds relevant safety rules"""
    res = search_ev_power_documents.invoke({"query": "đứt dây điện rơi xuống đất cách bao nhiêu mét"})
    assert res["success"] is True
    assert len(res["documents"]) > 0
    # Verify relevant document is in retrieved results
    found_relevant = any(
        "ATĐ" in d["docCode"] or "QĐ-01" in d["docCode"] or "QĐ-03" in d["docCode"] or "đứt dây" in d["content"].lower() or "10" in d["content"]
        for d in res["documents"]
    )
    assert found_relevant is True

def test_customer_tools():
    """Verify customer meter reading and bill lookup"""
    meter_res = tra_cuu_chi_so_dien.invoke({"customer_id": "PE01000123456"})
    assert meter_res["success"] is True
    assert meter_res["customerId"] == "PE01000123456"
    assert meter_res["consumptionKwh"] > 0

    bill_res = tra_cuu_hoa_don.invoke({"customer_id": "PE01000123456"})
    assert bill_res["success"] is True
    assert bill_res["totalAmount"] > 0

def test_outage_tool():
    """Verify maintenance outage lookup and compensation flag"""
    outage_res = check_maintenance_outage.invoke({"customer_id": "PE01000123456"})
    assert outage_res["success"] is True
    assert outage_res["hasOutage"] is True
    assert outage_res["durationHours"] == 14
    assert outage_res["compensationEligible"] is True

def test_intent_routing():
    """Verify analyze_question extracts intents and routes correctly"""
    # 1. Pure RAG
    state1 = {"question": "Khi phát hiện dây điện đứt cần giữ khoảng cách bao nhiêu?"}
    res1 = analyze_question(state1)
    assert res1["intent"] == "DOCUMENT_QUERY"
    assert route_question(res1) == "search_rag"

    # 2. Customer Lookup
    state2 = {"question": "Xem chỉ số công tơ tháng này của PE01000123456"}
    res2 = analyze_question(state2)
    assert res2["intent"] == "CUSTOMER_LOOKUP"
    assert route_question(res2) == "customer_lookup"

    # 3. Bill Calculation
    state3 = {"question": "Dùng 450 kWh điện sinh hoạt thì hết bao nhiêu tiền?"}
    res3 = analyze_question(state3)
    assert res3["intent"] == "BILL_CALCULATION"
    assert route_question(res3) == "calculate_bill"

    # 4. Outage Query
    state4 = {"question": "Khu vực của tôi tuần này có bị cắt điện bảo trì không?"}
    res4 = analyze_question(state4)
    assert res4["intent"] == "OUTAGE_QUERY"
    assert route_question(res4) == "check_outage"

    # 5. Inspection Request (Human in the loop)
    state5 = {"question": "Yêu cầu phúc tra kiểm tra công tơ điện do nghi ngờ chạy sai"}
    res5 = analyze_question(state5)
    assert res5["intent"] == "INSPECTION_REQUEST"
    assert route_question(res5) == "prepare_inspection"

def test_full_graph_pure_rag_execution():
    """Test full LangGraph execution for Pure RAG scenario"""
    saver = MemorySaver()
    graph = build_evn_langgraph(checkpointer=saver)
    
    config = {"configurable": {"thread_id": "test-rag-thread-1"}}
    initial_state = {
        "question": "Quy định an toàn điện xử lý khi phát hiện đứt dây rơi xuống đất",
        "thread_id": "test-rag-thread-1",
        "retry_count": 0,
        "max_retries": 2,
        "trace": []
    }
    
    res = graph.invoke(initial_state, config=config)
    assert res["execution_status"] == "COMPLETED"
    assert "ATĐ" in res["answer"] or "QĐ-01" in res["answer"] or "10 mét" in res["answer"]
    assert len(res["trace"]) >= 4

def test_full_graph_calculator_execution():
    """Test full LangGraph execution for Calculator scenario"""
    saver = MemorySaver()
    graph = build_evn_langgraph(checkpointer=saver)
    
    config = {"configurable": {"thread_id": "test-calc-thread-2"}}
    initial_state = {
        "question": "Tính tiền điện cho 450 kWh",
        "thread_id": "test-calc-thread-2",
        "retry_count": 0,
        "max_retries": 2,
        "trace": []
    }
    
    res = graph.invoke(initial_state, config=config)
    assert res["execution_status"] == "COMPLETED"
    assert "tinh_hoa_don_tien_dien" in res["selected_tool"]
    assert res["tool_output"]["total_amount"] > 0
    assert len(res["trace"]) >= 4

def test_human_in_the_loop_interrupt_and_resume():
    """Test LangGraph real interrupt before human_approval and resuming with approval"""
    saver = MemorySaver()
    graph = build_evn_langgraph(checkpointer=saver)
    
    thread_id = "test-human-thread-3"
    config = {"configurable": {"thread_id": thread_id}}
    
    initial_state = {
        "question": "Tôi muốn yêu cầu phúc tra kiểm tra công tơ cho mã PE01000123456",
        "thread_id": thread_id,
        "customer_id": "PE01000123456",
        "retry_count": 0,
        "max_retries": 2,
        "trace": []
    }
    
    # 1. Run initial execution -> should interrupt before human_approval
    graph.invoke(initial_state, config=config)
    
    snapshot = graph.get_state(config)
    assert "human_approval" in snapshot.next
    assert snapshot.values.get("requires_human") is True
    
    # 2. Update state with approval = True
    graph.update_state(
        config,
        {"approved": True, "approval_comment": "Phê duyệt bởi Trưởng phòng CSKH"},
        as_node="prepare_inspection"
    )
    
    # 3. Resume graph from interrupt
    res = graph.invoke(None, config=config)
    assert res["execution_status"] == "COMPLETED"
    assert "submit_meter_inspection" in str(res["trace"])
    assert "TICKET-EVN" in str(res["answer"])
