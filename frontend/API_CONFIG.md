# API配置说明

## 环境配置

### 本地开发环境（不使用Docker）
创建 `frontend/.env.local` 文件：
```bash
VITE_API_URL=http://localhost:3000
```

### Docker环境
创建 `frontend/.env.docker` 文件：
```bash
VITE_API_URL=http://backend:3000
```

## 配置说明

1. **本地开发**：前端通过 `http://localhost:3000` 访问后端
2. **Docker环境**：前端通过 `http://backend:3000` 访问后端（Docker网络）

## 使用方法

### 本地开发
```bash
cd frontend
npm run dev
```

### Docker环境
```bash
# 构建前端
./build-frontend.sh

# 启动Docker服务
./deploy-dev.sh
```

## API测试

### 后端API测试
```bash
# 测试本地API
node test-api.js

# 测试Docker API
API_URL=http://localhost:3000 node test-api.js
```

### 前端API测试
在浏览器中访问API测试页面，可以测试所有接口的连通性。

## 接口列表

### 学生管理
- `GET /students` - 获取学生列表
- `GET /students/:id` - 获取学生详情
- `POST /students` - 添加学生
- `POST /students/:id/recharge` - 学生充值
- `POST /students/:id/consume` - 学生上课
- `POST /students/:id/delete` - 删除学生

### 统计报表
- `GET /stats` - 获取统计数据
- `GET /stats/income-trend` - 获取收入趋势
- `GET /stats/hours-trend` - 获取课时趋势

### 扣除项管理
- `GET /deduction-configs` - 获取扣除项列表
- `POST /deduction-configs` - 添加扣除项
- `PUT /deduction-configs/:id` - 更新扣除项

### 利润计算
- `GET /students/:id/profit` - 计算学生利润
- `GET /profit` - 计算总体利润

### 健康检查
- `GET /health` - 服务健康检查

## 注意事项

- 确保后端服务在对应端口运行
- Docker环境下需要确保网络配置正确
- 前端会自动根据环境变量选择正确的API地址
- 所有API返回JSON格式数据
- 错误响应包含 `success: false` 和错误信息
