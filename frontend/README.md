# 保险AI系统前端

## 🎨 技术栈

- **框架**: React 18 + TypeScript 4.9
- **UI库**: Ant Design 5.x
- **状态管理**: Redux Toolkit
- **路由**: React Router 6
- **HTTP客户端**: Axios
- **构建工具**: Vite
- **图标**: Ant Design Icons
- **图表**: ECharts for React
- **表单**: React Hook Form + Yup

## 📁 项目结构

```
frontend/
├── public/                 # 静态资源
│   ├── favicon.ico
│   ├── logo.svg
│   └── robots.txt
├── src/
│   ├── api/               # API接口
│   │   ├── auth.ts        # 认证相关API
│   │   ├── claims.ts      # 报案相关API
│   │   ├── audit.ts       # 审核相关API
│   │   └── ai.ts          # AI服务API
│   │   └── index.ts       # API配置
│   ├── assets/            # 静态资源
│   │   ├── images/        # 图片
│   │   ├── icons/         # 图标
│   │   └── styles/        # 全局样式
│   ├── components/        # 通用组件
│   │   ├── common/        # 基础组件
│   │   │   ├── Loading/
│   │   │   ├── Error/
│   │   │   └── Empty/
│   │   ├── business/      # 业务组件
│   │   │   ├── ClaimForm/
│   │   │   ├── ImageUpload/
│   │   │   ├── AuditTable/
│   │   │   └── AgentStatus/
│   │   └── layout/        # 布局组件
│   │       ├── Header/
│   │       ├── Sidebar/
│   │       └── Layout/
│   ├── features/          # 功能模块（按业务拆分）
│   │   ├── auth/          # 认证模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── slices/
│   │   │   └── types/
│   │   ├── claims/        # 报案模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── slices/
│   │   │   └── types/
│   │   ├── audit/         # 审核模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── slices/
│   │   │   └── types/
│   │   ├── knowledge/     # 知识库模块
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── slices/
│   │   │   └── types/
│   │   └── dashboard/     # 仪表板模块
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── slices/
│   │       └── types/
│   ├── hooks/             # 自定义hooks
│   │   ├── useAuth/
│   │   ├── useClaims/
│   │   ├── useAudit/
│   │   └── useApi/
│   ├── routes/            # 路由配置
│   │   ├── public/
│   │   ├── private/
│   │   └── index.tsx
│   ├── store/             # Redux store
│   │   ├── slices/
│   │   ├── hooks/
│   │   └── index.ts
│   ├── types/             # TypeScript类型定义
│   │   ├── api/
│   │   ├── entities/
│   │   └── ui/
│   ├── utils/             # 工具函数
│   │   ├── api/
│   │   ├── validation/
│   │   ├── format/
│   │   └── constants/
│   ├── App.tsx            # 应用根组件
│   ├── main.tsx           # 应用入口
│   └── index.css          # 全局样式
├── tests/                 # 测试文件
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   └── e2e/               # 端到端测试
├── .env.example           # 环境变量示例
├── vite.config.ts         # Vite配置
├── tsconfig.json          # TypeScript配置
├── package.json           # 项目配置
└── README.md              # 说明文档
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 8+ 或 yarn 1.22+

### 安装步骤

```bash
# 克隆项目并进入前端目录
cd insurance_ai_system/frontend

# 安装依赖
npm install
# 或使用 yarn
yarn install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置后端API地址

# 启动开发服务器
npm run dev
# 或使用 yarn
yarn dev

# 构建生产版本
npm run build
# 或使用 yarn
yarn build

# 预览生产版本
npm run preview
# 或使用 yarn
yarn preview
```

### 环境变量配置

```bash
# .env 文件配置示例

# 后端API地址
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_BASE_URL=ws://localhost:8000

# AI服务配置
VITE_AI_MODEL=gpt-4

# 文件上传配置
VITE_MAX_FILE_SIZE=10
VITE_UPLOAD_URL=http://localhost:8000/upload

