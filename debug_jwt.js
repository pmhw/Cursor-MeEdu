const jwt = require('jsonwebtoken');

// JWT密钥
const JWT_SECRET = 'your-secret-key-change-in-production';

// 测试令牌
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1NjcyNjI0MCwiZXhwIjoxNzU2ODEyNjQwfQ.Ze2Og_wHrLoAa8WcaHxnKSGOivdz9exRj1Babw2siI0';

console.log('=== JWT 令牌调试 ===');

try {
  // 解码令牌（不验证签名）
  const decoded = jwt.decode(testToken);
  console.log('📋 令牌解码结果:', decoded);
  
  // 验证令牌
  const verified = jwt.verify(testToken, JWT_SECRET);
  console.log('✅ 令牌验证成功:', verified);
  
  // 生成新令牌进行对比
  const newToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '24h' });
  console.log('🆕 新生成的令牌:', newToken);
  
  // 验证新令牌
  const newVerified = jwt.verify(newToken, JWT_SECRET);
  console.log('✅ 新令牌验证成功:', newVerified);
  
} catch (error) {
  console.error('❌ JWT验证失败:', error.message);
  
  if (error.name === 'TokenExpiredError') {
    console.log('💡 令牌已过期');
  } else if (error.name === 'JsonWebTokenError') {
    console.log('💡 令牌格式错误或签名无效');
  }
}
