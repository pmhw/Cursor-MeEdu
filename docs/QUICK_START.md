# 快速启动指南

## 立即开始

### 方法1：使用批处理文件（Windows）
```bash
# 双击运行
start.bat
```

### 方法2：手动启动
```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm start
```

### 方法3：开发模式（自动重启）
```bash
npm install
npm run dev
```

## 访问系统

启动成功后，打开浏览器访问：
- **Web界面**: http://localhost:3000
- **API文档**: 查看 README.md

## 快速测试

### 使用Node.js测试脚本
```bash
node test.js
```

### 使用curl测试API（需要先启动服务器）
```bash
# Linux/Mac
chmod +x api-test.sh
./api-test.sh

# Windows (Git Bash)
bash api-test.sh
```

## 系统功能

1. **添加学生** - 录入学生基本信息
2. **课时充值** - 学生购买课时并记录收入
3. **上课记录** - 学生上课时扣除课时
4. **信息查询** - 查看学生剩余课时和消费记录

## 数据库

- 使用SQLite本地数据库
- 数据库文件：`training.db`（自动创建）
- 包含3个表：学生表、收入表、上课表

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite3
- **前端**: 原生HTML + JavaScript
- **测试**: axios + curl

## 注意事项

1. 确保Node.js已安装（建议版本 >= 14）
2. 端口3000未被占用
3. 首次运行会自动创建数据库文件
4. 手机号具有唯一性约束
