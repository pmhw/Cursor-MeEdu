const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

// 安全中间件
app.use(helmet());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use(limiter);

// 登录速率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 15分钟内最多5次登录尝试
  message: {
    success: false,
    message: '登录尝试过于频繁，请15分钟后再试'
  }
});

// CORS中间件
app.use(cors({
  origin: true, // 允许所有域名
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Forwarded-For']
}));

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// 会话中间件
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 导入认证中间件和路由
const { authMiddleware, operatorMiddleware, teacherMiddleware, adminMiddleware, logMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

// 认证路由（无需认证）
app.use('/auth', loginLimiter, authRoutes);

// 健康检查接口（无需认证）
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 创建数据库连接
const db = new sqlite3.Database('./training.db', (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('成功连接到SQLite数据库');
    initDatabase();
  }
});

// 初始化数据库表
function initDatabase() {
  // 学生表
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    remaining_hours INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`);

  // 收入表
  db.run(`CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students (id)
  )`);

  // 上课表
  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    hours_used INTEGER NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students (id)
  )`);

  // 扣除项配置表
  db.run(`CREATE TABLE IF NOT EXISTS deduction_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('percentage', 'fixed', 'per_hour')),
    value REAL NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL CHECK(frequency IN ('once', 'multiple')) DEFAULT 'once',
    is_active INTEGER DEFAULT 1
  )`);
  
  // 学生扣除项关联表
  db.run(`CREATE TABLE IF NOT EXISTS student_deductions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    deduction_config_id INTEGER NOT NULL,
    applied_count INTEGER DEFAULT 0,
    last_applied_date TEXT,
    FOREIGN KEY (student_id) REFERENCES students (id),
    FOREIGN KEY (deduction_config_id) REFERENCES deduction_configs (id)
  )`);

  // 操作日志表
  db.run(`CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    description TEXT,
    user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`);

  console.log('数据库表初始化完成');
}

// 添加学生（需要操作员权限）
app.post('/students', authMiddleware, operatorMiddleware, logMiddleware('CREATE_STUDENT', 'student'), (req, res) => {
  const { name, phone } = req.body;
  
  if (!name || !phone) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '姓名和手机号不能为空' 
    });
  }

  // 使用事务确保数据一致性
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const sql = 'INSERT INTO students (name, phone, created_at) VALUES (?, ?, datetime("now", "localtime"))';
    db.run(sql, [name, phone], function(err) {
      if (err) {
        db.run('ROLLBACK');
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ 
            success: false, 
            error: '数据重复',
            message: '该手机号已存在' 
          });
        }
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '添加学生失败' 
        });
      }
      
      const studentId = this.lastID;
      
      // 自动应用单次扣除项
      const deductionSql = 'SELECT id FROM deduction_configs WHERE frequency = "once" AND is_active = 1';
      db.all(deductionSql, [], (err, deductions) => {
        if (err) {
          db.run('ROLLBACK');
          console.error('查询单次扣除项失败:', err);
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '应用扣除项失败' 
          });
        }
        
        if (deductions.length > 0) {
          // 插入单次扣除项关联
          const placeholders = deductions.map(() => '(?, ?, 1, ?)').join(',');
          const values = [];
          const currentDate = new Date().toISOString();
          deductions.forEach(deduction => {
            values.push(studentId, deduction.id, currentDate);
          });
          
          const insertDeductionSql = `INSERT INTO student_deductions (student_id, deduction_config_id, applied_count, last_applied_date) VALUES ${placeholders}`;
          db.run(insertDeductionSql, values, function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('插入单次扣除项关联失败:', err);
              return res.status(500).json({ 
                success: false, 
                error: '数据库操作失败',
                message: '应用扣除项失败' 
              });
            }
            
            // 提交事务
            db.run('COMMIT', (err) => {
              if (err) {
                return res.status(500).json({ 
                  success: false, 
                  error: '数据库操作失败',
                  message: '提交事务失败' 
                });
              }
              
              res.status(201).json({
                success: true,
                data: {
                  id: studentId,
                  name,
                  phone,
                  remaining_hours: 0,
                  applied_deductions: deductions.length
                },
                message: '学生添加成功，已自动应用单次扣除项'
              });
            });
          });
        } else {
          // 没有单次扣除项，直接提交事务
          db.run('COMMIT', (err) => {
            if (err) {
              return res.status(500).json({ 
                success: false, 
                error: '数据库操作失败',
                message: '提交事务失败' 
              });
            }
            
            res.status(201).json({
              success: true,
              data: {
                id: studentId,
                name,
                phone,
                remaining_hours: 0,
                applied_deductions: 0
              },
              message: '学生添加成功'
            });
          });
        }
      });
    });
  });
});

// 给学生充值课时和金额
app.post('/students/:id/recharge', authMiddleware, operatorMiddleware, logMiddleware('ADD_INCOME', 'income'), (req, res) => {
  const studentId = req.params.id;
  const { amount, hours } = req.body;
  
  if (!amount || !hours) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '金额和课时数不能为空' 
    });
  }

  if (amount <= 0 || hours <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '金额和课时数必须大于0' 
    });
  }

  const date = new Date().toISOString().split('T')[0];

  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 更新学生剩余课时
    const updateStudentSql = 'UPDATE students SET remaining_hours = remaining_hours + ? WHERE id = ?';
    db.run(updateStudentSql, [hours, studentId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '更新学生课时失败' 
        });
      }
      
      if (this.changes === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          error: '学生不存在',
          message: '未找到指定ID的学生' 
        });
      }
    });

    // 记录收入
    const insertIncomeSql = 'INSERT INTO income (student_id, amount, date) VALUES (?, ?, ?)';
    db.run(insertIncomeSql, [studentId, amount, date], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '记录收入失败' 
        });
      }
      
      // 自动应用多次扣除项
      const deductionSql = `
        SELECT dc.id, dc.type, dc.value, dc.frequency
        FROM deduction_configs dc
        INNER JOIN student_deductions sd ON dc.id = sd.deduction_config_id
        WHERE sd.student_id = ? AND dc.frequency = "multiple" AND dc.is_active = 1
      `;
      
      db.all(deductionSql, [studentId], (err, deductions) => {
        if (err) {
          db.run('ROLLBACK');
          console.error('查询多次扣除项失败:', err);
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '应用扣除项失败' 
          });
        }
        
        if (deductions.length > 0) {
          // 更新多次扣除项的应用次数和最后应用日期
          const currentDate = new Date().toISOString();
          let completed = 0;
          const total = deductions.length;
          
          deductions.forEach(deduction => {
            const updateSql = `
              UPDATE student_deductions 
              SET applied_count = applied_count + 1, last_applied_date = ?
              WHERE student_id = ? AND deduction_config_id = ?
            `;
            
            db.run(updateSql, [currentDate, studentId, deduction.id], function(err) {
              if (err) {
                db.run('ROLLBACK');
                console.error('更新多次扣除项失败:', err);
                return res.status(500).json({ 
                  success: false, 
                  error: '数据库操作失败',
                  message: '应用扣除项失败' 
                });
              }
              
              completed++;
              if (completed === total) {
                // 所有扣除项更新完成，提交事务
                db.run('COMMIT', (err) => {
                  if (err) {
                    return res.status(500).json({ 
                      success: false, 
                      error: '数据库操作失败',
                      message: '充值失败' 
                    });
                  }
                  
                  res.json({
                    success: true,
                    data: {
                      student_id: studentId,
                      amount,
                      hours,
                      date,
                      applied_deductions: deductions.length
                    },
                    message: '充值成功，已自动应用多次扣除项'
                  });
                });
              }
            });
          });
        } else {
          // 没有多次扣除项，直接提交事务
          db.run('COMMIT', (err) => {
            if (err) {
              return res.status(500).json({ 
                success: false, 
                error: '数据库操作失败',
                message: '充值失败' 
              });
            }
            
            res.json({
              success: true,
              data: {
                student_id: studentId,
                amount,
                hours,
                date,
                applied_deductions: 0
              },
              message: '充值成功'
            });
          });
        }
      });
    });
  });
});

