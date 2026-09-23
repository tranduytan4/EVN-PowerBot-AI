from typing import Dict, Any, List
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from .state import AgentState
from .nodes import (
    analyze_question,
    route_question,
    search_rag,
    customer_lookup,
    calculate_bill,
    check_outage,
    prepare_inspection,
    evaluate_result,
    route_evaluation,
    rewrite_query,
    human_approval,
    route_after_approval,
    execute_approved_request,
    generate_answer
)

def build_evn_langgraph(checkpointer: Any = None):
    """
    Constructs and compiles the Real LangGraph StateGraph for EVN PowerBot AI.
    """
    builder = StateGraph(AgentState)

    # 1. Register Nodes
    builder.add_node("analyze_question", analyze_question)
    builder.add_node("search_rag", search_rag)
    builder.add_node("customer_lookup", customer_lookup)
    builder.add_node("calculate_bill", calculate_bill)
    builder.add_node("check_outage", check_outage)
    builder.add_node("prepare_inspection", prepare_inspection)
    builder.add_node("evaluate_result", evaluate_result)
    builder.add_node("rewrite_query", rewrite_query)
    builder.add_node("human_approval", human_approval)
    builder.add_node("execute_approved_request", execute_approved_request)
    builder.add_node("generate_answer", generate_answer)

    # 2. Add Start & Direct Edges
    builder.add_edge(START, "analyze_question")

    # 3. Add Conditional Routing from analyze_question
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

    # 4. Tool & RAG nodes flow to evaluate_result
    builder.add_edge("search_rag", "evaluate_result")
    builder.add_edge("customer_lookup", "evaluate_result")
    builder.add_edge("calculate_bill", "evaluate_result")
    builder.add_edge("check_outage", "evaluate_result")
    builder.add_edge("prepare_inspection", "human_approval")

    # 5. Conditional Routing from evaluate_result (Agentic Multi-step, Retry Loop, Human Interrupt, or Generate)
    builder.add_conditional_edges(
        "evaluate_result",
        route_evaluation,
        {
            "search_rag": "search_rag",            # Multi-step Agentic RAG
            "rewrite_query": "rewrite_query",      # Self-Correction Retry Loop
            "human_approval": "human_approval",    # Human in the loop
            "generate_answer": "generate_answer"   # Final Answer Synthesis
        }
    )

    # 6. Retry Loop edge (Loop back to search_rag)
    builder.add_edge("rewrite_query", "search_rag")

    # 7. Human Approval Conditional Routing
    builder.add_conditional_edges(
        "human_approval",
        route_after_approval,
        {
            "execute_approved_request": "execute_approved_request",
            "generate_answer": "generate_answer"
        }
    )

    # 8. Execution and Completion Edges
    builder.add_edge("execute_approved_request", "generate_answer")
    builder.add_edge("generate_answer", END)

    # 9. Compile with Real MemorySaver Checkpointer & Interrupt
    if checkpointer is None:
        checkpointer = MemorySaver()

    # interrupt_before specifies nodes where LangGraph halts execution until resumed
    compiled_graph = builder.compile(
        checkpointer=checkpointer,
        interrupt_before=["human_approval"]
    )
    
    return compiled_graph

# Global singleton instance of the compiled graph
global_checkpointer = MemorySaver()
evn_graph = build_evn_langgraph(checkpointer=global_checkpointer)

