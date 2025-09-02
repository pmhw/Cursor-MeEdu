const sqlite3 = require('sqlite3').verbose();

// 创建数据库连接
const db = new sqlite3.Database('./training.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  } else {
    console.log('✅ 成功连接到SQLite数据库');
    checkUsers();
  }
});

async function checkUsers() {
  try {
    console.log('\n=== 检查用户表 ===');
    
    // 检查用户表是否存在
    const tables = await getAllQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (tables.length === 0) {
      console.log('❌ 用户表不存在');
      return;
    }
    console.log('✅ 用户表存在');
    
    // 检查用户数量
    const userCount = await getQuery('SELECT COUNT(*) as count FROM users');
    console.log(`📊 用户总数: ${userCount.count}`);
    
    // 检查管理员用户
    const adminCount = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    console.log(`👑 管理员用户: ${adminCount.count}`);
    
    // 显示所有用户
    const users = await getAllQuery('SELECT id, username, role, real_name, is_active FROM users');
    if (users.length > 0) {
      console.log('\n📋 用户列表:');
      users.forEach(user => {
        console.log(`  - ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role}, 姓名: ${user.real_name}, 状态: ${user.is_active ? '启用' : '禁用'}`);
      });
    } else {
      console.log('❌ 没有找到任何用户');
      console.log('💡 请运行 node migrate_auth_tables.js 创建默认管理员用户');
    }
    
    // 检查其他相关表
    console.log('\n=== 检查相关表 ===');
    const relatedTables = ['user_sessions', 'login_attempts'];
    for (const table of relatedTables) {
      const tableExists = await getAllQuery(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
      if (tableExists.length > 0) {
        const count = await getQuery(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ ${table}: ${count.count} 条记录`);
      } else {
        console.log(`❌ ${table}: 表不存在`);
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    db.close();
  }
}

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