// 学生上课，扣除课时
app.post('/students/:id/consume', authMiddleware, teacherMiddleware, logMiddleware('ADD_CLASS', 'class'), (req, res) => {
  const studentId = req.params.id;
  const { hours_used } = req.body;
  
  if (!hours_used || hours_used <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '课时数必须大于0' 
    });
  }

  const date = new Date().toISOString().split('T')[0];

  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 检查学生剩余课时是否足够
    const checkSql = 'SELECT remaining_hours FROM students WHERE id = ?';
    db.get(checkSql, [studentId], (err, row) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '查询学生信息失败' 
        });
      }
      
      if (!row) {
        db.run('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          error: '学生不存在',
          message: '未找到指定ID的学生' 
        });
      }
      
      if (row.remaining_hours < hours_used) {
        db.run('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          error: '课时不足',
          message: '剩余课时不足',
          data: {
            remaining_hours: row.remaining_hours,
            requested_hours: hours_used
          }
        });
      }

      // 扣除课时
      const updateSql = 'UPDATE students SET remaining_hours = remaining_hours - ? WHERE id = ?';
      db.run(updateSql, [hours_used, studentId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '扣除课时失败' 
          });
        }
      });

      // 记录上课记录
      const insertClassSql = 'INSERT INTO classes (student_id, hours_used, date) VALUES (?, ?, ?)';
      db.run(insertClassSql, [studentId, hours_used, date], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '记录上课失败' 
          });
        }
      });

      // 提交事务
      db.run('COMMIT', (err) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '上课记录失败' 
          });
        }
        
        res.json({
          success: true,
          data: {
            student_id: studentId,
            hours_used,
            remaining_hours: row.remaining_hours - hours_used,
            date
          },
          message: '上课记录成功'
        });
      });
    });
  });
});



// 获取所有学生列表
app.get('/students', authMiddleware, operatorMiddleware, (req, res) => {
  const sql = 'SELECT * FROM students ORDER BY id';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: '查询学生列表失败',
        message: err.message 
      });
    }
    res.json({
      success: true,
      data: rows,
      message: '获取学生列表成功'
    });
  });
});

// 获取某个学生的详情（含剩余课时和历史收入+扣课记录）
app.get('/students/:id', authMiddleware, operatorMiddleware, (req, res) => {
  const studentId = req.params.id;

  // 查询学生基本信息
  const studentSql = 'SELECT * FROM students WHERE id = ?';
  db.get(studentSql, [studentId], (err, student) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: '查询学生信息失败',
        message: err.message 
      });
    }
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        error: '学生不存在',
        message: '未找到指定ID的学生' 
      });
    }

    // 查询收入记录
    const incomeSql = 'SELECT * FROM income WHERE student_id = ? ORDER BY date DESC';
    db.all(incomeSql, [studentId], (err, incomeRecords) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          error: '查询收入记录失败',
          message: err.message 
        });
      }

      // 查询上课记录
      const classSql = 'SELECT * FROM classes WHERE student_id = ? ORDER BY date DESC';
      db.all(classSql, [studentId], (err, classRecords) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: '查询上课记录失败',
            message: err.message 
          });
        }

        res.json({
          success: true,
          data: {
            student: {
              id: student.id,
              name: student.name,
              phone: student.phone,
              remaining_hours: student.remaining_hours
            },
            income_records: incomeRecords,
            class_records: classRecords
          },
          message: '获取学生详情成功'
        });
      });
    });
  });
});

// 获取统计数据
app.get('/stats', authMiddleware, operatorMiddleware, (req, res) => {
  const { period = 'all' } = req.query;
  
  // 根据时间段计算日期范围
  const getDateRange = (period) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'today':
        // 今日：从今天00:00到23:59
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        // 本周：从本周一到今天
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周日的getDay()是0
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        // 当月：从本月1号到今天
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default: // all
        // 全部：从很早的日期到今天
        startDate.setFullYear(2000, 0, 1);
        break;
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  };
  
  const dateRange = getDateRange(period);
  
  // 构建SQL查询条件
  const dateCondition = period === 'all' ? '' : 'AND date >= ? AND date <= ?';
  const dateParams = period === 'all' ? [] : [dateRange.start, dateRange.end];
  
  // 学生表的日期条件（使用created_at字段）
  const studentDateCondition = period === 'all' ? '' : 'AND created_at >= ? AND created_at <= ?';
  
  // 查询总收入
  const incomeSql = `
    SELECT COALESCE(SUM(amount), 0) as total_income, COUNT(*) as income_count
    FROM income 
    WHERE 1=1 ${dateCondition}
  `;
  
  // 查询总学生数
  const studentsSql = `
    SELECT COUNT(*) as total_students
    FROM students
  `;
  
  // 查询总课时
  const hoursSql = `
    SELECT COALESCE(SUM(remaining_hours), 0) as total_hours
    FROM students
  `;
  
  // 查询总上课次数和消耗课时
  const classesSql = `
    SELECT COUNT(*) as total_classes, COALESCE(SUM(hours_used), 0) as total_hours_used
    FROM classes 
    WHERE 1=1 ${dateCondition}
  `;
  
  // 查询新增学生数
  const newStudentsSql = `
    SELECT COUNT(*) as new_students
    FROM students 
    WHERE 1=1 ${studentDateCondition}
  `;
  
  // 查询充值课时数 - 从学生表的剩余课时计算
  const rechargeHoursSql = `
    SELECT COALESCE(SUM(remaining_hours), 0) as recharge_hours
    FROM students
  `;
  
  // 执行查询
  db.serialize(() => {
    let stats = {};
    let completed = 0;
    const totalQueries = 6;
    
    const checkComplete = () => {
      completed++;
      if (completed === totalQueries) {
        res.json({
          success: true,
          data: stats,
          message: '获取统计数据成功'
        });
      }
    };
    
    // 查询总收入
    db.get(incomeSql, dateParams, (err, row) => {
      if (err) {
        console.error('查询收入统计失败:', err);
        stats.total_income = 0;
        stats.income_count = 0;
      } else {
        stats.total_income = row.total_income;
        stats.income_count = row.income_count;
      }
      checkComplete();
    });
    
    // 查询总学生数
    db.get(studentsSql, [], (err, row) => {
      if (err) {
        console.error('查询学生统计失败:', err);
        stats.total_students = 0;
      } else {
        stats.total_students = row.total_students;
      }
      checkComplete();
    });
    
    // 查询总课时
    db.get(hoursSql, [], (err, row) => {
      if (err) {
        console.error('查询课时统计失败:', err);
        stats.total_hours = 0;
      } else {
        stats.total_hours = row.total_hours;
      }
      checkComplete();
    });
    
    // 查询总上课次数和消耗课时
    db.get(classesSql, dateParams, (err, row) => {
      if (err) {
        console.error('查询上课统计失败:', err);
        stats.total_classes = 0;
        stats.total_hours_used = 0;
      } else {
        stats.total_classes = row.total_classes;
        stats.total_hours_used = row.total_hours_used;
      }
      checkComplete();
    });
    
    // 查询新增学生数
    db.get(newStudentsSql, dateParams, (err, row) => {
      if (err) {
        console.error('查询新增学生统计失败:', err);
        stats.new_students = 0;
      } else {
        stats.new_students = row.new_students;
      }
      checkComplete();
    });
    
    // 查询充值课时数
    db.get(rechargeHoursSql, [], (err, row) => {
      if (err) {
        console.error('查询充值课时统计失败:', err);
        stats.recharge_hours = 0;
      } else {
        stats.recharge_hours = row.recharge_hours;
      }
      checkComplete();
    });
  });
});

