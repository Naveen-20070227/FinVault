import os
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from app.config.settings import settings
from app.api.v1 import api_router
from app.core.exceptions import FinVaultException
from app.database.session import engine
from app.database.base import Base

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Initialize database tables (for development ease if not using Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-grade Personal Finance Management System API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration (prevents CORS Bug C2)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache control middleware to prevent API caching (fixes stale visual states)
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(settings.API_V1_STR):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Register API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount Uploads directory statically
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Global exception handlers
@app.exception_handler(FinVaultException)
async def finvault_exception_handler(request: Request, exc: FinVaultException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "code": exc.code,
            "status": exc.status_code
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(x) for x in err.get("loc", []))
        errors.append(f"{loc}: {err.get('msg')}")
        
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation failed: " + "; ".join(errors),
            "code": "VALIDATION_FAILED",
            "status": status.HTTP_422_UNPROCESSABLE_ENTITY
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # Log the stacktrace in real environment
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": f"Internal Server Error: {str(exc)}",
            "code": "INTERNAL_SERVER_ERROR",
            "status": status.HTTP_500_INTERNAL_SERVER_ERROR
        }
    )

# SPA catch-all configuration (prevents asset exposing and supports client router)
# frontend directory is a sibling to backend
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

@app.get("/{catchall:path}")
async def serve_spa(request: Request, catchall: str):
    # Ensure frontend folder structure exists
    os.makedirs(FRONTEND_DIR, exist_ok=True)
    
    # Do not match API routes or uploads
    if catchall.startswith("api/") or catchall.startswith("uploads/"):
        raise HTTPException(status_code=404, detail="Not Found")
        
    # Check if file exists in frontend
    file_path = os.path.join(FRONTEND_DIR, catchall)
    if catchall and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    # Default to index.html for SPA router fallback
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
        
    # If index.html doesn't exist yet, return a simple text stub
    return JSONResponse(
        content={"message": "FinVault Backend is running. Frontend static shell not initialized yet."},
        status_code=200
    )
