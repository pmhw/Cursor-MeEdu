const fs = require('fs');

// 读取app.js文件
const appJsPath = './app.js';
let content = fs.readFileSync(appJsPath, 'utf8');

console.log('=== 修复认证中间件配置 ===');

// 需要修复的路由模式
const patterns = [
  // 学生相关路由
  { from: 'app.post(\'/students\', operatorMiddleware,', to: 'app.post(\'/students\', authMiddleware, operatorMiddleware,' },
  { from: 'app.post(\'/students/:id/recharge\', operatorMiddleware,', to: 'app.post(\'/students/:id/recharge\', authMiddleware, operatorMiddleware,' },
  { from: 'app.post(\'/students/:id/consume\', teacherMiddleware,', to: 'app.post(\'/students/:id/consume\', authMiddleware, teacherMiddleware,' },
  { from: 'app.get(\'/stats\', operatorMiddleware,', to: 'app.get(\'/stats\', authMiddleware, operatorMiddleware,' },
  { from: 'app.get(\'/stats/income-trend\', operatorMiddleware,', to: 'app.get(\'/stats/income-trend\', authMiddleware, operatorMiddleware,' },
  { from: 'app.get(\'/stats/hours-trend\', operatorMiddleware,', to: 'app.get(\'/stats/hours-trend\', authMiddleware, operatorMiddleware,' },
  { from: 'app.delete(\'/income/:id\', adminMiddleware,', to: 'app.delete(\'/income/:id\', authMiddleware, adminMiddleware,' },
  { from: 'app.post(\'/students/:id/delete\', adminMiddleware,', to: 'app.post(\'/students/:id/delete\', authMiddleware, adminMiddleware,' },
  { from: 'app.post(\'/deduction-configs\', adminMiddleware,', to: 'app.post(\'/deduction-configs\', authMiddleware, adminMiddleware,' },
  { from: 'app.get(\'/deduction-configs\', operatorMiddleware,', to: 'app.get(\'/deduction-configs\', authMiddleware, operatorMiddleware,' },
  { from: 'app.put(\'/deduction-configs/:id\', adminMiddleware,', to: 'app.put(\'/deduction-configs/:id\', authMiddleware, adminMiddleware,' },
  { from: 'app.get(\'/students/:id/deductions\', operatorMiddleware,', to: 'app.get(\'/students/:id/deductions\', authMiddleware, operatorMiddleware,' },
  { from: 'app.post(\'/students/:id/deductions\', adminMiddleware,', to: 'app.post(\'/students/:id/deductions\', authMiddleware, adminMiddleware,' },
  { from: 'app.get(\'/students/:id/profit\', operatorMiddleware,', to: 'app.get(\'/students/:id/profit\', authMiddleware, operatorMiddleware,' },
  { from: 'app.get(\'/profit\', operatorMiddleware,', to: 'app.get(\'/profit\', authMiddleware, operatorMiddleware,' },
  { from: 'app.post(\'/students/:id/deduction-details\', adminMiddleware,', to: 'app.post(\'/students/:id/deduction-details\', authMiddleware, adminMiddleware,' },
  { from: 'app.get(\'/students/:id/deduction-details\', operatorMiddleware,', to: 'app.get(\'/students/:id/deduction-details\', authMiddleware, operatorMiddleware,' },
  { from: 'app.get(\'/deduction-details\', operatorMiddleware,', to: 'app.get(\'/deduction-details\', authMiddleware, operatorMiddleware,' },
  { from: 'app.put(\'/deduction-details/:id\', adminMiddleware,', to: 'app.put(\'/deduction-details/:id\', authMiddleware, adminMiddleware,' },
  { from: 'app.delete(\'/deduction-details/:id\', adminMiddleware,', to: 'app.delete(\'/deduction-details/:id\', authMiddleware, adminMiddleware,' }
];

let fixedCount = 0;

// 应用修复
patterns.forEach(pattern => {
  if (content.includes(pattern.from)) {
    content = content.replace(pattern.from, pattern.to);
    console.log(`✅ 修复: ${pattern.from}`);
    fixedCount++;
  } else {
    console.log(`⚠️  未找到: ${pattern.from}`);
  }
});

// 写回文件
fs.writeFileSync(appJsPath, content, 'utf8');

console.log(`\n🎉 修复完成！共修复了 ${fixedCount} 个路由的认证中间件配置。`);
console.log('💡 现在所有需要认证的路由都会先执行 authMiddleware，然后再执行角色权限中间件。');
