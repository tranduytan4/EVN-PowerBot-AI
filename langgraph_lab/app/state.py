from typing import TypedDict, Optional, List, Dict, Any

class TraceStep(TypedDict, total=False):
    step_number: int
    node_name: str
    timestamp: str
    duration_ms: float
    decision: Optional[str]
    input_state_summary: Dict[str, Any]
    output_state_delta: Dict[str, Any]
    tool_name: Optional[str]
    tool_input: Optional[Dict[str, Any]]
    tool_output: Optional[Dict[str, Any]]
    explanation_vi: str

class AgentState(TypedDict, total=False):
    """
    Real LangGraph State for EVN PowerBot AI.
    This State is passed and transformed across all nodes in the StateGraph.
    """
    question: str
    thread_id: str
    intent: Optional[str]  # DOCUMENT_QUERY, CUSTOMER_LOOKUP, BILL_CALCULATION, OUTAGE_QUERY, INSPECTION_REQUEST, OUT_OF_SCOPE
    customer_id: Optional[str]
    kwh: Optional[float]
    
    # Tool Selection & Execution
    selected_tool: Optional[str]
    tool_input: Optional[Dict[str, Any]]
    tool_output: Optional[Dict[str, Any]]
    
    # RAG & Context
    retrieved_documents: List[Dict[str, Any]]
    citations: List[Dict[str, Any]]
    
    # Decision & Flow flags
    needs_compensation_rag: bool
    needs_retry: bool
    requires_human: bool
    approved: Optional[bool]
    approval_comment: Optional[str]
    inspection_request: Optional[Dict[str, Any]]
    
    # Loop & Retries
    retry_count: int
    max_retries: int
    
    # Final Synthesis
    answer: Optional[str]
    confidence: Optional[float]
    execution_status: str  # PENDING, RUNNING, PAUSED, COMPLETED, ERROR
    
    # Detailed Trace for Educational Lab
    trace: List[TraceStep]
