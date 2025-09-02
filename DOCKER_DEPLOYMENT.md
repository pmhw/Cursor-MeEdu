# MeEdu 服务端 Docker 部署指南

## 优化内容

### Dockerfile 优化
- ✅ **依赖安装优化**: 使用 `npm install` 替代 `npm ci`，兼容没有 package-lock.json 的情况
- ✅ **缓存清理**: 安装后清理 npm 缓存，减少镜像大小
- ✅ **编译工具**: 添加 python3、make、g++ 等编译工具，确保所有 npm 包能正确安装
- ✅ **目录结构**: 添加 uploads 目录，为文件上传功能做准备
- ✅ **权限优化**: 统一设置整个应用目录的权限
- ✅ **环境变量**: 明确设置生产环境变量
- ✅ **健康检查优化**: 调整超时时间和启动等待时间

### Docker Compose 优化
- ✅ **环境变量支持**: 添加环境变量文件支持
- ✅ **安全配置**: 支持 JWT_SECRET 和 SESSION_SECRET 环境变量
- ✅ **资源限制**: 添加内存和 CPU 限制，防止资源滥用
- ✅ **日志管理**: 配置日志轮转，防止日志文件过大
- ✅ **网络配置**: 明确指定网络子网
- ✅ **卷管理**: 添加 uploads 卷，支持文件上传持久化

## 部署步骤

### 1. 准备环境
```bash
# 创建必要的目录
mkdir -p data logs uploads

# 复制环境变量文件
cp env.example .env

# 编辑环境变量（重要！）
vim .env
```

### 2. 构建和启动
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

### 3. 验证部署
```bash
# 检查健康状态
curl http://localhost:3000/health

# 检查API状态
curl http://localhost:3000/auth/login
```

## 环境变量配置

### 必需的环境变量
```bash
# 安全配置（生产环境必须修改）
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-super-secret-session-key-change-in-production

# 应用配置
NODE_ENV=production
PORT=3000
```

### 可选的环境变量
```bash
# 数据库配置
DB_PATH=./training.db

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# 安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5

# CORS配置
CORS_ORIGIN=true
CORS_CREDENTIALS=true

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

## 常用命令

### 服务管理
```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

### 镜像管理
```bash
# 重新构建镜像
docker-compose build --no-cache

# 清理镜像
docker system prune -f

# 查看镜像大小
docker images
```

### 数据管理
```bash
# 备份数据库
cp data/training.db backup/training_$(date +%Y%m%d_%H%M%S).db

# 查看数据目录
ls -la data/

# 查看日志
tail -f logs/app.log
```

## 性能优化

### 资源限制
- **内存限制**: 512MB 最大，256MB 预留
- **CPU限制**: 0.5 核心最大，0.25 核心预留
- **日志轮转**: 10MB 最大，保留 3 个文件

### 缓存策略
- **Docker层缓存**: 优化 package.json 复制顺序
- **npm缓存**: 安装后清理缓存
- **健康检查**: 30秒间隔，10秒超时

## 安全建议

### 生产环境必须修改
1. **JWT密钥**: 使用强随机字符串
2. **Session密钥**: 使用强随机字符串
3. **环境变量**: 不要使用默认值
4. **网络访问**: 配置防火墙规则

### 安全配置
```bash
# 生成强密钥
openssl rand -base64 32

# 设置环境变量
export JWT_SECRET=$(openssl rand -base64 32)
export SESSION_SECRET=$(openssl rand -base64 32)
```

## 故障排除

### 常见问题
1. **端口冲突**: 检查 3000 端口是否被占用
2. **权限问题**: 确保 data、logs、uploads 目录有正确权限
3. **内存不足**: 调整 docker-compose.yml 中的资源限制
4. **健康检查失败**: 检查应用是否正常启动

### 调试命令
```bash
# 进入容器
docker-compose exec backend sh

# 查看进程
docker-compose exec backend ps aux

# 查看网络
docker network ls

# 查看卷
docker volume ls
```

## 监控和维护

### 监控指标
- **容器状态**: `docker-compose ps`
- **资源使用**: `docker stats`
- **日志监控**: `docker-compose logs -f`
- **健康检查**: `curl http://localhost:3000/health`

### 定期维护
- **日志清理**: 定期清理旧日志文件
- **镜像更新**: 定期更新基础镜像
- **数据备份**: 定期备份数据库文件
- **安全更新**: 定期更新依赖包
