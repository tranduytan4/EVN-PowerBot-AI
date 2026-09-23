import os
import time
import uuid
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .models import (
    RunGraphRequest,
    ResumeGraphRequest,
    GraphTopologyResponse,
    StateSnapshotResponse
)
from .graph import evn_graph, get_graph_topology
from .checkpoints import get_thread_state_snapshot, get_thread_trace_history
from .state import AgentState
from .semantic_cache import global_semantic_cache
from .streaming import stream_langgraph_execution
from .db_pgvector import global_db_manager
from .middleware import ProductionObservabilityMiddleware, global_rate_limiter, get_server_metrics

SERVER_START_TIME = time.time()

app = FastAPI(
    title="EVN PowerBot AI - Enterprise Production Engine",
    description="Production-Ready StateGraph Runtime with SSE Streaming, Semantic Caching, pgvector HNSW search, and Human-in-the-loop.",
    version="2.0.0"
)

# 1. Observability Middleware (Request Tracking & Duration)
app.add_middleware(ProductionObservabilityMiddleware)

# 2. CORS Middleware for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiter Dependency Check
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"
    # Allow health and metrics without strict limit
    if request.url.path not in ["/api/langgraph/health", "/api/metrics"]:
        if not global_rate_limiter.is_allowed(client_ip):
            raise HTTPException(
                status_code=429,
                detail="Too Many Requests: Rate limit exceeded (120 req/min). Please try again shortly."
            )
    return await call_next(request)

