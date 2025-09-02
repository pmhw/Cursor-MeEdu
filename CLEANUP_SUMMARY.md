# 项目清理总结

## 已删除的测试文件

### 测试脚本
- `test-api.js` - API测试脚本
- `test_deduction_details.js` - 扣除项详情测试
- `test_delete_api.js` - 删除API测试
- `test_new_api.js` - 新API测试
- `api_test_new.js` - API测试新版本
- `test.js` - 通用测试文件
- `api-test.sh` - API测试shell脚本

### 迁移脚本
- `init_deductions.js` - 初始化扣除项
- `migrate_operation_logs.js` - 迁移操作日志
- `migrate_deductions.js` - 迁移扣除项
- `migrate_db.js` - 数据库迁移

### 部署脚本
- `start.bat` - 旧版启动脚本
- `start.sh` - 旧版启动脚本
- `stop.sh` - 停止脚本
- `restart.sh` - 重启脚本
- `build-frontend.sh` - 前端构建脚本
- `check-docker-config.sh` - Docker配置检查
- `deploy-dev.sh` - 开发环境部署
- `deploy.sh` - 生产环境部署
- `cleanup-db.sh` - 数据库清理
- `install-docker.sh` - Docker安装

### 前端脚本
- `frontend/start.bat` - 前端启动脚本
- `frontend/start_optimized.bat` - 前端优化启动脚本

### 过时文档
- `docs/提示词开发版本日志.md`
- `docs/提示词.md`
- `docs/DEDUCTION_FIX_README.md`
- `docs/STATS_FIX_README.md`
- `docs/INCOME_DELETE_FEATURE.md`
- `docs/INTELLIGENT_DEDUCTION_README.md`
- `docs/PROFIT_SYSTEM_README.md`
- `docs/FRONTEND_SETUP.md`
- `docs/API_DOCUMENTATION.md`
- `docs/DATABASE_SCHEMA.md`
- `SECURITY_AUDIT_REPORT.md`
- `README_DOCKER.md`
- `DEPLOY_SIMPLE.md`

### 其他文件
- `public/index.html` - 重复的HTML文件
- `public/` - 空目录

## 保留的核心文件

### 后端核心
- `app.js` - 主应用文件
- `package.json` - 依赖配置
- `Dockerfile` - Docker配置
- `docker-compose.yml` - Docker编排
- `migrate_auth_tables.js` - 认证表迁移

### 中间件和路由
- `middleware/` - 认证和授权中间件
- `routes/` - API路由

### 前端核心
- `frontend/` - Vue3前端应用
- `frontend/src/components/` - 组件
- `frontend/src/stores/` - Pinia状态管理
- `frontend/src/router/` - Vue Router配置
- `frontend/src/api/` - API客户端

### 启动脚本
- `start-with-auth.bat` - Windows启动脚本
- `start-with-auth.sh` - Linux/macOS启动脚本

### 文档
- `AUTH_DEPLOYMENT.md` - 认证部署指南
- `docs/README.md` - 主要文档
- `docs/QUICK_START.md` - 快速开始
- `docs/API_SUMMARY.md` - API摘要
- `docs/SYSTEM_OVERVIEW.md` - 系统概览

## 清理效果

1. **减少文件数量**: 删除了约30个不必要的文件
2. **简化项目结构**: 移除了过时的测试和部署脚本
3. **保留核心功能**: 保留了所有必要的认证和业务逻辑
4. **统一启动方式**: 使用新的认证启动脚本
5. **清理文档**: 移除了过时和重复的文档

## 建议

1. 使用 `start-with-auth.bat` (Windows) 或 `start-with-auth.sh` (Linux/macOS) 启动项目
2. 参考 `AUTH_DEPLOYMENT.md` 了解认证功能的使用
3. 查看 `docs/` 目录下的核心文档
4. 如需测试，使用现有的API端点进行功能验证
