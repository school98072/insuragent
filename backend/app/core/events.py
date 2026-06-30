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
        
        # Auto-seed database tables and default users on boot
        try:
            import sys
            import os
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from scripts.seed_demo_users import seed_users
            from scripts.seed_realistic_claims import seed_realistic_claims
            logger.info("Running database auto-seeding...")
            seed_users()
            logger.info("Running realistic claims auto-seeding...")
            seed_realistic_claims()
        except Exception as e:
            logger.error(f"Database auto-seeding failed: {e}", exc_info=True)
    return startup


def create_stop_app_handler(app: FastAPI):
    async def shutdown():
        logger.info("Application shutting down")
    return shutdown