# 第三方服务
VITE_ANALYTICS_ID=your-analytics-id
```

## 📝 开发规范

### 命名规范
- 文件命名：kebab-case（如：claim-form.tsx）
- 目录命名：kebab-case（如：image-upload/）
- 变量命名：camelCase（如：claimNumber）
- 常量命名：UPPER_SNAKE_CASE（如：MAX_FILE_SIZE）
- 组件命名：PascalCase（如：ClaimForm）
- 类型命名：PascalCase（如：ClaimType）

### 组件规范
```typescript
// 推荐的文件结构
// components/ClaimForm/ClaimForm.tsx
// components/ClaimForm/ClaimForm.module.css
// components/ClaimForm/types.ts
// components/ClaimForm/index.ts

// 组件示例
import React from 'react';
import { Form, Input, Button } from 'antd';

interface ClaimFormProps {
  onSubmit: (data: ClaimFormData) => void;
  initialData?: ClaimFormData;
}

export const ClaimForm: React.FC<ClaimFormProps> = ({
  onSubmit,
  initialData
}) => {
  return (
    <Form onFinish={onSubmit} initialValues={initialData}>
      {/* 表单内容 */}
    </Form>
  );
};

export default ClaimForm;
```

### API规范
```typescript
// api/claims.ts
import { apiClient } from './client';

export interface ClaimData {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export const claimsApi = {
  // 获取报案列表
  getClaims: (params: GetClaimsParams) => {
    return apiClient.get<{ data: ClaimData[]; total: number }>('/claims', { params });
  },

  // 创建报案
  createClaim: (data: CreateClaimData) => {
    return apiClient.post<ClaimData>('/claims', data);
  },

  // 获取单个报案详情
  getClaimById: (id: string) => {
    return apiClient.get<ClaimData>(`/claims/${id}`);
  }
};
```

## 🧪 测试

```bash
# 运行所有测试
npm run test
# 或使用 yarn
yarn test

# 运行特定测试文件
npm run test -- src/features/claims/

# 运行测试并生成覆盖率报告
npm run test:coverage

# 端到端测试
npm run test:e2e

# 查看测试覆盖率
npm run test:report
```

## 📈 性能优化

### 构建优化
```bash
# 分析包大小
npm run build:analyze

# 生成性能报告
npm run build:report
```

### 开发建议
1. **使用React.memo**：对不经常变化的组件使用memo包裹
2. **useCallback和useMemo**：优化函数和计算
3. **代码分割**：使用React.lazy和Suspense实现按需加载
4. **图片优化**：使用webp格式，实现图片懒加载
5. **API缓存**：合理使用React Query或SWR进行数据缓存

## 🎨 主题定制

### 修改Ant Design主题
```typescript
// src/styles/theme.ts
import { theme, ThemeConfig } from 'antd';

export const customTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 4,
      fontWeight: 500,
    },
    Card: {
      borderRadius: 8,
    },
  },
};
```

## 🔒 安全配置

### 安全头设置
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    },
  },
});
```

## 🚀 生产部署

### Docker部署
```bash
# 构建镜像
docker build -t insurance-ai-frontend .

# 运行容器
docker run -d \
  -p 3000:80 \
  --name insurance-ai-frontend \
  insurance-ai-frontend
```

### 静态部署
```bash
# 构建生产版本
npm run build

# 上传到CDN或静态服务器
# 构建文件位于 dist/ 目录
```

## 📋 常用命令

```bash
# 创建新组件（开发脚本）
npm run create:component

# 代码格式化
npm run format

# 代码检查
npm run lint

# TypeScript检查
npm run type-check

# 预提交检查
npm run pre-commit
```

## 🤝 贡献指南

1. Fork项目并创建功能分支
2. 遵循代码规范和提交规范
3. 编写相应的测试用例
4. 更新相关文档
5. 提交Pull Request

## 📞 问题反馈

如发现bug或有改进建议，请创建issues或通过邮件联系前端维护团队。