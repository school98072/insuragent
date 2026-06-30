from fastapi import FastAPI
from app.utils.logger import get_logger

logger = get_logger(__name__)


def create_start_app_handler(app: FastAPI):
    async def startup():
        logger.info("Application starting up")
        from pathlib import Path
        from app.core.config import settings
        Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
        Path(settings.LOG_DIR).mkdir(parents=True, exist_ok=True)
    return startup


def create_stop_app_handler(app: FastAPI):
    async def shutdown():
        logger.info("Application shutting down")
    return shutdown
