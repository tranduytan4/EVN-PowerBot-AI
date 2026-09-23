import time
import uuid
from typing import Dict, Any
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class ProductionObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Middleware injecting unique X-Request-ID and calculating response duration.
    """
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", f"req-{uuid.uuid4().hex[:8]}")
        start_time = time.time()
        
        response: Response = await call_next(request)
        
        process_time = (time.time() - start_time) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
        return response

class SimpleRateLimiter:
    """
    In-memory Token Bucket rate limiter per client IP.
    """
    def __init__(self, requests_per_minute: int = 120):
        self.requests_per_minute = requests_per_minute
        self.client_requests: Dict[str, list] = {}

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        window_start = now - 60.0

        if client_ip not in self.client_requests:
            self.client_requests[client_ip] = []

        # Filter out requests older than 1 minute
        self.client_requests[client_ip] = [
            t for t in self.client_requests[client_ip] if t > window_start
        ]

        if len(self.client_requests[client_ip]) < self.requests_per_minute:
            self.client_requests[client_ip].append(now)
            return True

        return False

global_rate_limiter = SimpleRateLimiter(requests_per_minute=120)

def get_server_metrics(start_time: float) -> Dict[str, Any]:
    """Returns real-time operational server metrics."""
    uptime_seconds = round(time.time() - start_time, 1)
    return {
        "service": "EVN PowerBot AI - Production Backend",
        "status": "healthy",
        "uptime_seconds": uptime_seconds,
        "rate_limiter": {
            "limit_per_minute": global_rate_limiter.requests_per_minute,
            "tracked_clients": len(global_rate_limiter.client_requests)
        },
        "features": {
            "langgraph_stategraph": True,
            "sse_streaming": True,
            "semantic_cache": True,
            "pgvector_hnsw_support": True,
            "human_in_the_loop": True
        }
    }
