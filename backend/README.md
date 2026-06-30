# InsureAgent Backend Service

---

## 🌐 Language Options / 語言選擇
* [English Version](#-english-version)
* [中文版 (Chinese Version)](#-中文版)

---

# 🇬🇧 English Version

## 🛠️ Tech Stack
- **Framework**: FastAPI + SQLAlchemy
- **Database**: SQLite (Default) / PostgreSQL (Optional)
- **Cache & Queue**: Redis (Optional, for Celery)
- **AI Service**: Gemini 2.5 API (Default)
- **Others**: Celery (Asynchronous Tasks), Pydantic (Data Validation), PyMuPDF (PDF Processing)

---

## 📁 Directory Structure
```
backend/
├── app/
│   ├── api/              # API Routes
│   │   ├── v1/           # v1 API Endpoints
│   │   │   ├── auth.py    # Authentication
│   │   │   ├── claims.py  # Claim Intake
│   │   │   ├── audit.py   # Underwriting & Audit
│   │   │   └── ai.py      # Chatbot & RAG API
│   │   └── deps.py      # Dependency Injection
│   ├── core/            # Core Configurations
│   │   ├── config.py    # App Settings
│   │   ├── security.py  # Passwords & JWT Tokens
│   │   └── events.py    # Lifecycle Event Handlers
│   ├── models/          # Database ORM Models
│   │   ├── user.py      # User Entity
│   │   ├── claim.py     # Claim Entity
│   │   └── policy.py    # Policy Entity
│   ├── schemas/         # Pydantic Schemas
│   │   ├── user.py      # User Serialization
│   │   ├── claim.py     # Claim Serialization
│   │   └── response.py  # Response Serialization
│   ├── services/        # Business Logic Services
│   │   ├── ai/          # AI Agent Core
│   │   │   ├── agents.py     # 4-Agent Orchestrator
│   │   │   ├── dialog.py     # Chatbot Engine (Few-shot injected)
│   │   │   ├── ocr.py        # Receipt & Damage OCR
│   │   │   └── rag.py        # Policy Retrieval Agent
│   │   ├── claims.py    # Claim Management
│   │   ├── audit.py     # Underwriting Services
│   │   └── knowledge.py  # Policy Knowledgebase
│   ├── utils/           # Helper Utils
│   │   ├── database.py  # Database Connection Local
│   │   ├── logger.py    # Logger (Absolute Path Resolved)
│   │   └── validators.py# Input Validators
│   └── main.py          # Application Entry Point
├── scripts/              # Executable Scripts
│   ├── init_db.py       # DB Initialization & Neo4j Constraint
│   ├── etl_pipeline.py  # RAG Document Vector Processing
│   └── seed_demo_users.py # Preset Users Seeder
├── tests/                # Testing Framework
│   ├── unit/            # Unit Tests
│   └── qa/              # QA Evaluation & LLM-as-a-judge tests
├── alembic/              # DB Schema Migrations
├── requirements.txt      # Python Package Dependencies
└── pyproject.toml        # Ruff/Pytest settings
```

---

## 🚀 Quick Start

### Prerequisites
*   Python 3.10+
*   SQLite3 (Built-in)
*   Redis (Optional, for Celery queue)

### Installation
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create virtual environment:
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure Environment Variables:
    ```bash
    cp .env.example .env
    # Edit the .env file with your GEMINI_API_KEY
    ```
5.  Initialize DB and Seed Demo Users:
    ```bash
    python scripts/init_db.py
    python scripts/seed_demo_users.py
    ```
6.  Start Development API Server:
    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```

---

## 📊 API Documentation
Once the server is running, explore the documentation at:
*   **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
*   **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🧪 Testing
```bash
# Run all tests
python -m pytest

# Run specific unit test file
python -m pytest tests/unit/test_agents.py

# Run QA agent evaluation suite
python tests/qa/runner.py
```

---

# 🇨🇳 中文版

## 🛠️ 技術棧
- **框架**: FastAPI + SQLAlchemy
- **數據庫**: SQLite (默認) / PostgreSQL (可選)
- **快取 & 隊列**: Redis (可選，Celery 使用)
- **AI 服務**: Gemini 2.5 API (默認)
- **其他**: Celery (異步任務), Pydantic (數據驗證), PyMuPDF (PDF 解析)

## 🚀 快速開始

### 環境要求
- Python 3.10+
- SQLite3 (內建)

### 安裝步驟
```bash
# 進入後端目錄
cd backend

# 創建虛擬環境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# 或
.venv\Scripts\activate     # Windows

# 安裝依賴
pip install -r requirements.txt

# 配置環境變量
cp .env.example .env
# 編輯 .env 文件，填入相應的配置信息和 GEMINI_API_KEY

# 初始化數據庫與測試帳號
python scripts/init_db.py
python scripts/seed_demo_users.py

# 啟動開發伺服器
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```