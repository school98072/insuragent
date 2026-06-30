# InsureAgent Frontend Application

---

## 🌐 Language Options / 語言選擇
* [English Version](#-english-version)
* [中文版 (Chinese Version)](#-中文版)

---

# 🇬🇧 English Version

## 🎨 Tech Stack
- **Framework**: React 18 + TypeScript 4.9
- **UI Library**: Ant Design 5.x
- **State Management**: Redux Toolkit
- **Routing**: React Router 6
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Charts**: ECharts for React

---

## 📁 Directory Structure
```
frontend/
├── public/                 # Static Assets
│   ├── favicon.svg
│   ├── logo.svg
│   └── robots.txt
├── src/
│   ├── api/               # API Integration
│   │   ├── auth.ts        # Auth-related API calls
│   │   ├── claims.ts      # Claim-related API calls
│   │   ├── audit.ts       # Underwriting & Audit APIs
│   │   ├── ai.ts          # Chatbot & RAG APIs
│   │   └── index.ts       # Axios instance setup
│   ├── assets/            # Global Styles & Assets
│   │   └── styles/        # Global tokens and styling rules
│   ├── components/        # Shared Components
│   │   └── layout/        # Site Header, Sidebar and general Layout
│   ├── features/          # Core Features (Domain-Driven)
│   │   ├── auth/          # Login & Signup flows
│   │   ├── claims/        # Claim intake list and details view
│   │   ├── audit/         # Adjuster Inbox & Adjudication Workstation
│   │   ├── knowledge/     # Policy documentation lookup dashboard
│   │   └── dashboard/     # System statistics and BI metrics
│   ├── store/             # Redux Store slices & actions
│   ├── routes/            # Route configurations (Public vs. Private)
│   ├── types/             # Shared TypeScript type definitions
│   ├── utils/             # Helper utilities and validators
│   ├── App.tsx            # Root Application Component
│   ├── main.tsx           # Entry Point
│   └── index.css          # Global CSS Tailwind directives
├── .env.example           # Environment variables configuration example
├── vite.config.ts         # Vite build configuration
├── tsconfig.json          # TypeScript compiler configs
└── package.json           # npm scripts and package dependencies
```

---

## 🚀 Quick Start

### Prerequisites
*   Node.js 18 or higher
*   npm 8 or higher (or Yarn / pnpm)

### Installation & Run
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure the environment:
    ```bash
    cp .env.example .env
    # The default API endpoints point to http://localhost:8000/api/v1
    ```
4.  Start Local Development Server:
    ```bash
    npm run dev
    ```
5.  Build Production Artifacts:
    ```bash
    npm run build
    ```

---

## 🧪 Testing
```bash
# Run unit tests
npm run test

# Run component test suites
npm run test:coverage
```

---

# 🇨🇳 中文版

## 🎨 技術棧
- **框架**: React 18 + TypeScript 4.9
- **UI 庫**: Ant Design 5.x
- **狀態管理**: Redux Toolkit
- **路由**: React Router 6
- **HTTP 客戶端**: Axios
- **構建工具**: Vite

## 🚀 快速開始

### 環境要求
- Node.js 18+
- npm 8+

### 安裝與運行
```bash
# 進入前端目錄
cd frontend

# 安裝依賴
npm install

# 複製環境變量配置
cp .env.example .env

# 啟動本地開發服務
npm run dev

# 構建生產包
npm run build
```