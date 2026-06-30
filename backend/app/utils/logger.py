import logging
import sys
from pathlib import Path
from app.core.config import settings

# Resolve logs path relative to backend project root to prevent working directory issues
BACKEND_ROOT = Path(__file__).resolve().parents[2]
log_dir = BACKEND_ROOT / settings.LOG_DIR

log_dir.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler(str(log_dir / "app.log")),
    ],
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
