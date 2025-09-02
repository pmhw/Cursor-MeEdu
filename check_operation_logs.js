const sqlite3 = require('sqlite3').verbose();

// 创建数据库连接
const db = new sqlite3.Database('./training.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  } else {
    console.log('✅ 成功连接到SQLite数据库');
    checkOperationLogs();
  }
});

async function checkOperationLogs() {
  try {
    console.log('\n=== 检查操作日志 ===');
    
    // 检查操作日志表结构
    console.log('\n1. 检查操作日志表结构...');
    const tableInfo = await getAllQuery("PRAGMA table_info(operation_logs)");
    console.log('📋 操作日志表字段:');
    tableInfo.forEach(field => {
      console.log(`  - ${field.name}: ${field.type} ${field.notnull ? 'NOT NULL' : ''}`);
    });
    
    // 获取最近的操作日志
    console.log('\n2. 获取最近的操作日志...');
    const recentLogs = await getAllQuery(`
      SELECT 
        id, 
        operation_type, 
        target_id, 
        target_type, 
        description, 
        user_id, 
        created_at 
      FROM operation_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (recentLogs.length > 0) {
      console.log(`📋 最近 ${recentLogs.length} 条操作日志:`);
      recentLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.created_at}] ${log.operation_type} - ${log.description}`);
        console.log(`     目标ID: ${log.target_id}, 目标类型: ${log.target_type}, 用户ID: ${log.user_id}`);
      });
    } else {
      console.log('📋 没有找到操作日志记录');
    }
    
    // 统计各类型操作数量
    console.log('\n3. 操作类型统计...');
    const operationStats = await getAllQuery(`
      SELECT 
        operation_type, 
        COUNT(*) as count 
      FROM operation_logs 
      GROUP BY operation_type 
      ORDER BY count DESC
    `);
    
    if (operationStats.length > 0) {
      console.log('📊 操作类型统计:');
      operationStats.forEach(stat => {
        console.log(`  - ${stat.operation_type}: ${stat.count} 次`);
      });
    }
    
    // 检查是否有target_id为空的记录
    console.log('\n4. 检查target_id为空的记录...');
    const nullTargetLogs = await getAllQuery(`
      SELECT 
        id, 
        operation_type, 
        target_id, 
        target_type, 
        description, 
        created_at 
      FROM operation_logs 
      WHERE target_id IS NULL OR target_id = ''
    `);
    
    if (nullTargetLogs.length > 0) {
      console.log(`⚠️ 发现 ${nullTargetLogs.length} 条target_id为空的记录:`);
      nullTargetLogs.forEach(log => {
        console.log(`  - ID: ${log.id}, 操作: ${log.operation_type}, 描述: ${log.description}`);
      });
    } else {
      console.log('✅ 没有发现target_id为空的记录');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    db.close();
  }
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
