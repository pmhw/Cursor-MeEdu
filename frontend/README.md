# 培训班课时管理系统前端

基于 Vue3 + Element Plus 的前端界面，用于管理培训班学生的课时和收入记录。


## 界面展示



## 🚀 技术栈

- **Vue 3** - 渐进式JavaScript框架
- **Element Plus** - Vue 3的UI组件库
- **Vite** - 现代前端构建工具
- **Axios** - HTTP客户端
- **Vue Router** - 路由管理（如需要）

## 📁 项目结构

```
frontend/
├── src/
│   ├── components/          # 组件目录
│   │   ├── StudentList.vue  # 学生列表组件
│   │   └── StudentDetail.vue # 学生详情组件
│   ├── api/                 # API接口
│   │   └── index.js        # API配置和接口定义
│   ├── App.vue             # 主应用组件
│   └── main.js             # 应用入口
├── index.html              # HTML模板
├── package.json            # 项目配置
├── vite.config.js          # Vite配置
└── README.md               # 项目说明
```

## 🛠️ 安装和运行

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

前端将在 `http://localhost:3001` 启动。

### 3. 构建生产版本

```bash
npm run build
```

## 🔧 配置说明

### Vite代理配置

前端通过Vite代理将API请求转发到后端：

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',  // 后端地址
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

### API基础配置

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

## 📱 功能特性

### 1. 首页仪表板
- **业绩统计**: 总收入、总学生数、总课时、总上课次数
- **动态图表**: 收入趋势图、课时消耗趋势图
- **时间筛选**: 全部、当月、本周、今日数据统计
- **详细统计表**: 各时间段详细数据展示

### 2. 学生管理
- **完整列表**: 学生列表完整显示，支持分页
- **弹窗详情**: 学生详情以弹窗形式展示，不占用主界面空间
- **快速操作**: 充值、上课、删除等操作按钮

### 3. 学生详情弹窗
- 基本信息（ID、姓名、手机号、剩余课时）
- 充值记录列表
- 上课记录列表
- 统计信息（总充值金额、总消耗课时等）

### 4. 课时操作
- **充值功能**: 输入金额和课时数进行充值
- **上课记录**: 输入消耗课时数记录上课
- **删除学生**: 安全删除学生及所有相关记录

### 5. 响应式设计
- 支持不同屏幕尺寸
- 移动端友好的布局
- 现代化UI设计

## 🔌 API接口

前端调用以下后端API：

- `GET /students` - 获取所有学生
- `GET /students/:id` - 获取学生详情
- `POST /students` - 添加学生
- `POST /students/:id/recharge` - 学生充值
- `POST /students/:id/consume` - 学生上课

## 🎨 UI组件

### Element Plus组件使用
- **el-table** - 数据表格
- **el-card** - 卡片容器
- **el-dialog** - 对话框
- **el-form** - 表单
- **el-button** - 按钮
- **el-tag** - 标签
- **el-statistic** - 统计数值
- **el-descriptions** - 描述列表

### 自定义样式
- 渐变头部背景
- 圆角设计
- 悬停效果
- 响应式布局

## 📱 使用说明

### 1. 查看学生列表
- 页面左侧显示所有学生
- 点击学生行可查看详情

### 2. 添加学生
- 点击"添加学生"按钮
- 填写姓名和手机号
- 提交后自动刷新列表

### 3. 学生充值
- 在学生列表点击"充值"按钮
- 输入充值金额和课时数
- 提交后自动更新学生信息

### 4. 记录上课
- 在学生列表点击"上课"按钮
- 输入消耗课时数
- 提交后自动更新剩余课时

### 5. 查看详情
- 点击学生行后右侧显示详情
- 包含基本信息、充值记录、上课记录
- 可点击刷新按钮更新数据

## 🚨 注意事项

1. **后端服务**: 确保后端Express服务器在3000端口运行
2. **数据库**: 确保SQLite数据库文件存在且有读写权限
3. **CORS**: 前端通过Vite代理解决跨域问题
4. **端口冲突**: 如果3001端口被占用，Vite会自动选择其他端口

## 🔍 调试

### 控制台日志
- API请求和响应都会在控制台显示
- 错误信息会通过Element Plus消息提示显示

### 网络请求
- 在浏览器开发者工具的Network标签页查看API请求
- 通过Vite代理的请求会显示为相对路径

## 📈 扩展建议

1. **路由管理**: 添加Vue Router实现页面路由
2. **状态管理**: 使用Pinia管理全局状态
3. **数据缓存**: 实现数据缓存减少API调用
4. **权限控制**: 添加用户登录和权限验证
5. **数据导出**: 支持导出学生数据为Excel
6. **图表展示**: 添加图表展示统计信息

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！
