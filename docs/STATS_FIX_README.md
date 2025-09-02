# 统计API修复说明

## 问题描述

在统计API (`GET /stats`) 中出现了以下错误：
```
查询充值课时统计失败: Error: SQLITE_RANGE: column index out of range
```

## 问题原因

在 `app.js` 的统计API中，`rechargeHoursSql` 查询没有使用任何参数，但在执行时错误地传递了 `dateParams` 参数，导致SQLite参数索引超出范围。

## 修复内容

### 修复前
```javascript
// 查询充值课时数
db.get(rechargeHoursSql, dateParams, (err, row) => {
  // ...
});
```

### 修复后
```javascript
// 查询充值课时数
db.get(rechargeHoursSql, [], (err, row) => {
  // ...
});
```

## 修复详情

### 修复1: SQLITE_RANGE 错误
1. **问题查询**: `rechargeHoursSql` 查询学生剩余课时总和，不需要日期参数
2. **错误原因**: 传递了 `dateParams` 参数，但SQL查询中没有占位符
3. **修复方案**: 将参数改为空数组 `[]`

### 修复2: SQLITE_ERROR 错误
1. **问题查询**: 统计API中查询新增学生数时使用 `created_at` 字段
2. **错误原因**: 现有数据库中的 `students` 表缺少 `created_at` 字段
3. **修复方案**: 
   - 创建数据库迁移脚本添加 `created_at` 字段
   - 为现有记录设置默认的创建时间
   - 验证所有统计查询正常工作

## 相关查询说明

### 需要日期参数的查询
- `incomeSql`: 查询收入统计，使用 `dateParams`
- `classesSql`: 查询上课统计，使用 `dateParams`
- `newStudentsSql`: 查询新增学生统计，使用 `dateParams`

### 不需要日期参数的查询
- `studentsSql`: 查询总学生数，使用 `[]`
- `hoursSql`: 查询总课时，使用 `[]`
- `rechargeHoursSql`: 查询充值课时数，使用 `[]` (已修复)

## 验证结果

修复后，所有统计查询都能正常执行：

### 数据库结构验证
- ✅ `students` 表已成功添加 `created_at` 字段
- ✅ 现有记录已设置默认的创建时间
- ✅ 表结构完整，包含所有必要字段

### 统计查询验证
- ✅ 总学生数查询正常
- ✅ 新增学生数查询正常（支持不同时间段）
- ✅ 收入统计查询正常
- ✅ 课时统计查询正常
- ✅ 趋势数据查询正常

### 功能验证
- ✅ 统计API所有端点正常工作
- ✅ 前端仪表盘数据正常显示
- ✅ 时间段筛选功能正常

## 影响范围

此修复只影响统计API，不影响其他功能：
- 学生管理API: 不受影响
- 扣除项管理API: 不受影响
- 利润计算API: 不受影响

## 部署说明

1. 更新 `app.js` 文件
2. 重启后端服务
3. 测试统计API功能

```bash
# 重启服务
node app.js

# 测试统计API
curl http://localhost:3000/stats
```

## 预防措施

为避免类似问题，建议：
1. 确保SQL查询中的占位符数量与传递的参数数量一致
2. 对于不需要参数的查询，始终传递空数组 `[]`
3. 在开发过程中进行充分的API测试

---

**修复日期**: 2024年  
**修复版本**: 2.0.1  
**影响API**: `GET /stats`
