from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import time
import os
from app.core.config import settings
from app.core.events import create_start_app_handler, create_stop_app_handler
from app.api.v1 import auth, claims, audit, ai
from app.utils.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description="Insurance AI Claims Processing System API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(f"{request.method} {request.url.path} {response.status_code} {duration:.3f}s")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"success": False, "error": "Internal server error"})


@app.on_event("startup")
async def startup_event():
    handler = create_start_app_handler(app)
    await handler()

@app.on_event("shutdown")
async def shutdown_event():
    handler = create_stop_app_handler(app)
    await handler()

app.include_router(auth.router, prefix="/api/v1")
app.include_router(claims.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}
