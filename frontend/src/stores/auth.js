import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(() => {
    try {
      const userData = localStorage.getItem('user')
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      console.error('解析用户数据失败:', error)
      localStorage.removeItem('user') // 清除无效数据
      return null
    }
  })
  const loading = ref(false)
  const error = ref('')

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => user.value?.role || '')
  const isAdmin = computed(() => userRole.value === 'admin')
  const isTeacher = computed(() => ['admin', 'teacher'].includes(userRole.value))
  const isOperator = computed(() => ['admin', 'teacher', 'operator'].includes(userRole.value))
  const userName = computed(() => {
    if (!user.value) return '用户'
    return user.value.real_name || user.value.username || '用户'
  })

  // 登录
  const login = async (credentials) => {
    try {
      loading.value = true
      error.value = ''
      
      const response = await authApi.login(credentials)
      
      if (response.success) {
        // 保存认证信息
        token.value = response.data.token
        user.value = response.data.user
        
        // 保存到本地存储
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        
        // 如果选择记住登录，保存用户名
        if (credentials.rememberMe) {
          localStorage.setItem('rememberedUsername', credentials.username)
        } else {
          localStorage.removeItem('rememberedUsername')
        }
        
        // 设置axios默认headers
        setAuthHeader(response.data.token)
        
        return { success: true, message: response.message }
      } else {
        error.value = response.message
        return { success: false, message: response.message }
      }
    } catch (err) {
      console.error('登录失败:', err)
      error.value = err.response?.data?.message || '登录失败，请检查网络连接'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = async () => {
    try {
      if (token.value) {
        await authApi.logout()
      }
    } catch (err) {
      console.error('登出失败:', err)
    } finally {
      // 清除认证信息
      token.value = ''
      user.value = null
      error.value = ''
      
      // 清除本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // 清除axios默认headers
      clearAuthHeader()
    }
  }

  // 获取用户信息
  const fetchProfile = async () => {
    try {
      if (!token.value) return null
      
      const response = await authApi.getProfile()
      if (response.success) {
        user.value = response.data
        localStorage.setItem('user', JSON.stringify(response.data))
        return response.data
      }
      return null
    } catch (err) {
      console.error('获取用户信息失败:', err)
      // 如果获取失败，可能是token过期，清除认证状态
      if (err.response?.status === 401) {
        logout()
      }
      return null
    }
  }

  // 验证令牌
  const verifyToken = async () => {
    try {
      if (!token.value) return false
      
      const response = await authApi.verifyToken()
      return response.success
    } catch (err) {
      console.error('验证令牌失败:', err)
      return false
    }
  }

  // 自动登录检查
  const checkAuth = async () => {
    if (!token.value) return false
    
    // 验证令牌有效性
    const isValid = await verifyToken()
    if (!isValid) {
      logout()
      return false
    }
    
    // 获取最新用户信息
    await fetchProfile()
    return true
  }

  // 设置axios认证头
  const setAuthHeader = (authToken) => {
    if (typeof window !== 'undefined' && window.axios) {
      window.axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
    }
  }

  // 清除axios认证头
  const clearAuthHeader = () => {
    if (typeof window !== 'undefined' && window.axios) {
      delete window.axios.defaults.headers.common['Authorization']
    }
  }

  // 权限检查
  const hasPermission = (requiredRole) => {
    if (!isAuthenticated.value) return false
    
    const roleHierarchy = {
      'operator': 1,
      'teacher': 2,
      'admin': 3
    }
    
    const userRoleLevel = roleHierarchy[userRole.value] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0
    
    return userRoleLevel >= requiredRoleLevel
  }

  // 初始化认证状态
  const initAuth = async () => {
    if (token.value) {
      await checkAuth()
    }
  }

  return {
    // 状态
    token,
    user,
    loading,
    error,
    
    // 计算属性
    isAuthenticated,
    userRole,
    isAdmin,
    isTeacher,
    isOperator,
    userName,
    
    // 方法
    login,
    logout,
    fetchProfile,
    verifyToken,
    checkAuth,
    hasPermission,
    initAuth
  }
})
