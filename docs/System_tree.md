insurance_ai_system
├─ backend
│  ├─ alembic
│  │  ├─ versions
│  │  │  └─ 39f912fd54f2_init.py                     # 数据库初始迁移脚本
│  │  └─ env.py                                      # Alembic 环境配置
│  ├─ app                                            # 后端核心业务逻辑
│  │  ├─ api
│  │  │  ├─ v1
│  │  │  │  ├─ ai.py                                 # AI 功能接口
│  │  │  │  ├─ audit.py                              # 审计日志接口
│  │  │  │  ├─ auth.py                               # 用户认证接口
│  │  │  │  └─ claims.py                             # 理赔业务接口
│  │  │  └─ deps.py                                  # Fastapi 依赖注入
│  │  ├─ core
│  │  │  ├─ config.py                                # 全局配置管理
│  │  │  ├─ events.py                                # 事件处理
│  │  │  └─ security.py                              # 加密与安全策略
│  │  ├─ models                                      # SQLAlchemy 数据库模型
│  │  │  ├─ claim.py
│  │  │  ├─ policy.py
│  │  │  └─ user.py
│  │  ├─ schemas                                     # Pydantic 数据数据校验
│  │  │  ├─ claim.py
│  │  │  ├─ response.py
│  │  │  └─ user.py
│  │  ├─ services                                    # 核心业务服务层
│  │  │  └─ ai                                       # Agent 与 RAG 核心
│  │  │     ├─ agents.py                             # AI Agent 编排
│  │  │     ├─ dialog.py                             # 对话流管理
│  │  │     ├─ llm_factory.py                        # 大模型工厂类
│  │  │     ├─ ocr.py                                # 单据 OCR 解析
│  │  │     └─ rag.py                                # 知识库检索
│  │  └─ utils
│  │     ├─ database.py                              # 数据库连接池
│  │     └─ logger.py                                # 系统日志工具
│  ├─ scripts
│  │  ├─ etl_pipeline.py                             # 数据清洗与处理管道
│  │  ├─ init_db.py                                  # 数据库表结构初始化
│  │  └─ seed_demo_users.py                          # 预测试环境 Demo 数据种子
│  ├─ README.md                                      # 后端说明文档
│  ├─ alembic.ini                                    # 数据库迁移配置文件
│  ├─ docker-compose.yml                             # 后端环境容器编排
│  ├─ pyproject.toml                                 # Python 项目元数据
│  └─ requirements.txt                               # 后端核心依赖列表
├─ frontend
│  ├─ public                                         # 前端公共静态资源
│  │  ├─ favicon.svg
│  │  └─ index.html
│  ├─ src                                            # 前端 React / TS 源码
│  │  ├─ api                                         # 接口请求封装
│  │  │  ├─ ai.ts
│  │  │  ├─ audit.ts
│  │  │  ├─ auth.ts
│  │  │  └─ claims.ts
│  │  ├─ assets                                      # 静态UI资源
│  │  │  ├─ styles
│  │  │  │  └─ tokens.css
│  │  │  ├─ adjuster.svg
│  │  │  ├─ admin.svg
│  │  │  ├─ broker.svg
│  │  │  └─ logo.svg
│  │  ├─ components                                  # 通用UI组件
│  │  │  ├─ business                                 # 业务复合组件
│  │  │  │  ├─ AgentStatus
│  │  │  │  ├─ AuditTable
│  │  │  │  ├─ ClaimForm
│  │  │  │  └─ ImageUpload
│  │  │  ├─ common                                   # 基础组件
│  │  │  │  ├─ Empty
│  │  │  │  ├─ Error
│  │  │  │  └─ Loading
│  │  │  └─ layout                                   # 布局组件
│  │  │     └─ Layout
│  │  │        └─ index.tsx
│  │  ├─ features                                    # 按业务领域划分的模块
│  │  │  ├─ audit
│  │  │  │  └─ components
│  │  │  │     └─ TriageInboxPage.tsx                # 审计收件箱页面
│  │  │  ├─ auth
│  │  │  │  └─ components
│  │  │  │     ├─ LoginPage.tsx
│  │  │  │     └─ RegisterPage.tsx
│  │  │  ├─ claims
│  │  │  │  └─ components
│  │  │  │     ├─ ClaimDetailPage.tsx                # 理赔详情页
│  │  │  │     ├─ ClaimIntakePage.tsx                # 理赔录入页
│  │  │  │     ├─ ClaimsListPage.tsx                # 理赔列表页
│  │  │  │     └─ CopilotDrawer.tsx                  # AI 副驾驶抽屉组件
│  │  │  ├─ dashboard
│  │  │  │  └─ components
│  │  │  │     └─ DashboardPage.tsx                  # 控制台主页
│  │  │  ├─ knowledge
│  │  │  │  └─ components
│  │  │  │     └─ KnowledgePage.tsx                  # 知识库管理页
│  │  │  ├─ logs
│  │  │  │  └─ components
│  │  │  │     └─ SystemLogsPage.tsx                 # 系统日志页
│  │  │  ├─ network
│  │  │  │  └─ components
│  │  │  │     └─ AdjusterNetworkPage.tsx            # 调查员网络页
│  │  │  ├─ reporting
│  │  │  │  └─ components
│  │  │  │     └─ ReportingPage.tsx                  # 数据报表页
│  │  │  └─ risk
│  │  │     └─ components
│  │  │        └─ RiskAnalysisPage.tsx               # 风险分析页
│  │  ├─ hooks                                       # 状态与接口复用 Hooks
│  │  │  ├─ useApi
│  │  │  ├─ useAudit
│  │  │  ├─ useAuth
│  │  │  └─ useClaims
│  │  ├─ locales                                     # 国际化多语言
│  │  │  ├─ en.json
│  │  │  └─ zh.json
│  │  ├─ routes                                      # 路由控制
│  │  │  └─ index.tsx
│  │  ├─ store                                       # Redux 全局状态管理
│  │  │  ├─ slices
│  │  │  │  ├─ authSlice.ts
│  │  │  │  └─ claimsSlice.ts
│  │  │  └─ index.ts
│  │  ├─ App.tsx                                     # 应用根组件
│  │  ├─ i18n.ts                                     # 国际化配置入口
│  │  ├─ index.css                                   # 全局样式
│  │  └─ main.tsx                                    # 前端渲染入口
│  ├─ DESIGN.md                                      # 前端设计架构标准
│  ├─ README.md                                      # 前端说明文档
│  ├─ package-lock.json                              # Node.js 依赖锁定文件
│  ├─ package.json                                   # 前端工程依赖与脚本定义
│  ├─ postcss.config.js                              # PostCSS 样式预处理配置
│  ├─ tailwind.config.js                             # Tailwind CSS 样式配置
│  ├─ tsconfig.json                                  # TypeScript 编译配置
│  └─ vite.config.ts                                 # Vite 构建工具配置
├─ README.md                                         # 项目顶层综合说明文档
├─ implementation_plan.md                            # 系统实施与推进计划
├─ startup.sh                                        # 生产/开发一键启动 Shell 脚本
└─ technical_architecture.md                         # 系统技术架构设计设计书