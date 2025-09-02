<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon income-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">¥{{ formatNumber(totalIncome) }}</div>
              <div class="stats-label">总收入</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon student-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ totalStudents }}</div>
              <div class="stats-label">总学生数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon hours-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ totalHours }}</div>
              <div class="stats-label">总课时</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon class-icon">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">{{ totalClasses }}</div>
              <div class="stats-label">总上课次数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第二行统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon profit-icon">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">¥{{ formatNumber(totalProfit) }}</div>
              <div class="stats-label">总利润</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon deduction-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">¥{{ formatNumber(totalManualDeductions) }}</div>
              <div class="stats-label">手动扣除项</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon once-deduction-icon">
              <el-icon><Star /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">¥{{ formatNumber(totalOnceDeductions) }}</div>
              <div class="stats-label">单次扣除项</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon multiple-deduction-icon">
              <el-icon><Refresh /></el-icon>
            </div>
            <div class="stats-info">
              <div class="stats-value">¥{{ formatNumber(totalMultipleDeductions) }}</div>
              <div class="stats-label">多次扣除项</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

         <!-- 时间筛选器 -->
     <el-card class="filter-card" shadow="hover">
       <div class="filter-header">
         <h3>业绩统计</h3>
                 <div class="filter-controls">
          <el-radio-group v-model="timeFilter" @change="handleTimeFilterChange">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="month">当月</el-radio-button>
            <el-radio-button label="week">本周</el-radio-button>
            <el-radio-button label="today">今日</el-radio-button>
          </el-radio-group>
        </div>
       </div>
     </el-card>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="chart-header">
              <span>收入趋势</span>
              <el-tag :type="getIncomeTrendType()" size="small">
                {{ getIncomeTrendText() }}
              </el-tag>
            </div>
          </template>
          <div class="chart-container">
            <div ref="incomeChartRef" class="chart"></div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="chart-header">
              <span>课时消耗趋势</span>
              <el-tag :type="getHoursTrendType()" size="small">
                {{ getHoursTrendText() }}
              </el-tag>
            </div>
          </template>
          <div class="chart-container">
            <div ref="hoursChartRef" class="chart"></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细统计表格 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="table-header">
          <span>详细统计</span>
          <el-button type="primary" size="small" @click="refreshStats">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </template>
      
      <el-table :data="statsData" stripe v-loading="loading">
        <el-table-column prop="period" label="时间段" width="120" />
        <el-table-column prop="income" label="收入金额" width="120">
          <template #default="{ row }">
            <el-tag type="success">¥{{ formatNumber(row.income) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="students" label="新增学生" width="120" />
        <el-table-column prop="hours" label="充值课时" width="120" />
        <el-table-column prop="classes" label="上课次数" width="120" />
        <el-table-column prop="hoursUsed" label="消耗课时" width="120" />
        <el-table-column prop="avgIncome" label="平均收入" width="120">
          <template #default="{ row }">
            <el-tag type="info">¥{{ formatNumber(row.avgIncome) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Money, 
  User, 
  Clock, 
  Calendar, 
  Refresh,
  Document,
  TrendCharts,
  Star
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { statsAPI, profitAPI } from '../api'

// 响应式数据
const loading = ref(false)
const timeFilter = ref('all')
const incomeChartRef = ref()
const hoursChartRef = ref()

// 统计数据
const totalIncome = ref(0)
const totalStudents = ref(0)
const totalHours = ref(0)
const totalClasses = ref(0)
const totalProfit = ref(0)
const totalManualDeductions = ref(0)
const totalOnceDeductions = ref(0)
const totalMultipleDeductions = ref(0)

// 图表实例
let incomeChart = null
let hoursChart = null

// 统计数据
const statsData = reactive([
  {
    period: '全部',
    income: 0,
    students: 0,
    hours: 0,
    classes: 0,
    hoursUsed: 0,
    avgIncome: 0
  },
  {
    period: '当月',
    income: 0,
    students: 0,
    hours: 0,
    classes: 0,
    hoursUsed: 0,
    avgIncome: 0
  },
  {
    period: '本周',
    income: 0,
    students: 0,
    hours: 0,
    classes: 0,
    hoursUsed: 0,
    avgIncome: 0
  },
  {
    period: '今日',
    income: 0,
    students: 0,
    hours: 0,
    classes: 0,
    hoursUsed: 0,
    avgIncome: 0
  }
])

// 初始化图表
const initCharts = async () => {
  await nextTick()
  
  // 收入趋势图
  if (incomeChartRef.value) {
    incomeChart = echarts.init(incomeChartRef.value)
    updateIncomeChart()
  }
  
  // 课时消耗趋势图
  if (hoursChartRef.value) {
    hoursChart = echarts.init(hoursChartRef.value)
    updateHoursChart()
  }
}

// 更新收入趋势图
const updateIncomeChart = async () => {
  try {
    const response = await statsAPI.getIncomeTrend(12)
    if (response.success && response.data) {
      const months = response.data.map(item => item.month)
      const amounts = response.data.map(item => item.total_amount)
      
      const option = {
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: ¥{c}'
        },
        xAxis: {
          type: 'category',
          data: months
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '¥{value}'
          }
        },
        series: [{
          data: amounts,
          type: 'line',
          smooth: true,
          areaStyle: {
            opacity: 0.3
          },
          itemStyle: {
            color: '#67C23A'
          }
        }]
      }
      
      if (incomeChart) {
        incomeChart.setOption(option)
      }
    }
  } catch (error) {
    console.error('获取收入趋势数据失败:', error)
  }
}

// 更新课时消耗趋势图
const updateHoursChart = async () => {
  try {
    const response = await statsAPI.getHoursTrend(12)
    if (response.success && response.data) {
      const months = response.data.map(item => item.month)
      const hours = response.data.map(item => item.total_hours)
      
      const option = {
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c} 课时'
        },
        xAxis: {
          type: 'category',
          data: months
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '{value} 课时'
          }
        },
        series: [{
          data: hours,
          type: 'bar',
          itemStyle: {
            color: '#E6A23C'
          }
        }]
      }
      
      if (hoursChart) {
        hoursChart.setOption(option)
      }
    }
  } catch (error) {
    console.error('获取课时趋势数据失败:', error)
  }
}

