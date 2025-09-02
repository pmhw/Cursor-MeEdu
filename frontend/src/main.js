import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import axios from 'axios'
import router from './router'
import App from './App.vue'

// 创建Pinia实例
const pinia = createPinia()

// 配置axios默认值
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
axios.defaults.timeout = 10000
axios.defaults.withCredentials = true

// 请求拦截器
axios.interceptors.request.use(
  (config) => {
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
axios.interceptors.response.use(
  (response) => {
    return response
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

// 将axios挂载到全局，方便组件使用
window.axios = axios

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  locale: zhCn,
})

app.mount('#app')