// 获取收入趋势数据
app.get('/stats/income-trend', authMiddleware, operatorMiddleware, (req, res) => {
  const { months = 12 } = req.query;
  
  const sql = `
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total_amount,
      COUNT(*) as count
    FROM income 
    WHERE date >= date('now', '-${months} months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '查询收入趋势失败',
        message: err.message
      });
    }
    
    res.json({
      success: true,
      data: rows,
      message: '获取收入趋势成功'
    });
  });
});

// 获取课时消耗趋势数据
app.get('/stats/hours-trend', authMiddleware, operatorMiddleware, (req, res) => {
  const { months = 12 } = req.query;
  
  const sql = `
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(hours_used) as total_hours,
      COUNT(*) as count
    FROM classes 
    WHERE date >= date('now', '-${months} months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: '查询课时趋势失败',
        message: err.message
      });
    }
    
    res.json({
      success: true,
      data: rows,
      message: '获取课时趋势成功'
    });
  });
});

// 删除充值记录
app.delete('/income/:id', authMiddleware, adminMiddleware, logMiddleware('DELETE_INCOME', 'income'), (req, res) => {
  const incomeId = req.params.id;
  
  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // 1. 查询充值记录信息
    const getIncomeSql = `
      SELECT i.*, s.name as student_name, s.remaining_hours
      FROM income i
      INNER JOIN students s ON i.student_id = s.id
      WHERE i.id = ?
    `;
    
    db.get(getIncomeSql, [incomeId], (err, incomeRecord) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '查询充值记录失败' 
        });
      }
      
      if (!incomeRecord) {
        db.run('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          error: '充值记录不存在',
          message: '未找到指定ID的充值记录' 
        });
      }
      
      // 2. 安全验证：检查时间限制（24小时内）
      const recordDate = new Date(incomeRecord.date);
      const now = new Date();
      const hoursDiff = (now - recordDate) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        db.run('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          error: '时间限制',
          message: '只能删除24小时内的充值记录' 
        });
      }
      
      // 3. 安全验证：检查是否有后续上课记录
      const checkClassesSql = `
        SELECT COUNT(*) as class_count
        FROM classes
        WHERE student_id = ? AND date > ?
      `;
      
      db.get(checkClassesSql, [incomeRecord.student_id, incomeRecord.date], (err, classResult) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '检查上课记录失败' 
          });
        }
        
        if (classResult.class_count > 0) {
          db.run('ROLLBACK');
          return res.status(400).json({ 
            success: false, 
            error: '存在后续记录',
            message: '该充值记录后存在上课记录，无法删除' 
          });
        }
        
        // 4. 计算该次充值对应的课时数（根据充值金额和当前课时单价计算）
        // 这里假设课时单价为充值金额除以课时数的平均值
        const getStudentIncomeSql = `
          SELECT SUM(amount) as total_amount, 
                 (SELECT SUM(hours) FROM (
                   SELECT (amount / (SELECT COUNT(*) FROM income WHERE student_id = ?)) as hours 
                   FROM income WHERE student_id = ?
                 )) as total_hours
          FROM income 
          WHERE student_id = ?
        `;
        
        db.get(getStudentIncomeSql, [incomeRecord.student_id, incomeRecord.student_id, incomeRecord.student_id], (err, studentIncome) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ 
              success: false, 
              error: '数据库操作失败',
              message: '计算课时失败' 
            });
          }
          
          // 计算该次充值对应的课时数
          const totalAmount = studentIncome.total_amount || 0;
          const totalHours = studentIncome.total_hours || 0;
          const hoursPerAmount = totalAmount > 0 ? totalHours / totalAmount : 0;
          const rechargeHours = incomeRecord.amount * hoursPerAmount;
          
          // 5. 检查学生剩余课时是否足够
          if (incomeRecord.remaining_hours < rechargeHours) {
            db.run('ROLLBACK');
            return res.status(400).json({ 
              success: false, 
              error: '课时不足',
              message: '学生剩余课时不足，无法删除该充值记录',
              data: {
                remaining_hours: incomeRecord.remaining_hours,
                required_hours: rechargeHours
              }
            });
          }
          
          // 6. 删除充值记录
          const deleteIncomeSql = 'DELETE FROM income WHERE id = ?';
          db.run(deleteIncomeSql, [incomeId], function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ 
                success: false, 
                error: '数据库操作失败',
                message: '删除充值记录失败' 
              });
            }
            
            // 7. 更新学生剩余课时
            const updateStudentSql = 'UPDATE students SET remaining_hours = remaining_hours - ? WHERE id = ?';
            db.run(updateStudentSql, [rechargeHours, incomeRecord.student_id], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ 
                  success: false, 
                  error: '数据库操作失败',
                  message: '更新学生课时失败' 
                });
              }
              
              // 8. 记录操作日志（可选：创建日志表）
              const logSql = `
                INSERT INTO operation_logs (operation_type, target_id, target_type, description, created_at)
                VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
              `;
              const logDescription = `删除充值记录：学生${incomeRecord.student_name}，金额¥${incomeRecord.amount}，课时${rechargeHours.toFixed(2)}小时`;
              
              db.run(logSql, ['DELETE_INCOME', incomeId, 'income', logDescription], function(err) {
                if (err) {
                  console.error('记录操作日志失败:', err);
                  // 日志记录失败不影响主操作
                }
                
                // 9. 查询更新后的学生信息
                const getUpdatedStudentSql = 'SELECT * FROM students WHERE id = ?';
                db.get(getUpdatedStudentSql, [incomeRecord.student_id], (err, updatedStudent) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ 
                      success: false, 
                      error: '数据库操作失败',
                      message: '查询更新后学生信息失败' 
                    });
                  }
                  
                  // 提交事务
                  db.run('COMMIT', (err) => {
                    if (err) {
                      return res.status(500).json({ 
                        success: false, 
                        error: '数据库操作失败',
                        message: '提交事务失败' 
                      });
                    }
                    
                    res.json({
                      success: true,
                      data: {
                        deleted_income: {
                          id: incomeId,
                          amount: incomeRecord.amount,
                          date: incomeRecord.date,
                          hours: rechargeHours
                        },
                        updated_student: {
                          id: updatedStudent.id,
                          name: updatedStudent.name,
                          remaining_hours: updatedStudent.remaining_hours
                        }
                      },
                      message: '充值记录删除成功'
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

// 删除学生
app.post('/students/:id/delete', authMiddleware, adminMiddleware, logMiddleware('DELETE_STUDENT', 'student'), (req, res) => {
  const studentId = req.params.id;

  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 检查学生是否存在
    const checkSql = 'SELECT * FROM students WHERE id = ?';
    db.get(checkSql, [studentId], (err, student) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '查询学生信息失败' 
        });
      }
      
      if (!student) {
        db.run('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          error: '学生不存在',
          message: '未找到指定ID的学生' 
        });
      }

      // 删除相关的收入记录
      const deleteIncomeSql = 'DELETE FROM income WHERE student_id = ?';
      db.run(deleteIncomeSql, [studentId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '删除收入记录失败' 
          });
        }
      });

      // 删除相关的上课记录
      const deleteClassesSql = 'DELETE FROM classes WHERE student_id = ?';
      db.run(deleteClassesSql, [studentId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '删除上课记录失败' 
          });
        }
      });

      // 删除学生
      const deleteStudentSql = 'DELETE FROM students WHERE id = ?';
      db.run(deleteStudentSql, [studentId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '删除学生失败' 
          });
        }
        
        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ 
            success: false, 
            error: '学生不存在',
            message: '未找到指定ID的学生' 
          });
        }
      });

      // 提交事务
      db.run('COMMIT', (err) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '删除学生失败' 
          });
        }
        
        res.json({
          success: true,
          data: {
            student_id: studentId,
            deleted_student: student
          },
          message: '学生删除成功'
        });
      });
    });
  });
});



