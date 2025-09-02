const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// 创建数据库连接
const db = new sqlite3.Database('./training.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  } else {
    console.log('成功连接到SQLite数据库');
    migrateAuthTables();
  }
});

async function migrateAuthTables() {
  try {
    console.log('开始迁移认证相关表...');

    // 创建用户表
    await runQuery(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'operator')),
      real_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )`);

    // 创建用户会话表
    await runQuery(`CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // 创建登录失败记录表
    await runQuery(`CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      ip_address TEXT,
      attempt_time TEXT DEFAULT (datetime('now', 'localtime')),
      success INTEGER DEFAULT 0
    )`);

    // 检查是否已有管理员用户
    const adminExists = await getQuery('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    
    if (adminExists.count === 0) {
      console.log('创建默认管理员用户...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await runQuery(`INSERT INTO users (username, password, role, real_name, email, is_active) 
                     VALUES (?, ?, ?, ?, ?, ?)`, 
                     ['admin', hashedPassword, 'admin', '系统管理员', 'admin@example.com', 1]);
      
      console.log('默认管理员用户创建成功:');
      console.log('用户名: admin');
      console.log('密码: admin123');
      console.log('请及时修改默认密码！');
    }

    // 为现有表添加用户ID字段（用于操作日志）
    try {
      await runQuery('ALTER TABLE operation_logs ADD COLUMN user_id INTEGER');
      console.log('为operation_logs表添加user_id字段');
    } catch (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('operation_logs表的user_id字段已存在');
      }
    }

    console.log('认证相关表迁移完成！');
    
    // 显示表结构
    console.log('\n当前数据库表结构:');
    const tables = await getAllQuery("SELECT name FROM sqlite_master WHERE type='table'");
    for (const table of tables) {
      console.log(`- ${table.name}`);
    }

  } catch (error) {
    console.error('迁移失败:', error);
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