// 时间筛选变化
const handleTimeFilterChange = (value) => {
  // 根据筛选条件更新统计数据
  refreshStats()
}

// 刷新统计数据
const refreshStats = async () => {
  loading.value = true
  try {
    // 获取所有时间段的统计数据
    const periods = ['all', 'month', 'week', 'today']
    const promises = periods.map(period => statsAPI.getStats(period))
    
    const responses = await Promise.all(promises)
    
             // 更新统计数据
         responses.forEach((response, index) => {
           if (response.success) {
             const data = response.data
             const period = periods[index]
             const periodName = getPeriodName(period)
             
             const statsItem = statsData.find(item => item.period === periodName)
             if (statsItem) {
               statsItem.income = data.total_income || 0
               statsItem.students = data.new_students || 0   // 使用新增学生数
               statsItem.hours = data.total_hours || 0        // 使用总课时数
               statsItem.classes = data.total_classes || 0
               statsItem.hoursUsed = data.total_hours_used || 0
               statsItem.avgIncome = data.total_income && data.income_count ? 
                 Math.round(data.total_income / data.income_count) : 0
             }
           }
         })
    
         // 更新当前显示的统计数据
     const currentData = statsData.find(item => item.period === getCurrentPeriod())
     if (currentData) {
       totalIncome.value = currentData.income
       totalStudents.value = currentData.students
       totalHours.value = currentData.hours
       totalClasses.value = currentData.classes
     }
     
     // 获取利润数据
     await updateProfitData()
    
    // 刷新图表
    updateIncomeChart()
    updateHoursChart()
    
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新统计数据失败:', error)
    ElMessage.error('数据刷新失败')
  } finally {
    loading.value = false
  }
}

// 获取当前时间段
const getCurrentPeriod = () => {
  switch (timeFilter.value) {
    case 'month': return '当月'
    case 'week': return '本周'
    case 'today': return '今日'
    default: return '全部'
  }
}

// 获取时间段名称
const getPeriodName = (period) => {
  switch (period) {
    case 'month': return '当月'
    case 'week': return '本周'
    case 'today': return '今日'
    default: return '全部'
  }
}

// 更新利润数据
const updateProfitData = async () => {
  try {
    const response = await profitAPI.getOverallProfit(timeFilter.value)
    if (response.success && response.data) {
      totalProfit.value = response.data.profit || 0
      totalManualDeductions.value = response.data.total_manual_deductions || 0
      totalOnceDeductions.value = response.data.total_once_deductions || 0
      totalMultipleDeductions.value = response.data.total_multiple_deductions || 0
    }
  } catch (error) {
    console.error('获取利润数据失败:', error)
    totalProfit.value = 0
    totalManualDeductions.value = 0
    totalOnceDeductions.value = 0
    totalMultipleDeductions.value = 0
  }
}

// 获取收入趋势类型
const getIncomeTrendType = () => {
  return 'success' // 可以根据实际数据计算
}

// 获取收入趋势文本
const getIncomeTrendText = () => {
  return '+12.5%' // 可以根据实际数据计算
}

// 获取课时趋势类型
const getHoursTrendType = () => {
  return 'warning' // 可以根据实际数据计算
}

// 获取课时趋势文本
const getHoursTrendText = () => {
  return '+8.3%' // 可以根据实际数据计算
}

// 格式化数字
const formatNumber = (num) => {
  return num.toLocaleString()
}

// 定义emits
const emit = defineEmits([])

// 暴露refresh方法给父组件
defineExpose({
  refresh: refreshStats
})

// 组件挂载时初始化
onMounted(() => {
  // 初始化图表
  initCharts()
  
  // 获取初始统计数据
  refreshStats()
  
  // 监听窗口大小变化，重新调整图表
  window.addEventListener('resize', () => {
    if (incomeChart) incomeChart.resize()
    if (hoursChart) hoursChart.resize()
  })
})

// 组件卸载时清理
onUnmounted(() => {
  if (incomeChart) incomeChart.dispose()
  if (hoursChart) hoursChart.dispose()
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stats-card {
  height: 120px;
}

.stats-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 24px;
  color: white;
}

.income-icon {
  background: linear-gradient(135deg, #67C23A, #85CE61);
}

.student-icon {
  background: linear-gradient(135deg, #409EFF, #66B1FF);
}

.hours-icon {
  background: linear-gradient(135deg, #E6A23C, #EEBE77);
}

.class-icon {
  background: linear-gradient(135deg, #F56C6C, #F78989);
}

.profit-icon {
  background: linear-gradient(135deg, #9C27B0, #BA68C8);
}

.deduction-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.once-deduction-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.multiple-deduction-icon {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-header h3 {
  margin: 0;
  color: #303133;
}

.charts-row {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart {
  width: 100%;
  height: 100%;
}

.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-row .el-col {
    margin-bottom: 20px;
  }
  
  .charts-row .el-col {
    margin-bottom: 20px;
  }
}
</style>