// ==================== 扣除项管理API ====================

// 添加扣除项配置
app.post('/deduction-configs', authMiddleware, adminMiddleware, logMiddleware('CREATE_DEDUCTION_CONFIG', 'deduction_config'), (req, res) => {
  console.log('=== 后端：添加扣除项配置 ===');
  console.log('请求体:', req.body);
  
  const { name, type, value, description, frequency = 'once', is_active = 1 } = req.body;
  
  console.log('解析后的参数:');
  console.log('  name:', name, '类型:', typeof name);
  console.log('  type:', type, '类型:', typeof type);
  console.log('  value:', value, '类型:', typeof value);
  console.log('  description:', description, '类型:', typeof description);
  console.log('  frequency:', frequency, '类型:', typeof frequency);
  console.log('  is_active:', is_active, '类型:', typeof is_active);
  
  // 参数验证
  if (!name || !type || value === undefined) {
    console.log('❌ 参数验证失败：名称、类型或值为空');
    console.log('  name存在:', !!name);
    console.log('  type存在:', !!type);
    console.log('  value存在:', value !== undefined);
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '名称、类型和值不能为空' 
    });
  }

  if (!['percentage', 'fixed', 'per_hour'].includes(type)) {
    console.log('❌ 类型验证失败：', type);
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '类型必须是 percentage、fixed 或 per_hour' 
    });
  }

  if (!['once', 'multiple'].includes(frequency)) {
    console.log('❌ 频率验证失败：', frequency);
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '频率必须是 once 或 multiple' 
    });
  }

  console.log('✅ 参数验证通过，准备执行SQL');
  const sql = 'INSERT INTO deduction_configs (name, type, value, description, frequency, is_active) VALUES (?, ?, ?, ?, ?, ?)';
  const params = [name, type, value, description, frequency, is_active];
  console.log('SQL语句:', sql);
  console.log('SQL参数:', params);
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error('❌ 数据库操作失败:', err);
      return res.status(500).json({ 
        success: false, 
        error: '数据库操作失败',
        message: '添加扣除项失败' 
      });
    }
    
    console.log('数据库操作结果:');
    console.log('  this.changes:', this.changes);
    console.log('  this.lastID:', this.lastID);
    
    console.log('✅ 添加成功，新ID:', this.lastID);
    const responseData = {
      success: true,
      data: {
        id: this.lastID,
        name,
        type,
        value,
        description,
        frequency,
        is_active
      },
      message: '扣除项添加成功'
    };
    console.log('返回响应:', responseData);
    res.status(201).json(responseData);
  });
});

// 获取扣除项配置列表
app.get('/deduction-configs', authMiddleware, operatorMiddleware, (req, res) => {
  const sql = 'SELECT * FROM deduction_configs ORDER BY id';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: '查询扣除项失败',
        message: err.message 
      });
    }
    res.json({
      success: true,
      data: rows,
      message: '获取扣除项列表成功'
    });
  });
});

// 更新扣除项配置
app.put('/deduction-configs/:id', authMiddleware, adminMiddleware, logMiddleware('UPDATE_DEDUCTION_CONFIG', 'deduction_config'), (req, res) => {
  console.log('=== 后端：更新扣除项配置 ===');
  console.log('请求参数:', req.params);
  console.log('请求体:', req.body);
  
  const configId = req.params.id;
  const { name, type, value, description, frequency, is_active } = req.body;
  
  console.log('解析后的参数:');
  console.log('  configId:', configId, '类型:', typeof configId);
  console.log('  name:', name, '类型:', typeof name);
  console.log('  type:', type, '类型:', typeof type);
  console.log('  value:', value, '类型:', typeof value);
  console.log('  description:', description, '类型:', typeof description);
  console.log('  frequency:', frequency, '类型:', typeof frequency);
  console.log('  is_active:', is_active, '类型:', typeof is_active);
  
  // 参数验证
  if (!name || !type || value === undefined) {
    console.log('❌ 参数验证失败：名称、类型或值为空');
    console.log('  name存在:', !!name);
    console.log('  type存在:', !!type);
    console.log('  value存在:', value !== undefined);
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '名称、类型和值不能为空' 
    });
  }

  if (!['percentage', 'fixed', 'per_hour'].includes(type)) {
    console.log('❌ 类型验证失败：', type);
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '类型必须是 percentage、fixed 或 per_hour' 
    });
  }

  if (!['once', 'multiple'].includes(frequency)) {
    console.log('❌ 频率验证失败：', frequency);
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '频率必须是 once 或 multiple' 
    });
  }

  console.log('✅ 参数验证通过，准备执行SQL');
  const sql = 'UPDATE deduction_configs SET name = ?, type = ?, value = ?, description = ?, frequency = ?, is_active = ? WHERE id = ?';
  const params = [name, type, value, description, frequency, is_active, configId];
  console.log('SQL语句:', sql);
  console.log('SQL参数:', params);
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error('❌ 数据库操作失败:', err);
      return res.status(500).json({ 
        success: false, 
        error: '数据库操作失败',
        message: '更新扣除项失败' 
      });
    }
    
    console.log('数据库操作结果:');
    console.log('  this.changes:', this.changes);
    console.log('  this.lastID:', this.lastID);
    
    if (this.changes === 0) {
      console.log('❌ 未找到指定ID的扣除项:', configId);
      return res.status(404).json({ 
        success: false, 
        error: '扣除项不存在',
        message: '未找到指定ID的扣除项' 
      });
    }
    
    console.log('✅ 更新成功，影响行数:', this.changes);
    const responseData = {
      success: true,
      data: {
        id: configId,
        name,
        type,
        value,
        description,
        frequency,
        is_active
      },
      message: '扣除项更新成功'
    };
    console.log('返回响应:', responseData);
    res.json(responseData);
  });
});

// 获取学生扣除项配置
app.get('/students/:id/deductions', authMiddleware, operatorMiddleware, (req, res) => {
  const studentId = req.params.id;
  
  const sql = `
    SELECT dc.*, sd.id as student_deduction_id
    FROM deduction_configs dc
    LEFT JOIN student_deductions sd ON dc.id = sd.deduction_config_id AND sd.student_id = ?
    WHERE dc.is_active = 1
    ORDER BY dc.id
  `;
  
  db.all(sql, [studentId], (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: '查询学生扣除项失败',
        message: err.message 
      });
    }
    
    res.json({
      success: true,
      data: rows,
      message: '获取学生扣除项配置成功'
    });
  });
});

