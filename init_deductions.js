const sqlite3 = require('sqlite3').verbose();

// 创建数据库连接
const db = new sqlite3.Database('./training.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  } else {
    console.log('成功连接到SQLite数据库');
    initDeductions();
  }
});

async function initDeductions() {
  try {
    console.log('开始初始化扣除项配置...');

    // 检查是否已有扣除项配置
    const existingDeductions = await getQuery('SELECT COUNT(*) as count FROM deduction_configs');
    
    if (existingDeductions.count === 0) {
      console.log('创建示例扣除项配置...');
      
      // 单次扣除项（新学员报名时）
      const onceDeductions = [
        {
          name: '报名费',
          type: 'fixed',
          value: 100,
          description: '新学员报名时收取的固定费用',
          frequency: 'once'
        },
        {
          name: '教材费',
          type: 'fixed',
          value: 200,
          description: '新学员教材费用',
          frequency: 'once'
        },
        {
          name: '注册费',
          type: 'fixed',
          value: 50,
          description: '新学员注册费用',
          frequency: 'once'
        }
      ];

      // 多次扣除项（每次充值时）
      const multipleDeductions = [
        {
          name: '场地租金',
          type: 'percentage',
          value: 15.0,
          description: '按收入15%收取场地租金费用',
          frequency: 'multiple'
        },
        {
          name: '管理费',
          type: 'percentage',
          value: 10.0,
          description: '按收入10%收取管理费用',
          frequency: 'multiple'
        },
        {
          name: '教师课时费',
          type: 'per_hour',
          value: 80,
          description: '按课时收取教师费用，80元/课时',
          frequency: 'multiple'
        },
        {
          name: '水电费',
          type: 'fixed',
          value: 50,
          description: '每次充值收取固定水电费',
          frequency: 'multiple'
        }
      ];

      // 插入单次扣除项
      for (const deduction of onceDeductions) {
        await runQuery(`
          INSERT INTO deduction_configs (name, type, value, description, frequency, is_active) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [deduction.name, deduction.type, deduction.value, deduction.description, deduction.frequency, 1]);
        console.log(`✓ 创建单次扣除项: ${deduction.name}`);
      }

      // 插入多次扣除项
      for (const deduction of multipleDeductions) {
        await runQuery(`
          INSERT INTO deduction_configs (name, type, value, description, frequency, is_active) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [deduction.name, deduction.type, deduction.value, deduction.description, deduction.frequency, 1]);
        console.log(`✓ 创建多次扣除项: ${deduction.name}`);
      }

      console.log('\n扣除项配置初始化完成！');
      console.log(`共创建了 ${onceDeductions.length} 个单次扣除项和 ${multipleDeductions.length} 个多次扣除项`);
      
    } else {
      console.log('扣除项配置已存在，跳过初始化');
    }

    // 显示当前扣除项配置
    console.log('\n当前扣除项配置:');
    const deductions = await getAllQuery('SELECT * FROM deduction_configs ORDER BY frequency, id');
    for (const deduction of deductions) {
      console.log(`- ${deduction.name} (${deduction.type}, ${deduction.value}, ${deduction.frequency})`);
    }

  } catch (error) {
    console.error('初始化失败:', error);
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
