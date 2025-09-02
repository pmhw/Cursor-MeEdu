import { createRouter, createWebHistory } from 'vue-router'
import Login from '../components/Login.vue'
import Layout from '../components/Layout.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Layout,
    meta: { requiresAuth: true }
  },
  {
    path: '/students',
    name: 'Students',
    component: Layout,
    meta: { requiresAuth: true }
  },
  {
    path: '/deductions',
    name: 'Deductions',
    component: Layout,
    meta: { requiresAuth: true }
  },
  {
    path: '/user-management',
    name: 'UserManagement',
    component: Layout,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  let user = null
  
  try {
    const userData = localStorage.getItem('user')
    if (userData) {
      user = JSON.parse(userData)
    }
  } catch (error) {
    console.error('解析用户数据失败:', error)
    localStorage.removeItem('user') // 清除无效数据
  }
  
  // 如果路由需要认证
  if (to.meta.requiresAuth) {
    if (!token || !user) {
      // 未登录，跳转到登录页
      next('/login')
      return
    }
    
    // 如果路由需要管理员权限
    if (to.meta.requiresAdmin && user.role !== 'admin') {
      // 权限不足，跳转到仪表盘
      next('/dashboard')
      return
    }
  }
  
  // 如果已登录且访问登录页，跳转到仪表盘
  if (to.path === '/login' && token && user) {
    next('/dashboard')
    return
  }
  
  next()
})

export default router
