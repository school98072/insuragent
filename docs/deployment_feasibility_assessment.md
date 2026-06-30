# Deployment Feasibility Assessment: Front-end, Back-end & Database

This document evaluates the feasibility of deploying the InsureAgent system, addressing frontend hosting via GitHub Actions, backend hosting via Supabase, and the persistence of LanceDB/Neo4j graph databases on GitHub.

---

## 🌐 Language Options / 語言選擇
* [English Version](#-english-version)
* [中文版 (Chinese Version)](#-中文版)

---

# 🇬🇧 English Version

## 1. Frontend Deployment via GitHub Actions
*   **Feasibility**: **High (Excellent fit)**.
*   **Target Hosting**: **GitHub Pages** (free, built-in) or **Vercel** (via GitHub Actions integration).
*   **Implementation Plan**:
    *   Create a GitHub Actions workflow `.github/workflows/deploy-frontend.yml`.
    *   On push to `main`, the runner installs Node.js, installs dependencies, builds Vite (`npm run build`), and deploys the static files in `dist/` directly to GitHub Pages.
    *   **Configuration**: The frontend needs the backend API URL. We will inject `VITE_API_BASE_URL` as a build-time environment variable inside the GitHub workflow.

---

## 2. Backend Deployment via Supabase
*   **Feasibility**: **Medium-Low (for Python Hosting) / High (for Database Hosting)**.
*   **Technical Constraint**:
    *   Supabase is a Backend-as-a-Service (BaaS) built on PostgreSQL and TypeScript Edge Functions. It **cannot run native Python FastAPI server processes**.
*   **Recommended Hybrid Solution**:
    1.  **Database**: Host the relational database on **Supabase PostgreSQL**. We configure the backend's `DATABASE_URL` in `.env` to point to the Supabase connection string (`postgresql://...`).
    2.  **FastAPI Application Server**: Deploy the FastAPI Python application to a dedicated container runtime service like **Render** (which has a free tier for Web Services) or **Railway**.
    3.  This hybrid model provides a secure, production-grade deployment where the backend is hosted on Render and communicates with the Supabase Postgres database.

---

## 3. Persistent Databases on GitHub (LanceDB & Neo4j)
*   **Feasibility**: **High for schema/seeding configurations / Low for raw live binary files**.
*   **Technical Constraints**:
    *   **LanceDB**: LanceDB is an embedded serverless vector database storing data as local files. While we *can* commit the binary folder (`data/lancedb/`) to Git, doing so is discouraged as it bloats the repository and causes merge conflicts.
    *   **Neo4j (GraphDB)**: Neo4j runs as a server process. Committing raw Neo4j binary database folders directly to GitHub is not feasible.
*   **Recommended Solution**:
    *   **Infrastructure-as-Code (IaC)**: We provide a standard `docker-compose.yml` to spin up a local Neo4j container instantly.
    *   **PDF Source & Ingestion Pipeline**: We commit the raw policy manuals (`backend/data/policies/`) and the ETL pipeline script (`backend/scripts/etl_pipeline.py`).
    *   When deployed, running `python scripts/etl_pipeline.py` parses the PDFs and reconstructs both the LanceDB vectors and Neo4j graph nodes.

---

# 🇨🇳 中文版

## 1. 前端部署（GitHub Actions）
*   **可行性**：**極高 (最佳搭配)**。
*   **部署目標**：**GitHub Pages** (免費且原生支持) 或 **Vercel**。
*   **實施方案**：
    *   編寫 GitHub Actions 工作流文件 `.github/workflows/deploy-frontend.yml`。
    *   當代碼推送到 `main` 分支時，觸發自動化任務：安裝 Node 依賴、打包構建 Vite 專案 (`npm run build`)，並將 `dist/` 目錄下生成的靜態資源發布至 GitHub Pages。
    *   **配置傳遞**：前端需要的後端 API 地址會在構建時通過 GitHub Actions Secrets 注入到環境變量 `VITE_API_BASE_URL` 中。

---

## 2. 後端部署（Supabase）
*   **可行性**：**中低 (針對 Python 服務託管) / 高 (針對 PostgreSQL 數據庫託管)**。
*   **技術限制**：
    *   Supabase 是一個基於 PostgreSQL 數據庫與 TypeScript Edge Functions 的後端即服務 (BaaS)，**無法直接運行 Python FastAPI Web 伺服器**。
*   **推薦混合部署方案**：
    1.  **數據庫服務**：利用 **Supabase PostgreSQL** 託管數據庫。我們將後端的 `DATABASE_URL` 指向 Supabase 提供的 PostgreSQL 連接字符串。
    2.  **FastAPI 應用伺服器**：將 FastAPI 應用服務託管至支持 Python 環境的雲端平台（例如 **Render** 免費級別 Web Service 或 **Railway**）。
    3.  **聯動運行**：Render 運行的後端服務與 Supabase 的 PostgreSQL 聯動，完美解決 Python 運行與關係型數據庫的託管需求。

---

## 3. 數據庫持久化存在 GitHub 上（LanceDB & Neo4j GraphDB）
*   **可行性**：**高 (針對代碼化種子與 ETL 腳本) / 低 (針對二進制數據庫文件)**。
*   **技術限制與方案**：
    *   **LanceDB 向量庫**：LanceDB 是嵌入式本地文件數據庫。雖然技術上可以將二進制數據目錄 `data/lancedb/` 直接提交到 Git，但這會造成 Git 倉庫肥大並引起衝突。
    *   **Neo4j 圖數據庫**：Neo4j 作為服務器進程運行，無法直接提交二進制數據目錄至 Git。
*   **推薦開源解決方案**：
    *   **容器化編排**：提供標準的 `docker-compose.yml`，一鍵拉起本地或雲端的 Neo4j 容器。
    *   **原始保單與 ETL 管道**：提交原始 PDF 保單文件夾（已在 `data/policies/` 中）和 [etl_pipeline.py](file:///Users/benjaminchung/Projects/insurance_ai_system/github/backend/scripts/etl_pipeline.py)。
    *   部署時，一鍵運行 `python scripts/etl_pipeline.py`，即可動態解析保單並全自動重建本地 LanceDB 向量庫與 Neo4j 圖譜關係。
