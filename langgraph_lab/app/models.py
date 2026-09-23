from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class RunGraphRequest(BaseModel):
    question: str = Field(..., description="User question or inquiry")
    customer_id: Optional[str] = Field(None, description="Optional Customer ID (e.g. PE01000123456)")
    thread_id: Optional[str] = Field(None, description="Thread ID for state persistence")
    provider: Optional[str] = Field("local", description="LLM provider: 'local' | 'openai'")
    api_key: Optional[str] = Field(None, description="Optional API Key for OpenAI")

class ResumeGraphRequest(BaseModel):
    thread_id: str = Field(..., description="Thread ID of the paused execution")
    approved: bool = Field(..., description="True to approve action, False to reject")
    approval_comment: Optional[str] = Field(None, description="Optional note from reviewer")

class GraphNodeInfo(BaseModel):
    id: str
    label: str
    description: str
    node_type: str  # 'entry' | 'router' | 'tool' | 'evaluator' | 'human' | 'generator' | 'exit'

class GraphEdgeInfo(BaseModel):
    source: str
    target: str
    is_conditional: bool = False
    condition_label: Optional[str] = None

class GraphTopologyResponse(BaseModel):
    nodes: List[GraphNodeInfo]
    edges: List[GraphEdgeInfo]

class StateSnapshotResponse(BaseModel):
    thread_id: str
    status: str
    state: Dict[str, Any]
    next_nodes: List[str]
    is_paused: bool
