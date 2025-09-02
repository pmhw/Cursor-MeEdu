const axios = require('axios');

async function debugAuth() {
  console.log('=== 认证调试 ===');
  
  // 创建axios实例
  const api = axios.create({
    proxy: false,
    timeout: 5000
  });
  
  try {
    // 1. 登录获取令牌
    console.log('\n1. 登录获取令牌...');
    const loginResponse = await api.post('http://localhost:3000/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功，令牌:', token.substring(0, 50) + '...');
    
    // 2. 测试不同的请求头格式
    console.log('\n2. 测试不同的请求头格式...');
    
    // 测试1: 标准Bearer格式
    console.log('\n测试1: 标准Bearer格式');
    try {
      const response1 = await api.get('http://localhost:3000/students', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ 标准Bearer格式成功:', response1.data);
    } catch (error) {
      console.log('❌ 标准Bearer格式失败:', error.response?.data);
    }
    
    // 测试2: 不带Bearer前缀
    console.log('\n测试2: 不带Bearer前缀');
    try {
      const response2 = await api.get('http://localhost:3000/students', {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ 不带Bearer前缀成功:', response2.data);
    } catch (error) {
      console.log('❌ 不带Bearer前缀失败:', error.response?.data);
    }
    
    // 测试3: 使用X-Auth-Token头
    console.log('\n测试3: 使用X-Auth-Token头');
    try {
      const response3 = await api.get('http://localhost:3000/students', {
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ X-Auth-Token头成功:', response3.data);
    } catch (error) {
      console.log('❌ X-Auth-Token头失败:', error.response?.data);
    }
    
    // 测试4: 直接访问健康检查接口（无需认证）
    console.log('\n测试4: 健康检查接口');
    try {
      const response4 = await api.get('http://localhost:3000/health');
      console.log('✅ 健康检查成功:', response4.data);
    } catch (error) {
      console.log('❌ 健康检查失败:', error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  }
}

debugAuth();
