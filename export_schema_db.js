const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const SOURCE_DB = process.env.SOURCE_DB || path.resolve(__dirname, 'training.db');
const OUTPUT_DB = process.env.OUTPUT_DB || path.resolve(__dirname, 'training.schema.db');

function openDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) return reject(err);
      resolve(db);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

(async () => {
  try {
    if (!fs.existsSync(SOURCE_DB)) {
      console.error(`源数据库不存在: ${SOURCE_DB}`);
      process.exit(1);
    }

    // 读取源库schema
    const sourceDb = await openDatabase(SOURCE_DB);

    const objects = await all(
      sourceDb,
      `SELECT type, name, tbl_name, sql
       FROM sqlite_master
       WHERE type IN ('table','index','trigger','view')
         AND name NOT LIKE 'sqlite_%'
       ORDER BY CASE type
         WHEN 'table' THEN 1
         WHEN 'index' THEN 2
         WHEN 'trigger' THEN 3
         WHEN 'view' THEN 4
         ELSE 5 END, name`
    );

    await new Promise((resolve) => sourceDb.close(resolve));

    // 创建输出库（如存在先删除）
    if (fs.existsSync(OUTPUT_DB)) fs.unlinkSync(OUTPUT_DB);
    const outDb = await openDatabase(OUTPUT_DB);

    // 事务内创建对象
    await run(outDb, 'BEGIN');

    for (const obj of objects) {
      // 有些索引可能是隐式创建的，sql为NULL，跳过
      if (!obj.sql) continue;
      // 跳过无意义对象，确保只执行CREATE语句
      const sql = String(obj.sql).trim();
      if (!/^CREATE\s+/i.test(sql)) continue;

      try {
        await run(outDb, sql);
      } catch (err) {
        console.error(`创建${obj.type} ${obj.name} 失败:`, err.message);
        throw err;
      }
    }

    await run(outDb, 'COMMIT');

    await new Promise((resolve) => outDb.close(resolve));

    console.log('✅ 已生成仅包含结构的SQLite数据库文件:');
    console.log(`   源库: ${SOURCE_DB}`);
    console.log(`   目标: ${OUTPUT_DB}`);
    console.log('   (包含表/索引/触发器/视图定义，无任何数据)');
  } catch (err) {
    console.error('❌ 生成失败:', err);
    process.exit(1);
  }
})();
