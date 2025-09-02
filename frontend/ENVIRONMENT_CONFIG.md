# 前端环境配置指南

## 环境变量配置

### 开发环境 (.env.development)
```bash
# API配置
VITE_API_URL=http://localhost:3000

# 应用信息
VITE_APP_TITLE=MeEdu培训班管理系统
VITE_APP_VERSION=1.0.0
```

### 生产环境 (.env.production)
```bash
# API配置
VITE_API_URL=https://your-production-api.com

# 应用信息
VITE_APP_TITLE=MeEdu培训班管理系统
VITE_APP_VERSION=1.0.0
```

### 创建环境配置文件
```bash
# 复制模板文件
cp env.development.template .env.development
cp env.production.template .env.production

# 编辑配置文件
vim .env.development
vim .env.production
```

## 构建和部署

### 开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产环境构建
```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## API配置说明

### 环境变量使用
前端现在使用 `import.meta.env.VITE_API_URL` 来获取API地址，支持不同环境的配置：

- **开发环境**: `http://localhost:3000`
- **生产环境**: 可配置为实际的API地址

### 配置文件位置
- `frontend/src/main.js` - 全局axios配置
- `frontend/src/api/index.js` - 通用API配置
- `frontend/src/api/auth.js` - 认证API配置

### 代理配置
开发环境下，Vite代理配置会自动将 `/api` 请求转发到后端服务。

## Docker部署

### 前端Dockerfile
```dockerfile
# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
```

### 环境变量注入
在Docker构建时，可以通过以下方式注入环境变量：

```bash
# 构建时指定环境
docker build --build-arg VITE_API_URL=https://api.example.com .

# 或者使用.env文件
docker build --env-file .env.production .
```

## 常见问题

### 1. 环境变量不生效
确保环境变量以 `VITE_` 开头，Vite只会暴露这些变量给客户端。

### 2. 生产环境API地址配置
在生产环境中，需要将 `VITE_API_URL` 设置为实际的API服务器地址。

### 3. CORS问题
确保后端API服务器配置了正确的CORS策略，允许前端域名访问。

## 最佳实践

1. **环境分离**: 开发和生产环境使用不同的配置文件
2. **安全考虑**: 不要在前端暴露敏感信息
3. **版本管理**: 使用 `VITE_APP_VERSION` 管理应用版本
4. **错误处理**: 在API调用中添加适当的错误处理