// 更新学生扣除项配置
app.post('/students/:id/deductions', authMiddleware, adminMiddleware, logMiddleware('CREATE_STUDENT_DEDUCTION', 'student_deduction'), (req, res) => {
  const studentId = req.params.id;
  const { deduction_ids } = req.body; // 数组，包含选中的扣除项ID
  
  if (!Array.isArray(deduction_ids)) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '扣除项ID必须是数组' 
    });
  }

  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 删除学生现有的扣除项配置
    const deleteSql = 'DELETE FROM student_deductions WHERE student_id = ?';
    db.run(deleteSql, [studentId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '删除现有扣除项配置失败' 
        });
      }
    });

    // 添加新的扣除项配置
    if (deduction_ids.length > 0) {
      const insertSql = 'INSERT INTO student_deductions (student_id, deduction_config_id, applied_count, last_applied_date) VALUES (?, ?, 0, ?)';
      let completed = 0;
      const total = deduction_ids.length;
      const currentDate = new Date().toISOString();
      
      deduction_ids.forEach(deductionId => {
        db.run(insertSql, [studentId, deductionId, currentDate], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ 
              success: false, 
              error: '数据库操作失败',
              message: '添加扣除项配置失败' 
            });
          }
          
          completed++;
          if (completed === total) {
            // 提交事务
            db.run('COMMIT', (err) => {
              if (err) {
                return res.status(500).json({ 
                  success: false, 
                  error: '数据库操作失败',
                  message: '更新扣除项配置失败' 
                });
              }
              
              res.json({
                success: true,
                data: {
                  student_id: studentId,
                  deduction_ids
                },
                message: '扣除项配置更新成功'
              });
            });
          }
        });
      });
    } else {
      // 没有选中任何扣除项，直接提交事务
      db.run('COMMIT', (err) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '更新扣除项配置失败' 
          });
        }
        
        res.json({
          success: true,
          data: {
            student_id: studentId,
            deduction_ids: []
          },
          message: '扣除项配置更新成功'
        });
      });
    }
  });
});

// 计算学生利润
app.get('/students/:id/profit', authMiddleware, operatorMiddleware, (req, res) => {
  const studentId = req.params.id;
  
  // 查询学生信息
  const studentSql = 'SELECT * FROM students WHERE id = ?';
  db.get(studentSql, [studentId], (err, student) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: '查询学生信息失败',
        message: err.message 
      });
    }
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        error: '学生不存在',
        message: '未找到指定ID的学生' 
      });
    }

    // 查询学生收入记录
    const incomeSql = 'SELECT SUM(amount) as total_income FROM income WHERE student_id = ?';
    db.get(incomeSql, [studentId], (err, incomeResult) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          error: '查询收入记录失败',
          message: err.message 
        });
      }

      // 查询学生扣除项配置和应用记录
      const deductionsSql = `
        SELECT dc.*, sd.applied_count, sd.last_applied_date
        FROM deduction_configs dc
        INNER JOIN student_deductions sd ON dc.id = sd.deduction_config_id
        WHERE sd.student_id = ? AND dc.is_active = 1
      `;
      
      db.all(deductionsSql, [studentId], (err, deductions) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: '查询扣除项配置失败',
            message: err.message 
          });
        }

        // 查询学生上课记录
        const classesSql = 'SELECT SUM(hours_used) as total_hours FROM classes WHERE student_id = ?';
        db.get(classesSql, [studentId], (err, classesResult) => {
          if (err) {
            return res.status(500).json({ 
              success: false, 
              error: '查询上课记录失败',
              message: err.message 
            });
          }

          const totalIncome = incomeResult.total_income || 0;
          const totalHours = classesResult.total_hours || 0;
          
          // 先查询第一次充值记录（用于单次扣除项计算）
          const firstIncomeSql = 'SELECT amount FROM income WHERE student_id = ? ORDER BY date ASC, id ASC LIMIT 1';
          db.get(firstIncomeSql, [studentId], (err, firstIncome) => {
            if (err) {
              console.error('查询第一次充值记录失败:', err);
              return res.status(500).json({ 
                success: false, 
                error: '查询第一次充值记录失败',
                message: err.message 
              });
            }
            
            const firstIncomeAmount = firstIncome ? firstIncome.amount : 0;
            
            // 计算各项扣除（区分单次和多次）
            let totalOnceDeductions = 0;
            let totalMultipleDeductions = 0;
            const deductionDetails = [];
            
            deductions.forEach(deduction => {
              let deductionAmount = 0;
              let calculation = '';
              let appliedInfo = '';
              
              switch (deduction.type) {
                case 'percentage':
                  if (deduction.frequency === 'once') {
                    // 单次扣除项：按第一次充值金额百分比计算，只扣除一次
                    deductionAmount = firstIncomeAmount * (deduction.value / 100);
                    calculation = `单次扣除: 第一次充值${firstIncomeAmount} × ${deduction.value}% = ${deductionAmount.toFixed(2)}`;
                    appliedInfo = `已应用 ${deduction.applied_count} 次`;
                  } else {
                    // 多次扣除项：每次充值都扣除
                    deductionAmount = totalIncome * (deduction.value / 100);
                    calculation = `${totalIncome} × ${deduction.value}% = ${deductionAmount.toFixed(2)}`;
                    appliedInfo = `已应用 ${deduction.applied_count} 次，最后应用: ${deduction.last_applied_date}`;
                  }
                  break;
                case 'fixed':
                  if (deduction.frequency === 'once') {
                    // 单次扣除项：只扣除一次
                    deductionAmount = deduction.value;
                    calculation = `单次扣除: ${deduction.value}`;
                    appliedInfo = `已应用 ${deduction.applied_count} 次`;
                  } else {
                    // 多次扣除项：每次充值都扣除
                    deductionAmount = deduction.value;
                    calculation = `固定金额: ${deduction.value}`;
                    appliedInfo = `已应用 ${deduction.applied_count} 次，最后应用: ${deduction.last_applied_date}`;
                  }
                  break;
                case 'per_hour':
                  if (deduction.frequency === 'once') {
                    // 单次扣除项：只扣除一次
                    deductionAmount = deduction.value;
                    calculation = `单次扣除: ${deduction.value}`;
                    appliedInfo = `已应用 ${deduction.applied_count} 次`;
                  } else {
                    // 多次扣除项：每次充值都扣除
                    deductionAmount = totalHours * deduction.value;
                    calculation = `${totalHours} 课时 × ${deduction.value} = ${deductionAmount.toFixed(2)}`;
                    appliedInfo = `已应用 ${deduction.applied_count} 次，最后应用: ${deduction.last_applied_date}`;
                  }
                  break;
              }
              
              if (deduction.frequency === 'once') {
                totalOnceDeductions += deductionAmount;
              } else {
                totalMultipleDeductions += deductionAmount;
              }
              
              deductionDetails.push({
                id: deduction.id,
                name: deduction.name,
                type: deduction.type,
                value: deduction.value,
                frequency: deduction.frequency,
                calculation,
                amount: deductionAmount,
                applied_count: deduction.applied_count,
                last_applied_date: deduction.last_applied_date,
                applied_info: appliedInfo
              });
            });
            
            // 查询手动扣除项明细
            const manualDeductionsSql = 'SELECT SUM(amount) as total_manual_deductions FROM deduction_details WHERE student_id = ?';
            db.get(manualDeductionsSql, [studentId], (err, manualDeductionsResult) => {
              if (err) {
                return res.status(500).json({ 
                  success: false, 
                  error: '查询手动扣除项明细失败',
                  message: err.message 
                });
              }
              
              const totalManualDeductions = manualDeductionsResult.total_manual_deductions || 0;
              const totalDeductions = totalOnceDeductions + totalMultipleDeductions + totalManualDeductions;
              const profit = totalIncome - totalDeductions;
              const profitRate = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
              
              res.json({
                success: true,
                data: {
                  student: {
                    id: student.id,
                    name: student.name,
                    phone: student.phone
                  },
                  total_income: totalIncome,
                  total_hours: totalHours,
                  total_deductions: totalDeductions,
                  total_once_deductions: totalOnceDeductions,
                  total_multiple_deductions: totalMultipleDeductions,
                  total_manual_deductions: totalManualDeductions,
                  profit: profit,
                  profit_rate: profitRate,
                  deduction_details: deductionDetails
                },
                message: '利润计算成功'
              });
            });
          });
        });
      });
    });
  });
});

