# 保险AI系统后端服务

## 🛠️ 技术栈

- **框架**: FastAPI + SQLAlchemy
- **数据库**: PostgreSQL + MongoDB
- **缓存**: Redis
- **AI服务**: OpenAI API + HuggingFace Transformers
- **其他**: Celery (异步任务), Pydantic (数据验证)

## 📁 项目结构

```
backend/
├── app/
│   ├── api/              # API路由
│   │   ├── v1/           # v1版本API
│   │   │   ├── auth.py    # 认证接口
│   │   │   ├── claims.py  # 报案接口
│   │   │   ├── audit.py   # 审核接口
│   │   │   └── ai.py      # AI服务接口
│   │   └── deps.py      # 依赖注入
│   ├── core/            # 核心配置
│   │   ├── config.py    # 配置文件
│   │   ├── security.py  # 安全配置
│   │   └── events.py    # 事件处理
│   ├── models/          # 数据模型
│   │   ├── user.py      # 用户模型
│   │   ├── claim.py     # 报案模型
│   │   └── policy.py    # 保单模型
│   ├── schemas/         # Pydantic模型
│   │   ├── user.py      # 用户Schema
│   │   ├── claim.py     # 报案Schema
│   │   └── response.py  # 响应Schema
│   ├── services/        # 业务服务
│   │   ├── ai/          # AI服务
│   │   │   ├── agents.py     # 多Agent系统
│   │   │   ├── dialog.py     # 对话引擎
│   │   │   ├── ocr.py        # OCR服务
│   │   │   └── rag.py        # RAG检索
│   │   ├── claims.py    # 报案服务
│   │   ├── audit.py     # 审核服务
│   │   └── knowledge.py  # 知识库服务
│   ├── utils/           # 工具函数
│   │   ├── database.py  # 数据库工具
│   │   ├── logger.py    # 日志工具
│   │   └── validators.py# 验证器
│   └── main.py          # 应用入口
├── scripts/              # 脚本文件
│   ├── init_db.py       # 数据库初始化
│   ├── migrate.py       # 数据迁移
│   └── seed_data.py     # 测试数据
├── tests/                # 测试文件
│   ├── unit/            # 单元测试
│   └── integration/     # 集成测试
├── alembic/              # 数据库迁移
├── requirements.txt      # Python依赖
└── pyproject.toml        # 项目配置
```

## 🚀 快速开始

### 环境要求
- Python 3.10+
- PostgreSQL 13+
- Redis 6+
- MongoDB 5+

### 安装步骤

```bash
# 克隆项目
cd insurance_ai_system/backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 
venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入相应的配置信息

# 初始化数据库
python scripts/init_db.py

# 运行数据库迁移
alembic upgrade head

# 启动开发服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 环境变量配置

```bash
# .env 文件配置示例

# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/insurance_ai
MONGODB_URL=mongodb://localhost:27017/insurance_ai
REDIS_URL=redis://localhost:6379/0

# JWT配置
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI服务配置
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# OCR配置
OCR_API_KEY=your-ocr-api-key

# 文件存储
STORAGE_TYPE=local  # 或 s3, minio
UPLOAD_DIR=uploads/

# 日志配置
LOG_LEVEL=INFO
LOG_DIR=logs/
```

## 📊 API文档

服务启动后，访问以下URL查看API文档：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧪 测试

```bash
# 运行所有测试
python -m pytest

# 运行特定测试文件
python -m pytest tests/test_claims.py

# 运行测试并生成覆盖率报告
python -m pytest --cov=app tests/
```

## 📈 监控和日志

### 健康检查
```bash
# 访问健康检查接口
GET /health
```

### 日志文件位置
- 应用日志: `logs/app.log`
- 访问日志: `logs/access.log`
- 错误日志: `logs/error.log`

## 🔧 数据库管理

### 创建数据库迁移
```bash
alembic revision --autogenerate -m "描述信息"
alembic upgrade head
```

### 重置数据库
```bash
python scripts/init_db.py --reset
```

## 🚀 生产部署

### Docker部署
```bash
# 构建镜像
docker build -t insurance-ai-backend .

# 运行容器
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name insurance-ai-backend \
  insurance-ai-backend
```

### Docker Compose
```bash
docker-compose up -d
```

## 📋 项目管理命令

```bash
# 代码格式化
black .
isort .

# 代码检查
flake8 .
mypy .

# 依赖更新
pip freeze > requirements.txt
```

## 🤝 贡献指南

1. Fork项目并创建分支
2. 遵循PEP 8代码规范
3. 添加必要的测试用例
4. 更新相关文档
5. 提交Pull Request

## 📞 问题反馈

如发现bug或有改进建议，请创建issues或通过邮件联系维护团队。