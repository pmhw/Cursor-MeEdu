import axios from 'axios'
// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加认证头
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    console.log('=== API请求拦截器 ===')
    console.log('请求方法:', config.method?.toUpperCase())
    console.log('请求URL:', config.url)
    console.log('请求头:', config.headers)
    console.log('请求数据:', config.data)
    console.log('请求参数:', config.params)
    return config
  },
  (error) => {
    console.error('=== API请求拦截器错误 ===')
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('=== API响应拦截器 ===')
    console.log('响应状态:', response.status)
    console.log('响应状态文本:', response.statusText)
    console.log('响应头:', response.headers)
    console.log('响应数据:', response.data)
    console.log('响应数据类型:', typeof response.data)
    return response.data
  },
  (error) => {
    console.error('=== API响应拦截器错误 ===')
    console.error('错误对象:', error)
    console.error('错误类型:', typeof error)
    console.error('错误消息:', error.message)
    
    if (error.response) {
      console.error('HTTP响应错误:')
      console.error('  状态码:', error.response.status)
      console.error('  状态文本:', error.response.statusText)
      console.error('  响应数据:', error.response.data)
    } else if (error.request) {
      console.error('网络请求错误:')
      console.error('  请求对象:', error.request)
    } else {
      console.error('其他错误:')
      console.error('  错误配置:', error.config)
    }
    
    return Promise.reject(error)
  }
)

// API接口
export const studentAPI = {
  // 获取所有学生
  getStudents() {
    return api.get('/students')
  },

  // 获取学生详情
  getStudentDetail(id) {
    return api.get(`/students/${id}`)
  },

  // 添加学生
  addStudent(data) {
    return api.post('/students', data)
  },

  // 学生充值
  rechargeStudent(id, data) {
    return api.post(`/students/${id}/recharge`, data)
  },

  // 学生上课扣除课时
  consumeStudent(id, data) {
    return api.post(`/students/${id}/consume`, data)
  },

  // 删除学生
  deleteStudent(id) {
    return api.post(`/students/${id}/delete`)
  },

  // 删除充值记录
  deleteIncomeRecord(id) {
    return api.delete(`/income/${id}`)
  }
}

// 统计相关API
export const statsAPI = {
  // 获取统计数据
  getStats(period = 'all') {
    return api.get(`/stats?period=${period}`)
  },

  // 获取收入趋势
  getIncomeTrend(months = 12) {
    return api.get(`/stats/income-trend?months=${months}`)
  },

  // 获取课时趋势
  getHoursTrend(months = 12) {
    return api.get(`/stats/hours-trend?months=${months}`)
  }
}

// 扣除项管理API
export const deductionAPI = {
  // 获取扣除项列表
  getDeductionConfigs() {
    return api.get('/deduction-configs')
  },

  // 添加扣除项
  addDeductionConfig(data) {
    return api.post('/deduction-configs', data)
  },

  // 更新扣除项
  updateDeductionConfig(id, data) {
    return api.put(`/deduction-configs/${id}`, data)
  }
}

// 利润计算API
export const profitAPI = {
  // 获取学生扣除项配置
  getStudentDeductions(studentId) {
    return api.get(`/students/${studentId}/deductions`)
  },

  // 更新学生扣除项配置
  updateStudentDeductions(studentId, deductionIds) {
    return api.post(`/students/${studentId}/deductions`, { deduction_ids: deductionIds })
  },

  // 计算学生利润
  getStudentProfit(studentId) {
    return api.get(`/students/${studentId}/profit`)
  },

  // 计算总体利润
  getOverallProfit(period = 'all') {
    return api.get(`/profit?period=${period}`)
  }
}

// 扣除项明细API
export const deductionDetailAPI = {
  // 添加扣除项明细
  addDeductionDetail(studentId, data) {
    return api.post(`/students/${studentId}/deduction-details`, data)
  },

  // 获取学生扣除项明细
  getStudentDeductionDetails(studentId, params) {
    return api.get(`/students/${studentId}/deduction-details`, { params })
  },

  // 获取所有扣除项明细
  getAllDeductionDetails(params) {
    return api.get('/deduction-details', { params })
  },

  // 更新扣除项明细
  updateDeductionDetail(id, data) {
    return api.put(`/deduction-details/${id}`, data)
  },

  // 删除扣除项明细
  deleteDeductionDetail(id) {
    return api.delete(`/deduction-details/${id}`)
  }
}

export default api
