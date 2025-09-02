# 培训班课时管理系统 - 认证功能部署指南

## 🎯 功能概述

本系统现已集成完整的用户认证和权限管理功能，包括：

- ✅ 用户登录/登出
- ✅ JWT令牌认证
- ✅ 基于角色的权限控制 (RBAC)
- ✅ 密码加密存储
- ✅ 登录失败限制
- ✅ 操作日志记录
- ✅ 会话管理
- ✅ 用户管理（管理员功能）

## 🚀 快速启动

### 方法1：使用启动脚本（推荐）

#### Linux/macOS
```bash
chmod +x start-with-auth.sh
./start-with-auth.sh
```

#### Windows
```cmd
start-with-auth.bat
```

### 方法2：手动启动

1. **安装依赖**
   ```bash
   # 后端依赖
   npm install
   
   # 前端依赖
   cd frontend
   npm install
   cd ..
   ```

2. **数据库迁移**
   ```bash
   node migrate_auth_tables.js
   ```

3. **构建前端**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

4. **启动Docker服务**
   ```bash
   docker-compose up --build -d
   ```

## 🔐 默认账户

系统会自动创建默认管理员账户：

- **用户名**: `admin`
- **密码**: `admin123`
- **角色**: 管理员

⚠️ **重要提醒**: 请在生产环境中立即修改默认密码！

## 👥 用户角色说明

### 管理员 (admin)
- 所有功能权限
- 用户管理
- 系统配置
- 数据删除

### 教师 (teacher)
- 查看学生信息
- 记录上课情况
- 查看统计数据
- 扣除项管理

### 操作员 (operator)
- 基础学生管理
- 收入记录
- 查看基础统计

## 🗄️ 数据库结构

新增的认证相关表：

```sql
-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'operator')),
  real_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 用户会话表
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 登录失败记录表
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip_address TEXT,
  attempt_time TEXT DEFAULT (datetime('now', 'localtime')),
  success INTEGER DEFAULT 0
);
```

## 🔧 配置说明

### 环境变量

复制 `env.example` 为 `.env` 并修改：

```bash
# JWT密钥（生产环境必须修改）
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# 会话密钥
SESSION_SECRET=your-session-secret-change-in-production

# 登录限制
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_TIME=5
```

### Docker配置

`docker-compose.yml` 已更新以支持：

- 数据持久化 (`./data`)
- 日志持久化 (`./logs`)
- 健康检查
- 端口映射 (3000:3000)

## 📱 前端功能

### 登录页面
- 用户名/密码输入
- 记住登录状态
- 错误提示
- 响应式设计

### 权限控制
- 基于角色的菜单显示
- API接口权限验证
- 自动跳转登录页

### 用户管理
- 用户列表查看
- 创建新用户
- 启用/禁用用户
- 角色分配

## 🔒 安全特性

### 密码安全
- bcrypt加密存储
- 密码强度验证
- 最小长度要求

### 认证安全
- JWT令牌
- 令牌过期机制
- 登录失败限制
- IP地址记录

### 权限安全
- 基于角色的访问控制
- API接口权限验证
- 操作日志记录

## 🚨 故障排除

### 常见问题

1. **登录失败**
   - 检查用户名密码
   - 确认用户账户已启用
   - 查看登录失败次数限制

2. **权限不足**
   - 确认用户角色
   - 检查API接口权限要求
   - 联系管理员分配权限

3. **令牌过期**
   - 重新登录
   - 检查JWT配置
   - 查看令牌过期时间

### 日志查看

```bash
# 查看Docker日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
```

## 📚 API文档

### 认证接口

- `POST /auth/login` - 用户登录
- `POST /auth/logout` - 用户登出
- `GET /auth/profile` - 获取用户信息
- `PUT /auth/profile` - 更新用户信息
- `POST /auth/change-password` - 修改密码
- `GET /auth/verify` - 验证令牌

### 用户管理接口（管理员）

- `POST /auth/register` - 创建用户
- `GET /auth/users` - 获取用户列表
- `PUT /auth/users/:id/status` - 更新用户状态

## 🔄 更新升级

### 数据库迁移
```bash
node migrate_auth_tables.js
```

### 代码更新
```bash
git pull origin main
npm install
cd frontend && npm install && npm run build
docker-compose up --build -d
```

## 📞 技术支持

如遇到问题，请检查：

1. Docker服务状态
2. 数据库连接
3. 环境变量配置
4. 日志错误信息
5. 网络端口占用

---

🎉 **恭喜！您的培训班课时管理系统现已具备完整的认证和权限管理功能！**