// 计算总体利润
app.get('/profit', authMiddleware, operatorMiddleware, (req, res) => {
  const { period = 'all' } = req.query;
  
  // 根据时间段计算日期范围
  const getDateRange = (period) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'today':
        // 今日：从今天00:00到23:59
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        // 本周：从本周一到今天
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周日的getDay()是0
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        // 当月：从本月1号到今天
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default: // all
        // 全部：从很早的日期到今天
        startDate.setFullYear(2000, 0, 1);
        break;
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  };
  
  const dateRange = getDateRange(period);
  
  // 构建SQL查询条件
  const dateCondition = period === 'all' ? '' : 'AND date >= ? AND date <= ?';
  const dateParams = period === 'all' ? [] : [dateRange.start, dateRange.end];
  
  // 查询总收入
  const incomeSql = `
    SELECT COALESCE(SUM(amount), 0) as total_income, COUNT(*) as income_count
    FROM income 
    WHERE 1=1 ${dateCondition}
  `;
  
  // 查询总课时
  const hoursSql = `
    SELECT COALESCE(SUM(hours_used), 0) as total_hours
    FROM classes 
    WHERE 1=1 ${dateCondition}
  `;
  
  // 查询学生数量
  const studentSql = `
    SELECT COUNT(*) as student_count
    FROM students 
    WHERE 1=1 ${dateCondition ? dateCondition.replace(/date/g, 'created_at') : ''}
  `;
  
  // 查询所有启用的扣除项
  const deductionsSql = 'SELECT * FROM deduction_configs WHERE is_active = 1';
  
  db.serialize(() => {
    let stats = {};
    let completed = 0;
    const totalQueries = 4;
    
    const checkComplete = () => {
      completed++;
      if (completed === totalQueries) {
        // 计算总体利润（区分单次和多次扣除项）
        const totalIncome = stats.total_income || 0;
        const totalHours = stats.total_hours || 0;
        let totalOnceDeductions = 0;
        let totalMultipleDeductions = 0;
        const deductionDetails = [];
        
        if (stats.deductions) {
          stats.deductions.forEach(deduction => {
            let deductionAmount = 0;
            let calculation = '';
            
            switch (deduction.type) {
              case 'percentage':
                if (deduction.frequency === 'once') {
                  // 单次扣除项：按第一次充值金额百分比计算，只扣除一次
                  // 这里需要查询每个学生的第一次充值记录，简化处理为按总收入计算
                  // 实际业务中可能需要更复杂的逻辑
                  deductionAmount = totalIncome * (deduction.value / 100);
                  calculation = `单次扣除: ${totalIncome} × ${deduction.value}% = ${deductionAmount.toFixed(2)}`;
                } else {
                  // 多次扣除项：按收入百分比计算
                  deductionAmount = totalIncome * (deduction.value / 100);
                  calculation = `${totalIncome} × ${deduction.value}% = ${deductionAmount.toFixed(2)}`;
                }
                break;
              case 'fixed':
                if (deduction.frequency === 'once') {
                  // 单次扣除项：按学生数量计算
                  deductionAmount = (stats.student_count || 0) * deduction.value;
                  calculation = `单次扣除: ${stats.student_count || 0} 学生 × ${deduction.value} = ${deductionAmount.toFixed(2)}`;
                } else {
                  // 多次扣除项：固定金额
                  deductionAmount = deduction.value;
                  calculation = `固定金额: ${deductionAmount}`;
                }
                break;
              case 'per_hour':
                if (deduction.frequency === 'once') {
                  // 单次扣除项：按学生数量计算
                  deductionAmount = (stats.student_count || 0) * deduction.value;
                  calculation = `单次扣除: ${stats.student_count || 0} 学生 × ${deduction.value} = ${deductionAmount.toFixed(2)}`;
                } else {
                  // 多次扣除项：按课时计算
                  deductionAmount = totalHours * deduction.value;
                  calculation = `${totalHours} 课时 × ${deduction.value} = ${deductionAmount.toFixed(2)}`;
                }
                break;
            }
            
            if (deduction.frequency === 'once') {
              totalOnceDeductions += deductionAmount;
            } else {
              totalMultipleDeductions += deductionAmount;
            }
            
            deductionDetails.push({
              id: deduction.id,
              name: deduction.name,
              type: deduction.type,
              value: deduction.value,
              frequency: deduction.frequency,
              calculation,
              amount: deductionAmount
            });
          });
        }
        
        // 查询手动扣除项明细
        const manualDeductionsSql = `
          SELECT 
            COALESCE(SUM(amount), 0) as total_manual_deductions,
            deduction_type,
            COUNT(*) as count
          FROM deduction_details 
          WHERE 1=1 ${dateCondition}
          GROUP BY deduction_type
        `;
        
        db.all(manualDeductionsSql, dateParams, (err, manualDeductions) => {
          if (err) {
            console.error('查询手动扣除项明细失败:', err);
            const totalManualDeductions = 0;
            const manualDeductionDetails = [];
            const totalDeductions = totalOnceDeductions + totalMultipleDeductions + totalManualDeductions;
            const profit = totalIncome - totalDeductions;
            const profitRate = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
            
            res.json({
              success: true,
              data: {
                period: period,
                total_income: totalIncome,
                total_hours: totalHours,
                total_deductions: totalDeductions,
                total_once_deductions: totalOnceDeductions,
                total_multiple_deductions: totalMultipleDeductions,
                total_manual_deductions: totalManualDeductions,
                profit: profit,
                profit_rate: profitRate,
                deduction_details: deductionDetails,
                manual_deduction_details: manualDeductionDetails
              },
              message: '总体利润计算成功'
            });
            return;
          }
          
          const totalManualDeductions = manualDeductions.reduce((sum, item) => sum + item.total_manual_deductions, 0);
          const manualDeductionDetails = manualDeductions.map(item => ({
            type: item.deduction_type,
            amount: item.total_manual_deductions,
            count: item.count
          }));
          
          const totalDeductions = totalOnceDeductions + totalMultipleDeductions + totalManualDeductions;
          const profit = totalIncome - totalDeductions;
          const profitRate = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
          
          res.json({
            success: true,
            data: {
              period: period,
              total_income: totalIncome,
              total_hours: totalHours,
              total_deductions: totalDeductions,
              total_once_deductions: totalOnceDeductions,
              total_multiple_deductions: totalMultipleDeductions,
              total_manual_deductions: totalManualDeductions,
              profit: profit,
              profit_rate: profitRate,
              deduction_details: deductionDetails,
              manual_deduction_details: manualDeductionDetails
            },
            message: '总体利润计算成功'
          });
        });
      }
    };
    
    // 查询总收入
    db.get(incomeSql, dateParams, (err, row) => {
      if (err) {
        console.error('查询收入统计失败:', err);
        stats.total_income = 0;
        stats.income_count = 0;
      } else {
        stats.total_income = row.total_income;
        stats.income_count = row.income_count;
      }
      checkComplete();
    });
    
    // 查询总课时
    db.get(hoursSql, dateParams, (err, row) => {
      if (err) {
        console.error('查询课时统计失败:', err);
        stats.total_hours = 0;
      } else {
        stats.total_hours = row.total_hours;
      }
      checkComplete();
    });
    
    // 查询学生数量
    db.get(studentSql, dateParams, (err, row) => {
      if (err) {
        console.error('查询学生统计失败:', err);
        stats.student_count = 0;
      } else {
        stats.student_count = row.student_count;
      }
      checkComplete();
    });
    
    // 查询扣除项
    db.all(deductionsSql, [], (err, rows) => {
      if (err) {
        console.error('查询扣除项失败:', err);
        stats.deductions = [];
      } else {
        stats.deductions = rows;
      }
      checkComplete();
    });
  });
});

