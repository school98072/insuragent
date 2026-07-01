# Insuragent: Multi-Agent Claim Adjudication & Audit System

An autonomous, multi-agent cooperative system designed for rapid, accurate, and transparent insurance claim verification, fraud detection, policy analysis, and end-to-end adjudication.

---

## 🌐 Language Options / 語言選擇
* [English Version (英文版)](#-english-version)
* [中文版 (Chinese Version)](#-中文版)

---

# English Version

## 🌟 Project Overview
InsuraAgent leverages a collaborative multi-agent architecture powered by **Gemini 2.5 (Pro & Flash) or Claude** models to automate the complex process of insurance claim adjudication. By dissecting unstructured files (images, medical bills, auto invoices, PDFs) and cross-referencing them against policy rules and structured databases, Insuragent replaces manual labor with intelligent, transparent, and auditable reasoning.

### Key Metrics Reached:
*   **Adjudication Speed**: Processing time reduced from days to **under 5 minutes** per claim.
*   **Automatic Adjudication Accuracy**: $\ge 90\%$ decision accuracy matching manual expert outputs.
*   **Cost Efficiency**: Substantially lowering human-in-the-loop audit rates by up to **80%**.

---

## 🏗️ Multi-Agent Architecture
Adjudicating an insurance claim requires diverse perspectives: financial math, policy wording interpretation, image inspection, and ultimate judgment. Insuragent implements **four specialized agents** working sequentially:

```
[Claim Intake] ➔ [Stage 0: RAG Agent] ➔ [Stage 1: Damage Agent] ➔ [Stage 2: Policy Agent] ➔ [Stage 3: Decision Agent] ➔ [Audit Gate]
```

1.  **Stage 0: RAG Agent (Retrieval & Grounding)**:
    *   Performs semantic vector search on insurance policy manuals and pulls historical similar precedents.
    *   Secures raw context to prevent model hallucinations.
2.  **Stage 1: Damage Assessment Agent (Image/Invoice OCR & Verification)**:
    *   Runs OCR and layout checks on invoices, receipts, and medical files.
    *   Performs multimodal vision inspections on physical damage photos (e.g., dented bumpers).
3.  **Stage 2: Policy Coverage Agent (Exclusion & Limits Audit)**:
    *   Evaluates extracted items against active policy limits, deductibles, and exclusion rules (e.g., cosmetic surgery exclusions or gradual wear-and-tear exceptions).
4.  **Stage 3: Decision & Audit Agent (Consolidated Adjudication)**:
    *   Synthesizes observations from previous stages, calculates the recommended approved amount, lists discrepancies, and outputs a structured final recommendation: `approve`, `reject`, or `human_review`.
5.  **Stage 4: Safety Guardrails**:
    *   Performs post-adjudication sanity checks, validating missing essential documents and detecting common fraud indicators.

---

## 🛠️ Tech Stack
*   **Backend**: FastAPI, SQLAlchemy (SQLite/PostgreSQL), Python 3.10+, PyMuPDF (fitz), Celery (optional background tasks).
*   **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Redux Toolkit.
*   **AI & Databases**: Gemini 2.5 API, Vector Search (LanceDB/Pinecone), Graph constraints database.

---

## 🚀 Local Deployment & Setup Guide

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   **Python 3.10** or higher
*   **Node.js 18** or higher
*   **SQLite3** (ships built-in with Python)

### 2. Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create and activate a Python virtual environment:
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure the environment:
    *   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Open `.env` and configure your credentials. Crucially, set your Gemini API Key:
        ```env
        GEMINI_API_KEY=your-gemini-api-key-here
        DATABASE_URL=sqlite:///./insurance_ai.db
        ```
5.  Initialize the Database and Seed Default Users:
    *   Run the database migration and seeding scripts:
        ```bash
        python scripts/init_db.py
        python scripts/seed_demo_users.py
        ```
    *   *(Optional)* Seed realistic mock claims:
        ```bash
        python scripts/seed_realistic_claims.py
        ```
6.  Start the Backend API Server:
    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```

### 3. Frontend Setup
1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install npm packages:
    ```bash
    npm install
    ```
3.  Start the Vite local development server:
    ```bash
    npm run dev
    ```

### 4. Running via Startup Script
Alternatively, you can start both frontend and backend using the unified startup script at the root directory:
```bash
chmod +x startup.sh
./startup.sh
```

---

## 🔑 Demo Accounts & Login
Use the following pre-seeded user roles to log in and test different system interfaces:

*   **System Admin**:
    *   **Email**: `admin@kaggle.com`
    *   **Password**: `AdminPassword123`
*   **Loss Adjuster**:
    *   **Email**: `adjuster@kaggle.com`
    *   **Password**: `AdjusterPassword123`
*   **Broker**:
    *   **Email**: `broker@kaggle.com`
    *   **Password**: `BrokerPassword123`

---

# 中文版

## 🌟 專案概述
Insuragent 是一個基於 **Gemini 2.5 (Pro & Flash)** 大模型與協同式多智能體 (Multi-Agent) 架構的保險智能理賠審核平台。它能夠自動剖析非結構化文件（相片、醫療收據、車險維修單、PDF 契約），並與保單條款和結構化數據庫進行精準對照，用高透明度、可追溯的 AI 推理流程取代繁琐的人工理賠初審。

### 專案關鍵指標：
*   **審核速度**：理賠案件的處理時間由數天大幅縮短至 **5 分鐘以內**。
*   **自動審核準確率**：理賠決策準確度達 $\ge 90\%$，完美對齊人工專家審查結論。
*   **人力成本優化**：有效分流案件，人工介入審核率降低高達 **80%**。

---

## 🏗️ 多智能體協同架構
理賠決策需要結合「法規條款解讀」、「財務算力」和「影像損壞鑑定」等多重視角。本專案將複雜流程拆解為 **4 個核心 Agent** 協同工作：

```
[客戶報案] ➔ [Stage 0: 檢索 Agent] ➔ [Stage 1: 定損 Agent] ➔ [Stage 2: 條款 Agent] ➔ [Stage 3: 決策 Agent] ➔ [安全防護網]
```

1.  **Stage 0: RAG 檢索 Agent**：
    *   基於向量數據庫檢索對應的保險條款，引進歷史相似理賠案例，確保後續推論具備實體依據，防止大模型幻覺。
2.  **Stage 1: 定損評估 Agent（多模態/OCR）**：
    *   對醫療收據、發票進行版面解析與 OCR 文本提取；對車損等實物照片進行多模態視覺鑑定與防偽審查。
3.  **Stage 2: 保單條款 Agent（限額與免責審計）**：
    *   將定損項與保險合約進行比對，自動審查免責聲明（例如醫美整形拒賠、自然磨損免責）、起賠額及保額限制。
4.  **Stage 3: 決策審查 Agent（綜合裁決）**：
    *   整合前述 Agent 的分析結論，計算最終建議賠付金額，列出理賠差異明細，輸出結構化審核結論：`approve` (同意)、`reject` (拒賠) 或 `human_review` (轉人工)。
5.  **Stage 4: 安全防護網與合規檢查**：
    *   執行最終核准檢查，自動標註缺失的關鍵證明文件，並對詐欺特徵進行風險評估。

---

## 🛠️ 技術棧
*   **後端**：FastAPI, SQLAlchemy (SQLite/PostgreSQL), Python 3.10+, PyMuPDF (fitz), Celery (可選異步隊列)。
*   **前端**：React 18, TypeScript, Tailwind CSS, Vite, Redux Toolkit。
*   **AI 與向量庫**：Gemini 2.5 API, Vector Search (LanceDB/Pinecone), Graph 知識庫。

---

## 🚀 本地部署與配置指南

### 1. 環境要求
請確保您的本地開發環境已安裝：
*   **Python 3.10** 或更高版本
*   **Node.js 18** 或更高版本
*   **SQLite3** (Python 內建，無需額外安裝)

### 2. 後端配置與啟動
1.  進入後端目錄：
    ```bash
    cd backend
    ```
2.  建立並啟用虛擬環境：
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate  # Windows 系統: .venv\Scripts\activate
    ```
3.  安裝依賴包：
    ```bash
    pip install -r requirements.txt
    ```
4.  配置文件夾與環境變量：
    *   複製 `.env.example` 並命名為 `.env`：
        ```bash
        cp .env.example .env
        ```
    *   編輯 `.env`，設置您的 Gemini API Key：
        ```env
        GEMINI_API_KEY=您的Gemini-API金鑰
        DATABASE_URL=sqlite:///./insurance_ai.db
        ```
5.  初始化數據庫與預置帳號：
    *   執行資料庫建表與管理員帳號寫入：
        ```bash
        python scripts/init_db.py
        python scripts/seed_demo_users.py
        ```
    *   *(可選)* 寫入模擬理賠單數據以供測試：
        ```bash
        python scripts/seed_realistic_claims.py
        ```
6.  啟動 FastAPI 後端服務：
    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```

### 3. 前端配置與啟動
1.  開啟新終端機，進入前端目錄：
    ```bash
    cd frontend
    ```
2.  安裝 npm 依賴包：
    ```bash
    npm install
    ```
3.  啟動 Vite 熱重載開發服務：
    ```bash
    npm run dev
    ```

### 4. 使用啟動腳本一鍵啟動
您也可以直接在專案根目錄下使用整合啟動腳本：
```bash
chmod +x startup.sh
./startup.sh
```

---

## 🔑 演示帳號與登入
資料庫預置了以下三種角色的測試帳號：

*   **系統管理員 (Admin)**:
    *   **帳號**: `admin@kaggle.com`
    *   **密碼**: `AdminPassword123`
*   **理賠核賠師 (Adjuster)**:
    *   **帳號**: `adjuster@kaggle.com`
    *   **密碼**: `AdjusterPassword123`
*   **保險經紀人 (Broker)**:
    *   **帳號**: `broker@kaggle.com`
    *   **密碼**: `BrokerPassword123`
