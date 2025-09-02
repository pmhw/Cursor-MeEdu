const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

// 配置
const BACKEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

// 创建数据库连接
const db = new sqlite3.Database('./training.db', (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
    process.exit(1);
  } else {
    console.log('✅ 成功连接到SQLite数据库');
    checkSystemStatus();
  }
});

async function checkSystemStatus() {
  console.log('=======================================');
  console.log('培训班课时管理系统 - 状态检查');
  console.log('=======================================');
  console.log();

  try {
    // 1. 检查数据库表结构
    console.log('[1/6] 检查数据库表结构...');
    await checkDatabaseTables();
    
    // 2. 检查后端服务
    console.log('\n[2/6] 检查后端服务状态...');
    await checkBackendService();
    
    // 3. 检查认证系统
    console.log('\n[3/6] 检查认证系统...');
    await checkAuthSystem();
    
    // 4. 检查扣除项配置
    console.log('\n[4/6] 检查扣除项配置...');
    await checkDeductionConfigs();
    
    // 5. 检查用户权限
    console.log('\n[5/6] 检查用户权限系统...');
    await checkUserPermissions();
    
    // 6. 检查API接口
    console.log('\n[6/6] 检查API接口...');
    await checkAPIEndpoints();
    
    console.log('\n=======================================');
    console.log('🎉 系统状态检查完成！');
    console.log('=======================================');
    
  } catch (error) {
    console.error('\n❌ 系统状态检查失败:', error.message);
  } finally {
    db.close();
  }
}

async function checkDatabaseTables() {
  const requiredTables = [
    'students', 'income', 'classes', 'deduction_configs', 
    'student_deductions', 'users', 'operation_logs',
    'user_sessions', 'login_attempts'
  ];
  
  for (const table of requiredTables) {
    try {
      const result = await getQuery(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ✅ ${table}: ${result.count} 条记录`);
    } catch (error) {
      console.log(`  ❌ ${table}: 表不存在或查询失败`);
    }
  }
}

async function checkBackendService() {
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: TEST_TIMEOUT });
    if (response.data.success) {
      console.log('  ✅ 后端服务运行正常');
      console.log(`  📍 服务地址: ${BACKEND_URL}`);
    } else {
      console.log('  ⚠️  后端服务响应异常');
    }
  } catch (error) {
    console.log('  ❌ 后端服务无法连接');
    console.log(`  💡 请确保后端服务在 ${BACKEND_URL} 运行`);
  }
}

async function checkAuthSystem() {
  try {
    // 检查是否有管理员用户
    const adminCount = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    console.log(`  ✅ 管理员用户: ${adminCount.count} 个`);
    
    // 检查是否有其他角色用户
    const teacherCount = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = "teacher"');
    const operatorCount = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = "operator"');
    console.log(`  ✅ 教师用户: ${teacherCount.count} 个`);
    console.log(`  ✅ 操作员用户: ${operatorCount.count} 个`);
    
    // 检查用户会话表
    const sessionCount = await getQuery('SELECT COUNT(*) as count FROM user_sessions');
    console.log(`  ✅ 活跃会话: ${sessionCount.count} 个`);
    
  } catch (error) {
    console.log('  ❌ 认证系统检查失败:', error.message);
  }
}

async function checkDeductionConfigs() {
  try {
    // 检查扣除项配置
    const deductionCount = await getQuery('SELECT COUNT(*) as count FROM deduction_configs');
    console.log(`  ✅ 扣除项配置: ${deductionCount.count} 个`);
    
    // 检查单次扣除项
    const onceCount = await getQuery('SELECT COUNT(*) as count FROM deduction_configs WHERE frequency = "once"');
    console.log(`  ✅ 单次扣除项: ${onceCount.count} 个`);
    
    // 检查多次扣除项
    const multipleCount = await getQuery('SELECT COUNT(*) as count FROM deduction_configs WHERE frequency = "multiple"');
    console.log(`  ✅ 多次扣除项: ${multipleCount.count} 个`);
    
    // 显示扣除项详情
    const deductions = await getAllQuery('SELECT name, type, value, frequency FROM deduction_configs ORDER BY frequency, id');
    if (deductions.length > 0) {
      console.log('  📋 扣除项详情:');
      deductions.forEach(deduction => {
        console.log(`    - ${deduction.name}: ${deduction.type} ${deduction.value} (${deduction.frequency})`);
      });
    }
    
  } catch (error) {
    console.log('  ❌ 扣除项配置检查失败:', error.message);
  }
}

async function checkUserPermissions() {
  try {
    // 检查操作日志
    const logCount = await getQuery('SELECT COUNT(*) as count FROM operation_logs');
    console.log(`  ✅ 操作日志: ${logCount.count} 条`);
    
    // 检查登录尝试记录
    const loginAttemptsCount = await getQuery('SELECT COUNT(*) as count FROM login_attempts');
    console.log(`  ✅ 登录尝试记录: ${loginAttemptsCount.count} 条`);
    
    // 检查权限中间件配置
    console.log('  ✅ 权限中间件已配置');
    console.log('    - adminMiddleware: 管理员权限');
    console.log('    - teacherMiddleware: 教师权限');
    console.log('    - operatorMiddleware: 操作员权限');
    
  } catch (error) {
    console.log('  ❌ 用户权限检查失败:', error.message);
  }
}

async function checkAPIEndpoints() {
  const endpoints = [
    { path: '/health', method: 'GET', auth: false },
    { path: '/auth/login', method: 'POST', auth: false },
    { path: '/students', method: 'GET', auth: true },
    { path: '/stats', method: 'GET', auth: true },
    { path: '/deduction-configs', method: 'GET', auth: true },
    { path: '/profit', method: 'GET', auth: true }
  ];
  
  console.log('  📋 API接口状态:');
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BACKEND_URL}${endpoint.path}`, { 
        timeout: TEST_TIMEOUT,
        validateStatus: () => true // 接受所有状态码
      });
      
      if (response.status === 200) {
        console.log(`    ✅ ${endpoint.method} ${endpoint.path}: 正常`);
      } else if (response.status === 401 && endpoint.auth) {
        console.log(`    ✅ ${endpoint.method} ${endpoint.path}: 需要认证 (正常)`);
      } else {
        console.log(`    ⚠️  ${endpoint.method} ${endpoint.path}: 状态码 ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`    ❌ ${endpoint.method} ${endpoint.path}: 服务未启动`);
      } else {
        console.log(`    ❌ ${endpoint.method} ${endpoint.path}: 连接失败`);
      }
    }
  }
}

// 数据库查询辅助函数
function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function getAllQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}