// ==================== 扣除项明细管理API ====================

// 添加扣除项明细
app.post('/students/:id/deduction-details', authMiddleware, adminMiddleware, logMiddleware('CREATE_DEDUCTION_DETAIL', 'deduction_detail'), (req, res) => {
  const studentId = req.params.id;
  const { deduction_type, amount, description, date, operator, related_class_id } = req.body;
  
  // 参数验证
  if (!deduction_type || !amount || !date || !operator) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '扣除类型、金额、日期和操作人不能为空' 
    });
  }

  if (amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '扣除金额必须大于0' 
    });
  }

  // 验证扣除类型
  const validTypes = ['teacher_fee', 'material_fee', 'equipment_fee', 'other_fee'];
  if (!validTypes.includes(deduction_type)) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '扣除类型无效' 
    });
  }

  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // 1. 检查学生是否存在
    const checkStudentSql = 'SELECT * FROM students WHERE id = ?';
    db.get(checkStudentSql, [studentId], (err, student) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '查询学生信息失败' 
        });
      }
      
      if (!student) {
        db.run('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          error: '学生不存在',
          message: '未找到指定ID的学生' 
        });
      }
      
      // 2. 如果关联上课记录，检查上课记录是否存在
      if (related_class_id) {
        const checkClassSql = 'SELECT * FROM classes WHERE id = ? AND student_id = ?';
        db.get(checkClassSql, [related_class_id, studentId], (err, classRecord) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ 
              success: false, 
              error: '数据库操作失败',
              message: '查询上课记录失败' 
            });
          }
          
          if (!classRecord) {
            db.run('ROLLBACK');
            return res.status(400).json({ 
              success: false, 
              error: '上课记录不存在',
              message: '关联的上课记录不存在或不属于该学生' 
            });
          }
          
          // 3. 插入扣除项明细
          insertDeductionDetail();
        });
      } else {
        // 没有关联上课记录，直接插入
        insertDeductionDetail();
      }
      
      function insertDeductionDetail() {
        const insertSql = `
          INSERT INTO deduction_details (student_id, deduction_type, amount, description, date, operator, related_class_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
        `;
        
        db.run(insertSql, [studentId, deduction_type, amount, description, date, operator, related_class_id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ 
              success: false, 
              error: '数据库操作失败',
              message: '添加扣除项明细失败' 
            });
          }
          
          // 4. 记录操作日志
          const logSql = `
            INSERT INTO operation_logs (operation_type, target_id, target_type, description, created_at)
            VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
          `;
          const logDescription = `添加扣除项明细：学生${student.name}，类型${deduction_type}，金额¥${amount}`;
          
          db.run(logSql, ['ADD_DEDUCTION_DETAIL', this.lastID, 'deduction_details', logDescription], function(err) {
            if (err) {
              console.error('记录操作日志失败:', err);
              // 日志记录失败不影响主操作
            }
            
            // 5. 提交事务
            db.run('COMMIT', (err) => {
              if (err) {
                return res.status(500).json({ 
                  success: false, 
                  error: '数据库操作失败',
                  message: '提交事务失败' 
                });
              }
              
              res.status(201).json({
                success: true,
                data: {
                  id: this.lastID,
                  student_id: studentId,
                  deduction_type,
                  amount,
                  description,
                  date,
                  operator,
                  related_class_id,
                  created_at: new Date().toISOString()
                },
                message: '扣除项明细添加成功'
              });
            });
          });
        });
      }
    });
  });
});

// 获取学生扣除项明细
app.get('/students/:id/deduction-details', authMiddleware, operatorMiddleware, (req, res) => {
  const studentId = req.params.id;
  const { type, start_date, end_date } = req.query;
  
  // 构建查询条件
  let whereConditions = ['dd.student_id = ?'];
  let params = [studentId];
  
  if (type) {
    whereConditions.push('dd.deduction_type = ?');
    params.push(type);
  }
  
  if (start_date) {
    whereConditions.push('dd.date >= ?');
    params.push(start_date);
  }
  
  if (end_date) {
    whereConditions.push('dd.date <= ?');
    params.push(end_date);
  }
  
  const sql = `
    SELECT 
      dd.*,
      c.hours_used as related_class_hours,
      c.date as related_class_date
    FROM deduction_details dd
    LEFT JOIN classes c ON dd.related_class_id = c.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY dd.date DESC, dd.created_at DESC
  `;
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: '查询扣除项明细失败',
        message: err.message 
      });
    }
    
    res.json({
      success: true,
      data: rows,
      message: '获取扣除项明细成功'
    });
  });
});

