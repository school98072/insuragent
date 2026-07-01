from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "InsuranceAISystem"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this"

    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/insurance_ai"
    MONGODB_URL: str = "mongodb://localhost:27017/insurance_ai"
    REDIS_URL: str = "redis://localhost:6379/0"

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    # ==========================================================================
    # 2. 企业级多智能体分级型号与预算网关配置 (已针对 Gemini 额度最大化进行优化)
    # ==========================================================================
    LLM_PROVIDER: str = "gemini"  # 总开关默认调整为吉米妮
    DEFAULT_LLM_MODEL: str = "gemini-2.5-pro"
    
    # Toggle to dynamically format retrieved RAG chunks using LLMs (disabled by default for low latency/avoiding rate limits)
    ENABLE_LLM_RAG_FORMATTING: bool = False

    # 精准指派：只有条款节点保留贵族 Claude，其余统统交给 Gemini 军团
    CLAUSE_AGENT_MODEL: str = "claude-sonnet-4.6"  # 质量捍卫线
    DIALOG_AGENT_MODEL: str = "gemini-2.5-flash" # 消耗额度主力（极速实时交互）
    DECISION_AGENT_MODEL: str = "gemini-2.5-pro"    # 消耗额度主力（法官异步批处理）
    VISION_AGENT_MODEL: str = "gemini-2.5-flash"   # 消耗额度主力（多模态视觉定损）

    OCR_SERVICE_URL: str = "http://localhost:8001"
    OCR_API_KEY: str = ""

    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = "us-east-1"
    PINECONE_INDEX_NAME: str = "insurance-knowledge"

    STORAGE_TYPE: str = "local"
    UPLOAD_DIR: str = "uploads/"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = "insurance-ai-files"
    AWS_REGION: str = "ap-northeast-1"

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    LOG_LEVEL: str = "INFO"
    LOG_DIR: str = "logs/"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,https://school98072.github.io"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
