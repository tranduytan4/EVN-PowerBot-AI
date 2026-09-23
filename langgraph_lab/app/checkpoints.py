from typing import Dict, Any, Optional, List
from .graph import evn_graph

def get_thread_state_snapshot(thread_id: str) -> Dict[str, Any]:
    """
    Retrieves the current state and next pending nodes from LangGraph checkpointer for a given thread_id.
    """
    config = {"configurable": {"thread_id": thread_id}}
    try:
        state_snapshot = evn_graph.get_state(config)
        if not state_snapshot or not state_snapshot.values:
            return {
                "thread_id": thread_id,
                "exists": False,
                "status": "NOT_FOUND",
                "state": {},
                "next_nodes": [],
                "is_paused": False
            }
        
        values = state_snapshot.values
        next_nodes = list(state_snapshot.next) if state_snapshot.next else []
        is_paused = "human_approval" in next_nodes or values.get("requires_human", False) and values.get("approved") is None
        
        return {
            "thread_id": thread_id,
            "exists": True,
            "status": "PAUSED" if is_paused else values.get("execution_status", "COMPLETED"),
            "state": values,
            "next_nodes": next_nodes,
            "is_paused": is_paused,
            "checkpoint_id": getattr(state_snapshot.config.get("configurable", {}), "checkpoint_id", None)
        }
    except Exception as e:
        print(f"[Checkpoints] Error getting state for thread {thread_id}: {e}")
        return {
            "thread_id": thread_id,
            "exists": False,
            "status": "ERROR",
            "error": str(e),
            "state": {},
            "next_nodes": [],
            "is_paused": False
        }

def get_thread_trace_history(thread_id: str) -> List[Dict[str, Any]]:
    """
    Returns the step-by-step trace of state transformations for the thread.
    """
    snapshot = get_thread_state_snapshot(thread_id)
    if snapshot.get("exists") and "state" in snapshot:
        return snapshot["state"].get("trace", [])
    return []
