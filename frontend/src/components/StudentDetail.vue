<template>
  <el-dialog 
    v-model="dialogVisible"
    :title="`学生详情 - ${student.name}`"
    width="80%"
    :before-close="handleClose"
    class="student-detail-dialog"
  >
    <div class="student-detail" v-if="student.id">
      <!-- 统计信息卡片 - 第一行 -->
      <el-card class="stats-overview-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="header-title">
              <el-icon class="header-icon"><DataBoard /></el-icon>
              学生统计概览
            </span>
            <el-tag type="primary" size="large">
              <el-icon><User /></el-icon>
              {{ student.name }}
            </el-tag>
          </div>
        </template>
        
        <!-- 主要统计指标 -->
        <div class="main-stats">
          <el-row :gutter="24">
            <el-col :span="6">
              <div class="stat-item primary">
                <div class="stat-icon">
                  <el-icon><Money /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">¥{{ totalIncome.toFixed(2) }}</div>
                  <div class="stat-label">总充值金额</div>
                </div>
                <div class="stat-trend">
                  <el-tag type="success" size="small">
                    <el-icon><TrendCharts /></el-icon>
                    收入
                  </el-tag>
                </div>
              </div>
            </el-col>
            
            <el-col :span="6">
              <div class="stat-item warning">
                <div class="stat-icon">
                  <el-icon><Clock /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ totalHoursUsed }}</div>
                  <div class="stat-label">总消耗课时</div>
                </div>
                <div class="stat-trend">
                  <el-tag type="warning" size="small">
                    <el-icon><TrendCharts /></el-icon>
                    消耗
                  </el-tag>
                </div>
              </div>
            </el-col>
            
            <el-col :span="6">
              <div class="stat-item success">
                <div class="stat-icon">
                  <el-icon><Plus /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ incomeRecords.length }}</div>
                  <div class="stat-label">充值次数</div>
                </div>
                <div class="stat-trend">
                  <el-tag type="success" size="small">
                    <el-icon><TrendCharts /></el-icon>
                    次数
                  </el-tag>
                </div>
              </div>
            </el-col>
            
            <el-col :span="6">
              <div class="stat-item info">
                <div class="stat-icon">
                  <el-icon><Calendar /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ classRecords.length }}</div>
                  <div class="stat-label">上课次数</div>
                </div>
                <div class="stat-trend">
                  <el-tag type="info" size="small">
                    <el-icon><TrendCharts /></el-icon>
                    次数
                  </el-tag>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
        
        <!-- 次要统计指标 -->
        <div class="secondary-stats">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="mini-stat">
                <el-icon class="mini-icon"><Wallet /></el-icon>
                <span class="mini-label">剩余课时</span>
                <el-tag 
                  :type="student.remaining_hours > 0 ? 'success' : 'danger'" 
                  size="large"
                  class="mini-value"
                >
                  {{ student.remaining_hours }} 课时
                </el-tag>
              </div>
            </el-col>
            
            <el-col :span="8">
              <div class="mini-stat">
                <el-icon class="mini-icon"><Timer /></el-icon>
                <span class="mini-label">平均每次充值</span>
                <div class="mini-value">
                  ¥{{ incomeRecords.length > 0 ? (totalIncome / incomeRecords.length).toFixed(2) : '0.00' }}
                </div>
              </div>
            </el-col>
            
            <el-col :span="8">
              <div class="mini-stat">
                <el-icon class="mini-icon"><Histogram /></el-icon>
                <span class="mini-label">平均每次上课</span>
                <div class="mini-value">
                  {{ classRecords.length > 0 ? (totalHoursUsed / classRecords.length).toFixed(1) : '0.0' }} 课时
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 学生基本信息 -->
      <el-card class="info-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="header-title">
              <el-icon class="header-icon"><User /></el-icon>
              基本信息
            </span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="学生ID">{{ student.id }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ student.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ student.phone }}</el-descriptions-item>
          <el-descriptions-item label="剩余课时">
            <el-tag :type="student.remaining_hours > 0 ? 'success' : 'danger'" size="large">
              {{ student.remaining_hours }} 课时
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 充值记录 -->
      <el-card class="record-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="header-title">
              <el-icon class="header-icon"><Money /></el-icon>
              充值记录
            </span>
            <el-tag type="info">{{ incomeRecords.length }} 条记录</el-tag>
          </div>
        </template>
        <div v-if="incomeRecords.length > 0">
          <el-table :data="incomeRecords" stripe size="small">
            <el-table-column prop="id" label="记录ID" width="80" />
            <el-table-column prop="amount" label="充值金额" width="120">
              <template #default="{ row }">
                <el-tag type="success">¥{{ row.amount }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="date" label="充值日期" width="120" />
            <el-table-column prop="created_at" label="创建时间" width="180" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="handleDeleteIncome(row)"
                  :disabled="!canDeleteIncome(row)"
                >
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="暂无充值记录" />
      </el-card>

      <!-- 上课记录 -->
      <el-card class="record-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="header-title">
              <el-icon class="header-icon"><Clock /></el-icon>
              上课记录
            </span>
            <el-tag type="info">{{ classRecords.length }} 条记录</el-tag>
          </div>
        </template>
        <div v-if="classRecords.length > 0">
          <el-table :data="classRecords" stripe size="small">
            <el-table-column prop="id" label="记录ID" width="80" />
            <el-table-column prop="hours_used" label="消耗课时" width="120">
              <template #default="{ row }">
                <el-tag type="warning">{{ row.hours_used }} 课时</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="date" label="上课日期" width="120" />
            <el-table-column prop="created_at" label="创建时间" width="180" />
          </el-table>
        </div>
        <el-empty v-else description="暂无上课记录" />
      </el-card>

      <!-- 利润信息 -->
      <el-card class="profit-card" shadow="hover" v-if="profitData">
        <template #header>
          <div class="card-header">
            <span>利润分析</span>
            <el-button type="primary" size="small" @click="refreshProfit">
              <el-icon><Refresh /></el-icon>
              刷新利润
            </el-button>
          </div>
        </template>
        
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="总收入" :value="profitData.total_income" prefix="¥" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="总扣除" :value="profitData.total_deductions" prefix="¥" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="净利润" :value="profitData.profit" prefix="¥" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="利润率" :value="profitData.profit_rate" suffix="%" />
          </el-col>
        </el-row>
        
        <!-- 扣除项分类统计 -->
        <div class="deduction-summary" v-if="profitData.total_once_deductions !== undefined || profitData.total_multiple_deductions !== undefined">
          <h4>扣除项分类统计</h4>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-statistic title="单次扣除项" :value="profitData.total_once_deductions || 0" prefix="¥" />
            </el-col>
            <el-col :span="12">
              <el-statistic title="多次扣除项" :value="profitData.total_multiple_deductions || 0" prefix="¥" />
            </el-col>
          </el-row>
        </div>
        
        <!-- 扣除项明细 -->
        <div class="deduction-details" v-if="profitData.deduction_details && profitData.deduction_details.length > 0">
          <h4>扣除项明细</h4>
          <el-table :data="profitData.deduction_details" size="small" stripe>
            <el-table-column prop="name" label="扣除项" width="120" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag :type="getTypeTagType(row.type)" size="small">
                  {{ getTypeLabel(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="frequency" label="频率" width="80">
              <template #default="{ row }">
                <el-tag :type="row.frequency === 'once' ? 'info' : 'warning'" size="small">
                  {{ row.frequency === 'once' ? '单次' : '多次' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="calculation" label="计算方式" />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">
                <el-tag type="danger" size="small">¥{{ row.amount.toFixed(2) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="applied_info" label="应用记录" width="150">
              <template #default="{ row }">
                <span v-if="row.applied_info" class="applied-info">{{ row.applied_info }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <!-- 扣除项配置 -->
      <el-card class="deduction-config-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>扣除项配置</span>
            <el-button type="primary" size="small" @click="saveDeductionConfig" :loading="savingDeductions">
              保存配置
            </el-button>
          </div>
        </template>
        
        <el-checkbox-group v-model="selectedDeductions">
          <el-row :gutter="20">
            <el-col :span="8" v-for="deduction in availableDeductions" :key="deduction.id">
              <el-checkbox :label="deduction.id">
                <div class="deduction-item">
                  <div class="deduction-name">{{ deduction.name }}</div>
                  <div class="deduction-info">
                    <div class="deduction-tags">
                      <el-tag :type="getTypeTagType(deduction.type)" size="small">
                        {{ getTypeLabel(deduction.type) }}
                      </el-tag>
                      <el-tag :type="deduction.frequency === 'once' ? 'info' : 'warning'" size="small">
                        {{ deduction.frequency === 'once' ? '单次' : '多次' }}
                      </el-tag>
                    </div>
                    <span class="deduction-value">
                      <span v-if="deduction.type === 'percentage'">{{ deduction.value }}%</span>
                      <span v-else-if="deduction.type === 'fixed'">¥{{ deduction.value }}</span>
                      <span v-else-if="deduction.type === 'per_hour'">¥{{ deduction.value }}/课时</span>
                    </span>
                  </div>
                  <div class="deduction-description" v-if="deduction.description">
                    {{ deduction.description }}
                  </div>
                </div>
              </el-checkbox>
            </el-col>
          </el-row>
        </el-checkbox-group>
      </el-card>

      <!-- 扣除项明细管理 -->
      <el-card class="deduction-detail-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>扣除项明细管理</span>
            <el-tag type="info" v-if="profitData && profitData.total_manual_deductions !== undefined">
              手动扣除项：¥{{ profitData.total_manual_deductions.toFixed(2) }}
            </el-tag>
          </div>
        </template>
        
        <DeductionDetailManager 
          :student-id="student.id"
          :class-records="classRecords"
          @refresh="refreshDetail"
        />
      </el-card>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Refresh, 
  Delete, 
  User, 
  Money, 
  Clock, 
  Plus,
  DataBoard,
  TrendCharts,
  Calendar,
  Wallet,
  Timer,
  Histogram
} from '@element-plus/icons-vue'
import { studentAPI, profitAPI } from '../api'
import DeductionDetailManager from './DeductionDetailManager.vue'

// 定义props
const props = defineProps({
  student: {
    type: Object,
    default: () => ({})
  },
  visible: {
    type: Boolean,
    default: false
  }
})

// 定义emits
const emit = defineEmits(['close', 'refresh'])

// 响应式数据
const loading = ref(false)
const incomeRecords = ref([])
const classRecords = ref([])
const profitData = ref(null)
const availableDeductions = ref([])
const selectedDeductions = ref([])
const savingDeductions = ref(false)

// 计算属性
const totalIncome = computed(() => {
  return incomeRecords.value.reduce((sum, record) => sum + record.amount, 0)
})

const totalHoursUsed = computed(() => {
  return classRecords.value.reduce((sum, record) => sum + record.hours_used, 0)
})

// 计算属性用于双向绑定
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  }
})

// 获取学生详情
const fetchStudentDetail = async () => {
  if (!props.student.id) return
  
  loading.value = true
  try {
    const response = await studentAPI.getStudentDetail(props.student.id)
    if (response.success) {
      incomeRecords.value = response.data.income_records || []
      classRecords.value = response.data.class_records || []
    } else {
      ElMessage.error(response.message || '获取学生详情失败')
    }
  } catch (error) {
    ElMessage.error('获取学生详情失败')
  } finally {
    loading.value = false
  }
  
  // 获取利润和扣除项数据
  await Promise.all([
    fetchProfitData(),
    fetchDeductionConfigs()
  ])
}

// 获取利润数据
const fetchProfitData = async () => {
  if (!props.student.id) return
  
  try {
    const response = await profitAPI.getStudentProfit(props.student.id)
    if (response.success) {
      profitData.value = response.data
    }
  } catch (error) {
    console.error('获取利润数据失败:', error)
  }
}

// 获取扣除项配置
const fetchDeductionConfigs = async () => {
  if (!props.student.id) return
  
  try {
    const response = await profitAPI.getStudentDeductions(props.student.id)
    if (response.success) {
      availableDeductions.value = response.data
      // 设置已选中的扣除项
      selectedDeductions.value = response.data
        .filter(item => item.student_deduction_id)
        .map(item => item.id)
    }
  } catch (error) {
    console.error('获取扣除项配置失败:', error)
  }
}

// 刷新利润数据
const refreshProfit = async () => {
  await fetchProfitData()
}

// 保存扣除项配置
const saveDeductionConfig = async () => {
  if (!props.student.id) return
  
  savingDeductions.value = true
  try {
    const response = await profitAPI.updateStudentDeductions(
      props.student.id, 
      selectedDeductions.value
    )
    
    if (response.success) {
      ElMessage.success('扣除项配置保存成功')
      await fetchProfitData() // 重新计算利润
      emit('refresh') // 通知父组件刷新
    }
  } catch (error) {
    console.error('保存扣除项配置失败:', error)
    ElMessage.error('保存扣除项配置失败')
  } finally {
    savingDeductions.value = false
  }
}

// 获取类型标签类型
const getTypeTagType = (type) => {
  switch (type) {
    case 'percentage': return 'info'
    case 'fixed': return 'success'
    case 'per_hour': return 'warning'
    default: return ''
  }
}

// 获取类型标签文本
const getTypeLabel = (type) => {
  switch (type) {
    case 'percentage': return '百分比'
    case 'fixed': return '固定金额'
    case 'per_hour': return '每课时费用'
    default: return type
  }
}

// 刷新详情
const handleRefresh = () => {
  fetchStudentDetail()
  emit('refresh')
}

// 关闭弹窗
const handleClose = () => {
  emit('close')
}

// 检查是否可以删除充值记录
const canDeleteIncome = (record) => {
  // 检查时间限制（24小时内）
  const recordDate = new Date(record.date)
  const now = new Date()
  const hoursDiff = (now - recordDate) / (1000 * 60 * 60)
  
  if (hoursDiff > 24) {
    return false
  }
  
  // 检查是否有后续上课记录
  const hasLaterClasses = classRecords.value.some(classRecord => 
    new Date(classRecord.date) > recordDate
  )
  
  return !hasLaterClasses
}

// 处理删除充值记录
const handleDeleteIncome = async (record) => {
  try {
    // 计算该次充值对应的课时数（简化计算）
    const totalAmount = incomeRecords.value.reduce((sum, r) => sum + r.amount, 0)
    const totalHours = props.student.remaining_hours + totalHoursUsed.value
    const hoursPerAmount = totalAmount > 0 ? totalHours / totalAmount : 0
    const rechargeHours = record.amount * hoursPerAmount
    
    // 显示确认对话框
    await ElMessageBox.confirm(
      `确定要删除这笔充值记录吗？\n\n` +
      `充值金额：¥${record.amount}\n` +
      `充值课时：${rechargeHours.toFixed(2)} 小时\n` +
      `删除后剩余课时：${(props.student.remaining_hours - rechargeHours).toFixed(2)} 小时\n\n` +
      `⚠️ 注意：删除后无法恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    )
    
    // 调用删除API
    const response = await studentAPI.deleteIncomeRecord(record.id)
    
    if (response.success) {
      ElMessage.success('充值记录删除成功')
      
      // 更新学生信息
      if (response.data.updated_student) {
        emit('student-updated', response.data.updated_student)
      }
      
      // 刷新详情数据
      await fetchStudentDetail()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消删除
      return
    }
    
    console.error('删除充值记录失败:', error)
    ElMessage.error('删除充值记录失败')
  }
}

// 监听学生变化
watch(() => props.student.id, (newId) => {
  if (newId && props.visible) {
    fetchStudentDetail()
  } else {
    // 清空数据
    incomeRecords.value = []
    classRecords.value = []
  }
}, { immediate: true })

// 监听弹窗显示状态
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.student.id) {
    fetchStudentDetail()
  }
})

// 暴露刷新方法给父组件
defineExpose({
  refreshDetail: fetchStudentDetail
})
</script>

<style scoped>
.student-detail {
  padding: 0;
}

.info-card,
.record-card,
.stats-card,
.profit-card,
.deduction-config-card,
.stats-overview-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  font-size: 16px;
}

.header-icon {
  margin-right: 8px;
  font-size: 18px;
}

/* 统计概览卡片样式 */
.stats-overview-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.stats-overview-card :deep(.el-card__header) {
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.stats-overview-card :deep(.el-card__body) {
  padding: 24px;
}

/* 主要统计指标样式 */
.main-stats {
  margin-bottom: 30px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stat-item.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-item.warning {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-item.success {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-item.info {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.9;
}

.stat-content {
  margin-bottom: 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  font-weight: 500;
}

.stat-trend {
  position: absolute;
  top: 12px;
  right: 12px;
}

/* 次要统计指标样式 */
.secondary-stats {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.mini-stat:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.mini-icon {
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.9;
}

.mini-label {
  font-size: 12px;
  margin-bottom: 8px;
  opacity: 0.8;
  font-weight: 500;
}

.mini-value {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.el-descriptions {
  margin: 0;
}

.el-table {
  margin-top: 10px;
}

.el-statistic {
  text-align: center;
}

.deduction-details {
  margin-top: 20px;
}

.deduction-details h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.deduction-item {
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin: 5px 0;
}

.deduction-name {
  font-weight: bold;
  margin-bottom: 5px;
  color: #303133;
}

.deduction-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.deduction-value {
  color: #606266;
  font-size: 12px;
}

.deduction-description {
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 弹窗样式优化 */
:deep(.el-dialog) {
  border-radius: 8px;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  padding: 20px;
}

:deep(.el-dialog__body) {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #ebeef5;
  padding: 20px;
}
</style>
