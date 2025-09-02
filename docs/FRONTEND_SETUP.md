# 🚀 前端项目快速启动指南

## 📋 前置要求

1. **Node.js**: 版本 16+ (推荐 18+)
2. **npm**: 通常随Node.js一起安装
3. **后端服务**: 确保Express后端在3000端口运行

## 🎯 快速启动

### 方法1: 使用批处理文件 (Windows)
```bash
# 双击运行
frontend/start.bat
```

### 方法2: 手动启动
```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

## 🌐 访问地址

- **前端界面**: http://localhost:3001
- **后端API**: http://localhost:3000

## 🔧 项目配置

### Vite代理配置
前端通过Vite代理将API请求转发到后端，解决跨域问题：

```javascript
// vite.config.js
server: {
  port: 3001,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',  // 后端地址
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

### API配置
```javascript
// src/api/index.js
const api = axios.create({
  baseURL: '/api',  // 通过代理转发
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})
```

## 📱 功能演示

### 1. 学生管理
- 查看学生列表
- 添加新学生
- 点击学生行查看详情

### 2. 课时操作
- **充值**: 输入金额和课时数
- **上课**: 输入消耗课时数
- 实时更新剩余课时

### 3. 数据展示
- 学生基本信息
- 充值记录历史
- 上课记录历史
- 统计信息汇总

## 🎨 界面特色

- **现代化设计**: 使用Element Plus组件库
- **响应式布局**: 支持不同屏幕尺寸
- **渐变头部**: 美观的渐变色标题栏
- **卡片式布局**: 清晰的信息分组
- **交互反馈**: 丰富的按钮状态和提示

## 🔍 调试信息

### 控制台日志
- API请求和响应都会在控制台显示
- 错误信息会通过Element Plus消息提示

### 网络请求
- 在浏览器开发者工具的Network标签页查看
- 通过Vite代理的请求会显示为相对路径

## 🚨 常见问题

### 1. 端口被占用
如果3001端口被占用，Vite会自动选择其他端口，查看控制台输出确认实际端口号。

### 2. 后端连接失败
确保Express后端服务器在3000端口运行，检查控制台是否有连接错误。

### 3. 依赖安装失败
尝试清除npm缓存：
```bash
npm cache clean --force
npm install
```

### 4. 页面空白
检查浏览器控制台是否有JavaScript错误，确保所有依赖正确安装。

## 📈 开发建议

### 热重载
Vite提供快速的热重载功能，修改代码后页面会自动刷新。

### 组件开发
- 使用Vue 3 Composition API
- 组件间通过props和emit通信
- 使用Element Plus组件保持UI一致性

### 状态管理
当前使用组件内状态管理，如需全局状态可考虑添加Pinia。

## 🔗 相关链接

- [Vue 3 官方文档](https://vuejs.org/)
- [Element Plus 组件库](https://element-plus.org/)
- [Vite 构建工具](https://vitejs.dev/)
- [Axios HTTP客户端](https://axios-http.com/)

## 🤝 技术支持

如遇到问题，请检查：
1. Node.js版本是否兼容
2. 后端服务是否正常运行
3. 浏览器控制台是否有错误信息
4. 网络请求是否正常

---

**享受使用培训班课时管理系统的前端界面！** 🎉