// 获取所有扣除项明细（支持筛选）
app.get('/deduction-details', authMiddleware, operatorMiddleware, (req, res) => {
  const { student_id, type, start_date, end_date, page = 1, limit = 20 } = req.query;
  
  // 构建查询条件
  let whereConditions = ['1=1'];
  let params = [];
  
  if (student_id) {
    whereConditions.push('dd.student_id = ?');
    params.push(student_id);
  }
  
  if (type) {
    whereConditions.push('dd.deduction_type = ?');
    params.push(type);
  }
  
  if (start_date) {
    whereConditions.push('dd.date >= ?');
    params.push(start_date);
  }
  
  if (end_date) {
    whereConditions.push('dd.date <= ?');
    params.push(end_date);
  }
  
  // 计算分页
  const offset = (page - 1) * limit;
  
  const sql = `
    SELECT 
      dd.*,
      s.name as student_name,
      s.phone as student_phone,
      c.hours_used as related_class_hours,
      c.date as related_class_date
    FROM deduction_details dd
    LEFT JOIN students s ON dd.student_id = s.id
    LEFT JOIN classes c ON dd.related_class_id = c.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY dd.date DESC, dd.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  // 查询总数
  const countSql = `
    SELECT COUNT(*) as total
    FROM deduction_details dd
    WHERE ${whereConditions.join(' AND ')}
  `;
  
  db.serialize(() => {
    // 先查询总数
    db.get(countSql, params, (err, countResult) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          error: '查询总数失败',
          message: err.message 
        });
      }
      
      const total = countResult.total;
      
      // 再查询数据
      db.all(sql, [...params, limit, offset], (err, rows) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: '查询扣除项明细失败',
            message: err.message 
          });
        }
        
        res.json({
          success: true,
          data: {
            list: rows,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              pages: Math.ceil(total / limit)
            }
          },
          message: '获取扣除项明细成功'
        });
      });
    });
  });
});

// 修改扣除项明细
app.put('/deduction-details/:id', authMiddleware, adminMiddleware, logMiddleware('UPDATE_DEDUCTION_DETAIL', 'deduction_detail'), (req, res) => {
  const detailId = req.params.id;
  const { deduction_type, amount, description, date, operator, related_class_id } = req.body;
  
  // 参数验证
  if (!deduction_type || !amount || !date || !operator) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '扣除类型、金额、日期和操作人不能为空' 
    });
  }

  if (amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '扣除金额必须大于0' 
    });
  }

  // 验证扣除类型
  const validTypes = ['teacher_fee', 'material_fee', 'equipment_fee', 'other_fee'];
  if (!validTypes.includes(deduction_type)) {
    return res.status(400).json({ 
      success: false, 
      error: '参数错误',
      message: '扣除类型无效' 
    });
  }

  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // 1. 查询原记录
    const getDetailSql = `
      SELECT dd.*, s.name as student_name
      FROM deduction_details dd
      LEFT JOIN students s ON dd.student_id = s.id
      WHERE dd.id = ?
    `;
    
    db.get(getDetailSql, [detailId], (err, detail) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '查询扣除项明细失败' 
        });
      }
      
      if (!detail) {
        db.run('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          error: '扣除项明细不存在',
          message: '未找到指定ID的扣除项明细' 
        });
      }
      
      // 2. 如果关联上课记录，检查上课记录是否存在
      if (related_class_id) {
        const checkClassSql = 'SELECT * FROM classes WHERE id = ? AND student_id = ?';
        db.get(checkClassSql, [related_class_id, detail.student_id], (err, classRecord) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ 
              success: false, 
              error: '数据库操作失败',
              message: '查询上课记录失败' 
            });
          }
          
          if (!classRecord) {
            db.run('ROLLBACK');
            return res.status(400).json({ 
              success: false, 
              error: '上课记录不存在',
              message: '关联的上课记录不存在或不属于该学生' 
            });
          }
          
          // 3. 更新扣除项明细
          updateDeductionDetail();
        });
      } else {
        // 没有关联上课记录，直接更新
        updateDeductionDetail();
      }
      
      function updateDeductionDetail() {
        const updateSql = `
          UPDATE deduction_details 
          SET deduction_type = ?, amount = ?, description = ?, date = ?, operator = ?, related_class_id = ?
          WHERE id = ?
        `;
        
        db.run(updateSql, [deduction_type, amount, description, date, operator, related_class_id, detailId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ 
              success: false, 
              error: '数据库操作失败',
              message: '更新扣除项明细失败' 
            });
          }
          
          if (this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(404).json({ 
              success: false, 
              error: '扣除项明细不存在',
              message: '未找到指定ID的扣除项明细' 
            });
          }
          
          // 4. 记录操作日志
          const logSql = `
            INSERT INTO operation_logs (operation_type, target_id, target_type, description, created_at)
            VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
          `;
          const logDescription = `更新扣除项明细：学生${detail.student_name}，类型${deduction_type}，金额¥${amount}`;
          
          db.run(logSql, ['UPDATE_DEDUCTION_DETAIL', detailId, 'deduction_details', logDescription], function(err) {
            if (err) {
              console.error('记录操作日志失败:', err);
              // 日志记录失败不影响主操作
            }
            
            // 5. 提交事务
            db.run('COMMIT', (err) => {
              if (err) {
                return res.status(500).json({ 
                  success: false, 
                  error: '数据库操作失败',
                  message: '提交事务失败' 
                });
              }
              
              res.json({
                success: true,
                data: {
                  id: detailId,
                  student_id: detail.student_id,
                  deduction_type,
                  amount,
                  description,
                  date,
                  operator,
                  related_class_id,
                  updated_at: new Date().toISOString()
                },
                message: '扣除项明细更新成功'
              });
            });
          });
        });
      }
    });
  });
});

// 删除扣除项明细
app.delete('/deduction-details/:id', authMiddleware, adminMiddleware, logMiddleware('DELETE_DEDUCTION_DETAIL', 'deduction_detail'), (req, res) => {
  const detailId = req.params.id;
  
  // 开始事务
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // 1. 查询原记录
    const getDetailSql = `
      SELECT dd.*, s.name as student_name
      FROM deduction_details dd
      LEFT JOIN students s ON dd.student_id = s.id
      WHERE dd.id = ?
    `;
    
    db.get(getDetailSql, [detailId], (err, detail) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ 
          success: false, 
          error: '数据库操作失败',
          message: '查询扣除项明细失败' 
        });
      }
      
      if (!detail) {
        db.run('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          error: '扣除项明细不存在',
          message: '未找到指定ID的扣除项明细' 
        });
      }
      
      // 2. 删除扣除项明细
      const deleteSql = 'DELETE FROM deduction_details WHERE id = ?';
      db.run(deleteSql, [detailId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ 
            success: false, 
            error: '数据库操作失败',
            message: '删除扣除项明细失败' 
          });
        }
        
        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ 
            success: false, 
            error: '扣除项明细不存在',
            message: '未找到指定ID的扣除项明细' 
          });
        }
        
        // 3. 记录操作日志
        const logSql = `
          INSERT INTO operation_logs (operation_type, target_id, target_type, description, created_at)
          VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
        `;
        const logDescription = `删除扣除项明细：学生${detail.student_name}，类型${detail.deduction_type}，金额¥${detail.amount}`;
        
        db.run(logSql, ['DELETE_DEDUCTION_DETAIL', detailId, 'deduction_details', logDescription], function(err) {
          if (err) {
            console.error('记录操作日志失败:', err);
            // 日志记录失败不影响主操作
          }
          
          // 4. 提交事务
          db.run('COMMIT', (err) => {
            if (err) {
              return res.status(500).json({ 
                success: false, 
                error: '数据库操作失败',
                message: '删除扣除项明细失败' 
              });
            }
            
            res.json({
              success: true,
              data: {
                deleted_id: detailId,
                student_name: detail.student_name,
                deduction_type: detail.deduction_type,
                amount: detail.amount
              },
              message: '扣除项明细删除成功'
            });
          });
        });
      });
    });
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 培训班课时管理系统启动成功！`);
  console.log(`🌐 服务器运行在 http://localhost:${PORT}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🎯 智能扣除项利润计算系统:');
  console.log('   • 扣除项频率: 单次(once) / 多次(multiple)');
  console.log('   • 新学员自动应用单次扣除项');
  console.log('   • 充值自动应用多次扣除项');
  console.log('   • 利润 = 总收入 - 单次扣除项 - 多次扣除项累计');
  console.log('');
  console.log('📊 API 端点:');
  console.log('   👥 学生管理: POST/GET /students, /students/:id, /students/:id/recharge, /students/:id/consume, /students/:id/delete');
  console.log('   📈 统计报表: GET /stats, /stats/income-trend, /stats/hours-trend');
  console.log('   ⚙️  扣除项管理: POST/GET/PUT /deduction-configs');
  console.log('   🔗 学生扣除项: GET/POST /students/:id/deductions');
  console.log('   💰 利润计算: GET /students/:id/profit, /profit');
  console.log('   🗑️  记录管理: DELETE /income/:id');
});

// 优雅关闭
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库时出错:', err.message);
    } else {
      console.log('数据库连接已关闭');
    }
    process.exit(0);
  });
});