def get_graph_topology() -> Dict[str, Any]:
    """
    Returns the static node and edge list for rendering in the interactive UI.
    """
    nodes = [
        {"id": "START", "label": "Bắt đầu (START)", "node_type": "entry", "description": "Điểm khởi đầu nhận câu hỏi từ người dùng"},
        {"id": "analyze_question", "label": "analyze_question", "node_type": "router", "description": "Phân tích câu hỏi, nhận diện Intent & trích xuất tham số"},
        {"id": "search_rag", "label": "search_rag", "node_type": "tool", "description": "Tra cứu văn bản quy chuẩn, an toàn điện & biểu giá (documents.json)"},
        {"id": "customer_lookup", "label": "customer_lookup", "node_type": "tool", "description": "Gọi Tool tra cứu chỉ số công tơ hoặc hóa đơn tiền điện"},
        {"id": "calculate_bill", "label": "calculate_bill", "node_type": "tool", "description": "Bộ tính tiền điện lũy tiến 6 bậc thang (Python Code)"},
        {"id": "check_outage", "label": "check_outage", "node_type": "tool", "description": "Tra cứu lịch cắt điện & phát hiện điều kiện bồi thường > 8h"},
        {"id": "prepare_inspection", "label": "prepare_inspection", "node_type": "human", "description": "Lập hồ sơ phúc tra công tơ và kích hoạt yêu cầu duyệt"},
        {"id": "evaluate_result", "label": "evaluate_result", "node_type": "evaluator", "description": "Đánh giá chất lượng dữ liệu, kích hoạt Multi-step hoặc Retry"},
        {"id": "rewrite_query", "label": "rewrite_query", "node_type": "router", "description": "Vòng lặp tự sửa sai (Retry Loop) viết lại câu hỏi tìm kiếm"},
        {"id": "human_approval", "label": "human_approval (⏸)", "node_type": "human", "description": "Điểm ngắt Human-in-the-loop: Tạm dừng chờ con người phê duyệt"},
        {"id": "execute_approved_request", "label": "execute_approved_request", "node_type": "tool", "description": "Xuất lệnh tạo phiếu công tác kiểm định chính thức"},
        {"id": "generate_answer", "label": "generate_answer", "node_type": "generator", "description": "Tổng hợp câu trả lời hoàn chỉnh kèm trích dẫn văn bản pháp lý"},
        {"id": "END", "label": "Kết thúc (END)", "node_type": "exit", "description": "Trả kết quả cuối cùng cho người dùng"}
    ]
    
    edges = [
        {"source": "START", "target": "analyze_question", "is_conditional": False},
        {"source": "analyze_question", "target": "search_rag", "is_conditional": True, "condition_label": "DOCUMENT_QUERY"},
        {"source": "analyze_question", "target": "customer_lookup", "is_conditional": True, "condition_label": "CUSTOMER_LOOKUP"},
        {"source": "analyze_question", "target": "calculate_bill", "is_conditional": True, "condition_label": "BILL_CALCULATION"},
        {"source": "analyze_question", "target": "check_outage", "is_conditional": True, "condition_label": "OUTAGE_QUERY"},
        {"source": "analyze_question", "target": "prepare_inspection", "is_conditional": True, "condition_label": "INSPECTION_REQUEST"},
        {"source": "analyze_question", "target": "generate_answer", "is_conditional": True, "condition_label": "OUT_OF_SCOPE"},
        {"source": "search_rag", "target": "evaluate_result", "is_conditional": False},
        {"source": "customer_lookup", "target": "evaluate_result", "is_conditional": False},
        {"source": "calculate_bill", "target": "evaluate_result", "is_conditional": False},
        {"source": "check_outage", "target": "evaluate_result", "is_conditional": False},
        {"source": "prepare_inspection", "target": "human_approval", "is_conditional": False},
        {"source": "evaluate_result", "target": "search_rag", "is_conditional": True, "condition_label": "Cần bồi thường (Agentic RAG)"},
        {"source": "evaluate_result", "target": "rewrite_query", "is_conditional": True, "condition_label": "Thiếu dữ liệu (Retry Loop)"},
        {"source": "evaluate_result", "target": "generate_answer", "is_conditional": True, "condition_label": "Đạt chuẩn"},
        {"source": "rewrite_query", "target": "search_rag", "is_conditional": False, "condition_label": "Thử lại (Loop back)"},
        {"source": "human_approval", "target": "execute_approved_request", "is_conditional": True, "condition_label": "Đã Duyệt (Approve)"},
        {"source": "human_approval", "target": "generate_answer", "is_conditional": True, "condition_label": "Từ chối (Reject)"},
        {"source": "execute_approved_request", "target": "generate_answer", "is_conditional": False},
        {"source": "generate_answer", "target": "END", "is_conditional": False}
    ]
    
    return {"nodes": nodes, "edges": edges}
