const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// JWT密钥（生产环境应该使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// 数据库连接
const db = new sqlite3.Database('./training.db');

// 身份验证中间件
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.session?.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '访问令牌缺失，请先登录' 
      });
    }

    // 验证JWT令牌
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            success: false, 
            message: '访问令牌已过期，请重新登录' 
          });
        }
        return res.status(401).json({ 
          success: false, 
          message: '无效的访问令牌' 
        });
      }

      // 检查用户是否仍然存在且启用
      db.get('SELECT id, username, role, real_name, is_active FROM users WHERE id = ? AND is_active = 1', 
        [decoded.userId], (err, user) => {
          if (err || !user) {
            return res.status(401).json({ 
              success: false, 
              message: '用户不存在或已被禁用' 
            });
          }

          // 将用户信息添加到请求对象
          req.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            real_name: user.real_name
          };

          next();
        });
    });
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误' 
    });
  }
};

// 角色权限中间件
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: '用户未认证' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: '权限不足，无法访问此功能' 
      });
    }

    next();
  };
};

// 管理员权限中间件
const adminMiddleware = roleMiddleware(['admin']);

// 教师权限中间件
const teacherMiddleware = roleMiddleware(['admin', 'teacher']);

// 操作员权限中间件
const operatorMiddleware = roleMiddleware(['admin', 'teacher', 'operator']);

// 请求日志中间件
const logMiddleware = (operationType, targetType = null) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // 记录操作日志
      if (req.user && res.statusCode < 400) {
        try {
          let targetId = null;
          let description = '';

          // 根据操作类型获取目标ID和描述
          switch (operationType) {
            case 'CREATE_STUDENT':
              targetId = JSON.parse(data).data?.id;
              description = `创建学生: ${req.body.name}`;
              break;
            case 'UPDATE_STUDENT':
              targetId = req.params.id;
              description = `更新学生信息: ${req.body.name || 'ID: ' + req.params.id}`;
              break;
            case 'DELETE_STUDENT':
              targetId = req.params.id;
              description = `删除学生: ID ${req.params.id}`;
              break;
            case 'ADD_INCOME':
              targetId = JSON.parse(data).data?.id;
              description = `添加收入: ${req.body.amount}元`;
              break;
            case 'ADD_CLASS':
              targetId = JSON.parse(data).data?.id;
              description = `记录上课: ${req.body.hours_used}小时`;
              break;
            case 'CREATE_DEDUCTION_CONFIG':
              targetId = JSON.parse(data).data?.id;
              description = `创建扣除项配置: ${req.body.name}`;
              break;
            case 'UPDATE_DEDUCTION_CONFIG':
              targetId = req.params.id;
              description = `更新扣除项配置: ${req.body.name || 'ID: ' + req.params.id}`;
              break;
            case 'CREATE_STUDENT_DEDUCTION':
              targetId = req.params.id;
              description = `为学生配置扣除项: 学生ID ${req.params.id}`;
              break;
            case 'CREATE_DEDUCTION_DETAIL':
              targetId = JSON.parse(data).data?.id;
              description = `创建扣除项明细: ${req.body.deduction_type}`;
              break;
            case 'UPDATE_DEDUCTION_DETAIL':
              targetId = req.params.id;
              description = `更新扣除项明细: ID ${req.params.id}`;
              break;
            case 'DELETE_DEDUCTION_DETAIL':
              targetId = req.params.id;
              description = `删除扣除项明细: ID ${req.params.id}`;
              break;
            case 'DELETE_INCOME':
              targetId = req.params.id;
              description = `删除收入记录: ID ${req.params.id}`;
              break;
            case 'LOGIN':
              targetId = req.user?.id;
              description = `用户登录: ${req.user?.username}`;
              break;
            case 'LOGOUT':
              targetId = req.user?.id;
              description = `用户登出: ${req.user?.username}`;
              break;
            default:
              description = operationType;
              // 对于未知操作类型，使用用户ID作为targetId
              targetId = req.user?.id || 0;
          }

          // 确保targetId不为空，如果为空则使用用户ID
          if (!targetId) {
            targetId = req.user?.id || 0;
          }

          db.run(`INSERT INTO operation_logs (operation_type, target_id, target_type, description, user_id) 
                  VALUES (?, ?, ?, ?, ?)`,
                  [operationType, targetId, targetType, description, req.user.id]);
        } catch (error) {
          console.error('记录操作日志失败:', error);
        }
      }

      originalSend.call(this, data);
    };

    next();
  };
};

// 登录失败限制中间件
const loginLimitMiddleware = (req, res, next) => {
  const { username, ip } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;

  // 检查最近5分钟内的登录失败次数
  db.get(`SELECT COUNT(*) as count FROM login_attempts 
           WHERE username = ? AND ip_address = ? AND success = 0 
           AND attempt_time > datetime('now', '-5 minutes')`,
    [username, clientIP], (err, result) => {
      if (err) {
        console.error('检查登录限制失败:', err);
        return next();
      }

      if (result.count >= 5) {
        return res.status(429).json({
          success: false,
          message: '登录失败次数过多，请5分钟后再试'
        });
      }

      next();
    });
};

// 密码强度验证中间件
const passwordStrengthMiddleware = (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      success: false,
      message: '密码不能为空'
    });
  }

  // 密码强度要求：至少8位，包含字母和数字
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
  
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message: '密码必须至少8位，包含字母和数字'
    });
  }

  next();
};

// 生成JWT令牌
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// 验证密码
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// 加密密码
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

module.exports = {
  authMiddleware,
  roleMiddleware,
  adminMiddleware,
  teacherMiddleware,
  operatorMiddleware,
  logMiddleware,
  loginLimitMiddleware,
  passwordStrengthMiddleware,
  generateToken,
  verifyPassword,
  hashPassword,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
