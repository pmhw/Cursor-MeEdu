import axios from 'axios'

// 创建axios实例
const authInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
  withCredentials: true
})

// 请求拦截器
authInstance.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
authInstance.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // 处理401错误（未授权）
    if (error.response?.status === 401) {
      // 清除本地存储的认证信息
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // 如果不是登录页面，跳转到登录页
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// 认证相关API
export const authApi = {
  // 用户登录
  login: (credentials) => {
    return authInstance.post('/auth/login', credentials)
  },

  // 用户登出
  logout: () => {
    return authInstance.post('/auth/logout')
  },

  // 获取当前用户信息
  getProfile: () => {
    return authInstance.get('/auth/profile')
  },

  // 更新用户信息
  updateProfile: (profileData) => {
    return authInstance.put('/auth/profile', profileData)
  },

  // 修改密码
  changePassword: (passwordData) => {
    return authInstance.post('/auth/change-password', passwordData)
  },

  // 验证令牌有效性
  verifyToken: () => {
    return authInstance.get('/auth/verify')
  },

  // 用户注册（仅管理员）
  register: (userData) => {
    return authInstance.post('/auth/register', userData)
  },

  // 获取所有用户列表（仅管理员）
  getUsers: () => {
    return authInstance.get('/auth/users')
  },

  // 启用/禁用用户（仅管理员）
  updateUserStatus: (userId, isActive) => {
    return authInstance.put(`/auth/users/${userId}/status`, { is_active: isActive })
  }
}

export default authApi
