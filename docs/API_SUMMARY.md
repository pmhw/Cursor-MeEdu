# 培训班课时管理系统 API 接口总结

## 🎯 接口概览

所有接口都已更新为新的格式和路径，统一返回JSON格式，包含成功/失败状态。

## 📋 接口列表

### 1. **POST /students** - 添加学生
- **功能**: 添加新学生到系统
- **请求体**: `{ "name": "张三", "phone": "13800138000" }`
- **成功响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "phone": "13800138000",
    "remaining_hours": 0
  },
  "message": "学生添加成功"
}
```

### 2. **GET /students** - 获取所有学生
- **功能**: 获取系统中所有学生的列表
- **请求参数**: 无
- **成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "张三",
      "phone": "13800138000",
      "remaining_hours": 18
    }
  ],
  "message": "获取学生列表成功"
}
```

### 3. **GET /students/:id** - 获取学生详情
- **功能**: 获取指定学生的详细信息，包括剩余课时、充值记录和上课记录
- **路径参数**: `id` - 学生ID
- **成功响应**:
```json
{
  "success": true,
  "data": {
    "student": {
      "id": 1,
      "name": "张三",
      "phone": "13800138000",
      "remaining_hours": 18
    },
    "income_records": [
      {
        "id": 1,
        "student_id": 1,
        "amount": 1000,
        "date": "2024-01-01"
      }
    ],
    "class_records": [
      {
        "id": 1,
        "student_id": 1,
        "hours_used": 2,
        "date": "2024-01-01"
      }
    ]
  },
  "message": "获取学生详情成功"
}
```

### 4. **POST /students/:id/recharge** - 学生充值
- **功能**: 为学生充值课时和金额
- **路径参数**: `id` - 学生ID
- **请求体**: `{ "amount": 1000, "hours": 20 }`
- **成功响应**:
```json
{
  "success": true,
  "data": {
    "student_id": 1,
    "amount": 1000,
    "hours": 20,
    "date": "2024-01-01"
  },
  "message": "充值成功"
}
```

### 5. **POST /students/:id/consume** - 学生上课
- **功能**: 学生上课，扣除相应课时
- **路径参数**: `id` - 学生ID
- **请求体**: `{ "hours_used": 2 }`
- **成功响应**:
```json
{
  "success": true,
  "data": {
    "student_id": 1,
    "hours_used": 2,
    "remaining_hours": 16,
    "date": "2024-01-01"
  },
  "message": "上课记录成功"
}
```

### 6. **POST /students/:id/delete** - 删除学生
- **功能**: 删除指定学生及其所有相关记录
- **路径参数**: `id` - 学生ID
- **请求体**: 无
- **成功响应**:
```json
{
  "success": true,
  "data": {
    "student_id": 1,
    "deleted_student": {
      "id": 1,
      "name": "张三",
      "phone": "13800138000",
      "remaining_hours": 18
    }
  },
  "message": "学生删除成功"
}
```

### 7. **GET /stats** - 获取统计数据
- **功能**: 获取指定时间段的统计数据
- **查询参数**: `period` - 时间段 (all/month/week/today)
- **成功响应**:
```json
{
  "success": true,
  "data": {
    "total_income": 125000,
    "income_count": 45,
    "total_students": 45,
    "total_hours": 1800,
    "total_classes": 320,
    "total_hours_used": 1560,
    "new_students": 45,
    "recharge_hours": 1800
  },
  "message": "获取统计数据成功"
}
```

### 8. **GET /stats/income-trend** - 获取收入趋势
- **功能**: 获取收入趋势数据
- **查询参数**: `months` - 查询月数 (默认12)
- **成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "month": "2024-01",
      "total_amount": 15000,
      "count": 8
    }
  ],
  "message": "获取收入趋势成功"
}
```

### 9. **GET /stats/hours-trend** - 获取课时趋势
- **功能**: 获取课时消耗趋势数据
- **查询参数**: `months` - 查询月数 (默认12)
- **成功响应**:
```json
{
  "success": true,
  "data": [
    {
      "month": "2024-01",
      "total_hours": 120,
      "count": 15
    }
  ],
  "message": "获取课时趋势成功"
}
```

## 🔄 统一响应格式

### 成功响应
```json
{
  "success": true,
  "data": { /* 具体数据 */ },
  "message": "操作成功描述"
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误类型",
  "message": "错误描述"
}
```

## 📊 错误码说明

| 状态码 | 错误类型 | 说明 |
|--------|----------|------|
| 400 | 参数错误 | 请求参数缺失或格式错误 |
| 400 | 数据重复 | 手机号已存在 |
| 400 | 课时不足 | 剩余课时不足以完成操作 |
| 404 | 学生不存在 | 指定的学生ID不存在 |
| 500 | 数据库操作失败 | 服务器内部错误 |
| 500 | 删除失败 | 删除学生或相关记录失败 |

## 🧪 测试方法

### 使用测试脚本
```bash
node test_new_api.js
```

### 使用 curl 测试
```bash
# 添加学生
curl -X POST http://localhost:3000/students \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","phone":"13800138000"}'

# 获取所有学生
curl -X GET http://localhost:3000/students

# 获取学生详情
curl -X GET http://localhost:3000/students/1

# 学生充值
curl -X POST http://localhost:3000/students/1/recharge \
  -H "Content-Type: application/json" \
  -d '{"amount":1000,"hours":20}'

# 学生上课
curl -X POST http://localhost:3000/students/1/consume \
  -H "Content-Type: application/json" \
  -d '{"hours_used":2}'

# 删除学生
curl -X POST http://localhost:3000/students/1/delete

# 获取统计数据
curl -X GET "http://localhost:3000/stats?period=month"

# 获取收入趋势
curl -X GET "http://localhost:3000/stats/income-trend?months=12"

# 获取课时趋势
curl -X GET "http://localhost:3000/stats/hours-trend?months=12"
```

## ✨ 主要改进

1. **统一路径**: 所有接口都使用 `/students` 作为基础路径
2. **统一返回格式**: 所有接口都返回包含 `success`、`data`、`message` 的JSON
3. **错误处理**: 完善的错误处理和状态码
4. **接口命名**: 更直观的接口命名（如 `consume` 替代 `attend-class`）
5. **数据完整性**: 使用事务确保数据一致性
6. **级联删除**: 删除学生时自动删除相关的充值记录和上课记录

## 🚀 启动服务器

```bash
node app.js
```

服务器将在 `http://localhost:3000` 启动，并显示所有可用的API端点。
