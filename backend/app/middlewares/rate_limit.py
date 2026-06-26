import time
from typing import Dict, List
from fastapi import Request
from app.config.settings import settings
from app.core.exceptions import FinVaultException

class InMemoryRateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        # Maps client IP to lists of epoch timestamps
        self.history: Dict[str, List[float]] = {}

    def is_rate_limited(self, ip: str) -> None:
        now = time.time()
        
        if ip not in self.history:
            self.history[ip] = []
            
        # Clean older requests outside window
        self.history[ip] = [t for t in self.history[ip] if now - t < self.window_seconds]
        
        if len(self.history[ip]) >= self.requests_limit:
            raise FinVaultException(
                message="Rate limit exceeded. Please try again later.",
                code="RATE_LIMIT_EXCEEDED",
                status_code=429
            )
            
        self.history[ip].append(now)

# Create global instance using settings
auth_rate_limiter = InMemoryRateLimiter(
    requests_limit=settings.RATE_LIMIT_REQUESTS,
    window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS
)

def rate_limit_dependency(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    auth_rate_limiter.is_rate_limited(client_ip)
