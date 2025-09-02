const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// 导入中间件
const { 
  authMiddleware, 
  adminMiddleware, 
  logMiddleware, 
  loginLimitMiddleware, 
  passwordStrengthMiddleware,
  generateToken,
  verifyPassword,
  hashPassword,
  JWT_SECRET 
} = require('../middleware/auth');

// 数据库连接
const db = new sqlite3.Database('./training.db');

// 用户登录
router.post('/login', loginLimitMiddleware, async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 查询用户
    db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], async (err, user) => {
      if (err) {
        console.error('查询用户失败:', err);
        return res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }

      if (!user) {
        // 记录登录失败
        db.run('INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)', 
               [username, clientIP, 0]);
        
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 验证密码
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        // 记录登录失败
        db.run('INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)', 
               [username, clientIP, 0]);
        
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 生成JWT令牌
      const token = generateToken(user.id);
      const expiresIn = rememberMe ? '7d' : '24h';
      const tokenWithRemember = rememberMe ? 
        jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' }) :
        token;

      // 更新最后登录时间
      db.run('UPDATE users SET last_login = datetime("now", "localtime") WHERE id = ?', [user.id]);

      // 记录登录成功
      db.run('INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, ?)', 
             [username, clientIP, 1]);

      // 清理过期会话
      db.run('DELETE FROM user_sessions WHERE expires_at < datetime("now", "localtime")');

      // 保存会话
      db.run('INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
             [user.id, tokenWithRemember, new Date(Date.now() + (rememberMe ? 7 : 1) * 24 * 60 * 60 * 1000).toISOString()]);

      res.json({
        success: true,
        message: '登录成功',
        data: {
          token: tokenWithRemember,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            real_name: user.real_name,
            email: user.email,
            phone: user.phone
          },
          expiresIn
        }
      });
    });

  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 用户登出
router.post('/logout', authMiddleware, logMiddleware('LOGOUT', 'user'), (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.session?.token;

    if (token) {
      // 从会话表中删除令牌
      db.run('DELETE FROM user_sessions WHERE token = ?', [token]);
    }

    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 用户注册（仅管理员）
router.post('/register', adminMiddleware, passwordStrengthMiddleware, async (req, res) => {
  try {
    const { username, password, role, real_name, email, phone } = req.body;

    // 验证输入
    if (!username || !password || !role || !real_name) {
      return res.status(400).json({
        success: false,
        message: '用户名、密码、角色和真实姓名不能为空'
      });
    }

    // 验证角色
    const validRoles = ['admin', 'teacher', 'operator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户角色'
      });
    }

    // 检查用户名是否已存在
    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, existingUser) => {
      if (err) {
        console.error('检查用户名失败:', err);
        return res.status(500).json({
          success: false,
          message: '服务器内部错误'
        });
      }

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }

      // 加密密码
      const hashedPassword = await hashPassword(password);

      // 创建用户
      db.run(`INSERT INTO users (username, password, role, real_name, email, phone, is_active) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [username, hashedPassword, role, real_name, email, phone, 1], function(err) {
        if (err) {
          console.error('创建用户失败:', err);
          return res.status(500).json({
            success: false,
            message: '创建用户失败'
          });
        }

        res.json({
          success: true,
          message: '用户创建成功',
          data: {
            id: this.lastID,
            username,
            role,
            real_name,
            email,
            phone
          }
        });
      });
    });

  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取当前用户信息
router.get('/profile', authMiddleware, (req, res) => {
  try {
    db.get('SELECT id, username, role, real_name, email, phone, is_active, last_login, created_at FROM users WHERE id = ?', 
           [req.user.id], (err, user) => {
      if (err || !user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      res.json({
        success: true,
        data: user
      });
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 更新用户信息
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { real_name, email, phone } = req.body;

    // 验证输入
    if (!real_name) {
      return res.status(400).json({
        success: false,
        message: '真实姓名不能为空'
      });
    }

    // 更新用户信息
    db.run(`UPDATE users SET real_name = ?, email = ?, phone = ?, updated_at = datetime("now", "localtime") 
            WHERE id = ?`, [real_name, email, phone, req.user.id], function(err) {
      if (err) {
        console.error('更新用户信息失败:', err);
        return res.status(500).json({
          success: false,
          message: '更新用户信息失败'
        });
      }

      res.json({
        success: true,
        message: '用户信息更新成功'
      });
    });

  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 修改密码
router.post('/change-password', authMiddleware, passwordStrengthMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码和新密码不能为空'
      });
    }

    // 验证当前密码
    db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
      if (err || !user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      const isValidPassword = await verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: '当前密码错误'
        });
      }

      // 加密新密码
      const hashedNewPassword = await hashPassword(newPassword);

      // 更新密码
      db.run('UPDATE users SET password = ?, updated_at = datetime("now", "localtime") WHERE id = ?',
             [hashedNewPassword, req.user.id], function(err) {
        if (err) {
          console.error('修改密码失败:', err);
          return res.status(500).json({
            success: false,
            message: '修改密码失败'
          });
        }

        // 删除所有会话，强制重新登录
        db.run('DELETE FROM user_sessions WHERE user_id = ?', [req.user.id]);

        res.json({
          success: true,
          message: '密码修改成功，请重新登录'
        });
      });
    });

  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 验证令牌有效性
router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: '令牌有效',
    data: {
      user: req.user
    }
  });
});

// 获取所有用户列表（仅管理员）
router.get('/users', adminMiddleware, (req, res) => {
  try {
    db.all('SELECT id, username, role, real_name, email, phone, is_active, last_login, created_at FROM users ORDER BY created_at DESC',
           (err, users) => {
      if (err) {
        console.error('获取用户列表失败:', err);
        return res.status(500).json({
          success: false,
          message: '获取用户列表失败'
        });
      }

      res.json({
        success: true,
        data: users
      });
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 启用/禁用用户（仅管理员）
router.put('/users/:id/status', adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (id == req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能修改自己的状态'
      });
    }

    db.run('UPDATE users SET is_active = ?, updated_at = datetime("now", "localtime") WHERE id = ?',
           [is_active ? 1 : 0, id], function(err) {
      if (err) {
        console.error('更新用户状态失败:', err);
        return res.status(500).json({
          success: false,
          message: '更新用户状态失败'
        });
      }

      res.json({
        success: true,
        message: `用户${is_active ? '启用' : '禁用'}成功`
      });
    });

  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