# =============================================================================
# HEALTH & METRICS ENDPOINTS
# =============================================================================
@app.get("/api/langgraph/health")
def health_check():
    return {
        "status": "online",
        "service": "EVN PowerBot AI - Production Engine",
        "runtime": "FastAPI + LangGraph + SSE Streaming",
        "semantic_cache": "Active",
        "pgvector": "Configured",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/metrics")
def get_metrics():
    """
    Returns real-time system performance, cache metrics, and operational health.
    """
    server_stats = get_server_metrics(SERVER_START_TIME)
    cache_stats = global_semantic_cache.get_stats()
    return {
        **server_stats,
        "semantic_cache": cache_stats,
        "database": global_db_manager.get_info()
    }

# =============================================================================
# SEMANTIC CACHE MANAGEMENT ENDPOINTS
# =============================================================================
@app.get("/api/cache/stats")
def get_cache_stats():
    """
    Returns real-time statistics of the vector semantic cache.
    """
    return global_semantic_cache.get_stats()

@app.post("/api/cache/clear")
def clear_cache():
    """
    Invalidates all entries in the semantic cache.
    """
    global_semantic_cache.clear()
    return {"success": True, "message": "Semantic cache successfully cleared."}

# =============================================================================
# PGVECTOR DATABASE & SCHEMA ENDPOINTS
# =============================================================================
@app.get("/api/db/schema")
def get_db_schema():
    """
    Returns the PostgreSQL + pgvector DDL schema script and index configuration.
    """
    return {
        "info": global_db_manager.get_info(),
        "ddl_script": global_db_manager.get_schema_ddl()
    }

# =============================================================================
# LANGGRAPH RUNTIME & STREAMING ENDPOINTS
# =============================================================================
@app.get("/api/langgraph/graph", response_model=GraphTopologyResponse)
def get_graph():
    """
    Returns the real graph topology (nodes, edges, conditional routes) for UI rendering.
    """
    return get_graph_topology()

@app.post("/api/langgraph/stream")
async def stream_langgraph(request: RunGraphRequest):
    """
    Server-Sent Events (SSE) Streaming endpoint for real-time execution tracking,
    token-by-token generation, and semantic caching.
    """
    thread_id = request.thread_id or f"thread-{uuid.uuid4().hex[:8]}"
    
    return StreamingResponse(
        stream_langgraph_execution(
            question=request.question,
            thread_id=thread_id,
            customer_id=request.customer_id,
            use_semantic_cache=True
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/langgraph/run")
def run_langgraph(request: RunGraphRequest):
    """
    Standard synchronous batch execution endpoint (with semantic caching support).
    """
    # 1. Check Semantic Cache first
    cached = global_semantic_cache.get(request.question)
    if cached:
        cached_data, sim_score, matched_q = cached
        return {
            "success": True,
            "thread_id": request.thread_id or f"cached-{uuid.uuid4().hex[:6]}",
            "status": "COMPLETED",
            "is_paused": False,
            "is_cached": True,
            "similarity": sim_score,
            "matched_question": matched_q,
            "next_nodes": [],
            "state": cached_data.get("state", {}),
            "answer": cached_data.get("answer"),
            "trace": cached_data.get("trace", [])
        }

    thread_id = request.thread_id or f"thread-{uuid.uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}
    
    initial_state: AgentState = {
        "question": request.question,
        "thread_id": thread_id,
        "customer_id": request.customer_id,
        "retry_count": 0,
        "max_retries": 2,
        "retrieved_documents": [],
        "citations": [],
        "trace": [],
        "execution_status": "RUNNING",
        "requires_human": False,
        "needs_compensation_rag": False,
        "needs_retry": False
    }

    try:
        # Run graph through real LangGraph runtime
        result_state = evn_graph.invoke(initial_state, config=config)
        
        # Check current state from checkpointer
        snapshot = get_thread_state_snapshot(thread_id)
        is_paused = snapshot.get("is_paused", False)
        
        # Store in semantic cache if completed successfully
        if not is_paused and result_state.get("answer"):
            global_semantic_cache.set(request.question, {
                "answer": result_state.get("answer"),
                "state": result_state,
                "trace": result_state.get("trace", [])
            })

        return {
            "success": True,
            "thread_id": thread_id,
            "status": "PAUSED" if is_paused else "COMPLETED",
            "is_paused": is_paused,
            "is_cached": False,
            "next_nodes": snapshot.get("next_nodes", []),
            "state": result_state,
            "answer": result_state.get("answer"),
            "trace": result_state.get("trace", [])
        }
    except Exception as e:
        print(f"[Main] Error invoking LangGraph: {e}")
        snapshot = get_thread_state_snapshot(thread_id)
        if snapshot.get("is_paused"):
            return {
                "success": True,
                "thread_id": thread_id,
                "status": "PAUSED",
                "is_paused": True,
                "next_nodes": snapshot.get("next_nodes", []),
                "state": snapshot.get("state", {}),
                "answer": None,
                "trace": snapshot.get("state", {}).get("trace", [])
            }
        raise HTTPException(status_code=500, detail=f"LangGraph execution error: {str(e)}")

@app.post("/api/langgraph/resume")
def resume_langgraph(request: ResumeGraphRequest):
    """
    Resumes a paused LangGraph execution with human approval decision.
    """
    thread_id = request.thread_id
    config = {"configurable": {"thread_id": thread_id}}
    
    snapshot = get_thread_state_snapshot(thread_id)
    if not snapshot.get("exists"):
        raise HTTPException(status_code=404, detail=f"Thread {thread_id} not found in checkpointer.")

    try:
        # 1. Update state in checkpointer with human approval values
        evn_graph.update_state(
            config,
            {
                "approved": request.approved,
                "approval_comment": request.approval_comment or ("Phê duyệt từ người dùng" if request.approved else "Từ chối bởi người dùng"),
                "execution_status": "RUNNING"
            },
            as_node="prepare_inspection"
        )
        
        # 2. Continue graph execution from paused node
        result_state = evn_graph.invoke(None, config=config)
        final_snapshot = get_thread_state_snapshot(thread_id)
        
        return {
            "success": True,
            "thread_id": thread_id,
            "status": "COMPLETED",
            "is_paused": False,
            "next_nodes": [],
            "state": result_state,
            "answer": result_state.get("answer"),
            "trace": result_state.get("trace", [])
        }
    except Exception as e:
        print(f"[Main] Error resuming LangGraph: {e}")
        raise HTTPException(status_code=500, detail=f"LangGraph resume error: {str(e)}")

@app.get("/api/langgraph/state/{thread_id}")
def get_state(thread_id: str):
    snapshot = get_thread_state_snapshot(thread_id)
    if not snapshot.get("exists"):
        raise HTTPException(status_code=404, detail=f"Thread {thread_id} not found.")
    return snapshot

@app.get("/api/langgraph/trace/{thread_id}")
def get_trace(thread_id: str):
    trace = get_thread_trace_history(thread_id)
    return {"thread_id": thread_id, "total_steps": len(trace), "trace": trace}

@app.get("/api/langgraph/code/{filename}")
def get_source_code(filename: str):
    valid_files = [
        "state.py", "nodes.py", "tools.py", "graph.py", 
        "main.py", "retriever.py", "llm.py", "checkpoints.py",
        "semantic_cache.py", "streaming.py", "db_pgvector.py", "middleware.py"
    ]
    if filename not in valid_files:
        raise HTTPException(status_code=400, detail=f"Invalid file request. Allowed: {valid_files}")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(current_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found.")
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    descriptions = {
        "state.py": "Định nghĩa AgentState (TypedDict) chuẩn mực luân chuyển qua tất cả các Node trong đồ thị.",
        "nodes.py": "Hiện thực 7 Node hàm xử lý độc lập và các router phân nhánh (Conditional Edges).",
        "tools.py": "Bộ công cụ Python/LangChain (@tool) gồm tra cứu RAG, chỉ số công tơ, hóa đơn và tính toán bậc thang.",
        "graph.py": "Xây dựng StateGraph, đăng ký Nodes, Edges, Conditional Routing và biên dịch với MemorySaver checkpointer.",
        "main.py": "FastAPI server cung cấp các REST API điều khiển run, resume, stream và inspect.",
        "retriever.py": "Bộ tìm kiếm văn bản quy chuẩn EVN (documents.json) phục vụ RAG.",
        "llm.py": "Bộ tổng hợp câu trả lời hoàn chỉnh kèm trích dẫn văn bản pháp lý chính xác.",
        "checkpoints.py": "Quản lý và trích xuất lịch sử lưu vết trạng thái (State persistence).",
        "semantic_cache.py": "Bộ nhớ đệm ngữ nghĩa (Semantic Cache) với cosine similarity, giảm độ trễ xuống < 10ms và tiết kiệm 100% token.",
        "streaming.py": "Động cơ Server-Sent Events (SSE) truyền phát token và sự kiện thực thi trực tiếp theo thời gian thực.",
        "db_pgvector.py": "Lớp trừu tượng cơ sở dữ liệu PostgreSQL 16 + pgvector với chỉ mục HNSW vector và hybrid filtering.",
        "middleware.py": "Middleware ghi vết X-Request-ID, đo thời gian xử lý, giới hạn tần suất Token Bucket và giám sát hệ thống."
    }
    
    return {
        "filename": filename,
        "description": descriptions.get(filename, ""),
        "code": content
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
