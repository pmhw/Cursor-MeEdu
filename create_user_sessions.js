const sqlite3 = require('sqlite3').verbose();

// 创建数据库连接
const db = new sqlite3.Database('./training.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  } else {
    console.log('✅ 成功连接到SQLite数据库');
    createUserSessionsTable();
  }
});

async function createUserSessionsTable() {
  try {
    console.log('=== 创建用户会话表 ===');
    
    // 检查表是否已存在
    const tableExists = await getQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'");
    
    if (tableExists) {
      console.log('✅ user_sessions表已存在');
    } else {
      // 创建用户会话表
      await runQuery(`CREATE TABLE user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);
      console.log('✅ user_sessions表创建成功');
    }
    
    // 检查users表是否存在
    const usersTableExists = await getQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (!usersTableExists) {
      console.log('❌ users表不存在，请先运行 migrate_auth_tables.js');
      return;
    }
    
    // 显示所有表
    console.log('\n📋 当前数据库表结构:');
    const tables = await getAllQuery("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
  } finally {
    db.close();
  }
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
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
