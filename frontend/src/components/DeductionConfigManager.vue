<template>
  <div class="deduction-config-manager">
    <el-card class="header-card" shadow="hover">
      <div class="header-content">
        <h3>扣除项管理</h3>
        <el-button type="primary" @click="addNewDeduction">
          <el-icon><Plus /></el-icon>
          添加扣除项
        </el-button>
      </div>
    </el-card>

    <!-- 扣除项列表 -->
    <el-card class="list-card" shadow="hover">
      <el-table :data="deductionConfigs" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="frequency" label="频率" width="100">
          <template #default="{ row }">
            <el-tag :type="getFrequencyTagType(row.frequency)">
              {{ getFrequencyLabel(row.frequency) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="值" width="120">
          <template #default="{ row }">
            <span v-if="row.type === 'percentage'">{{ row.value }}%</span>
            <span v-else-if="row.type === 'fixed'">¥{{ row.value }}</span>
            <span v-else-if="row.type === 'per_hour'">¥{{ row.value }}/课时</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="is_active" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="editDeduction(row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="row.is_active ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.is_active ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingDeduction ? '编辑扣除项' : '添加扣除项'"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form :model="deductionForm" :rules="rules" ref="deductionFormRef" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="deductionForm.name" placeholder="请输入扣除项名称" />
        </el-form-item>
        
        <el-form-item label="类型" prop="type">
          <el-select v-model="deductionForm.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="百分比" value="percentage" />
            <el-option label="固定金额" value="fixed" />
            <el-option label="每课时费用" value="per_hour" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="频率" prop="frequency">
          <el-select v-model="deductionForm.frequency" placeholder="请选择频率" style="width: 100%">
            <el-option label="单次" value="once" />
            <el-option label="多次" value="multiple" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="值" prop="value">
          <el-input-number 
            v-model="deductionForm.value" 
            :min="0" 
            :precision="2"
            :step="0.01"
            style="width: 100%"
            :placeholder="getValuePlaceholder()"
          />
        </el-form-item>
        
        <el-form-item label="说明" prop="description">
          <el-input 
            v-model="deductionForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入说明信息"
          />
        </el-form-item>
        
        <el-form-item label="状态" prop="is_active">
          <el-switch v-model="deductionForm.is_active" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDeduction" :loading="saving">
          {{ editingDeduction ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { deductionAPI } from '../api'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const showAddDialog = ref(false)
const editingDeduction = ref(null)
const deductionConfigs = ref([])
const deductionFormRef = ref()

// 表单数据
const deductionForm = reactive({
  name: '',
  type: '',
  frequency: 'once',
  value: 0,
  description: '',
  is_active: true
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入扣除项名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择类型', trigger: 'change' }
  ],
  frequency: [
    { required: true, message: '请选择频率', trigger: 'change' }
  ],
  value: [
    { required: true, message: '请输入值', trigger: 'blur' },
    { type: 'number', min: 0, message: '值必须大于等于0', trigger: 'blur' }
  ]
}

// 获取扣除项列表
const fetchDeductionConfigs = async () => {
  loading.value = true
  try {
    console.log('开始获取扣除项列表...')
    const response = await deductionAPI.getDeductionConfigs()
    console.log('扣除项列表响应:', response)
    if (response.success) {
      deductionConfigs.value = response.data
      console.log('扣除项列表更新成功，数量:', response.data.length)
    } else {
      console.error('获取扣除项列表失败:', response.message)
      ElMessage.error(response.message || '获取扣除项列表失败')
    }
  } catch (error) {
    console.error('获取扣除项列表失败:', error)
    console.error('错误详情:', error.response?.data || error.message)
    ElMessage.error('获取扣除项列表失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
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

// 获取频率标签类型
const getFrequencyTagType = (frequency) => {
  switch (frequency) {
    case 'once': return 'info'
    case 'multiple': return 'warning'
    default: return ''
  }
}

// 获取频率标签文本
const getFrequencyLabel = (frequency) => {
  switch (frequency) {
    case 'once': return '单次'
    case 'multiple': return '多次'
    default: return frequency
  }
}

// 获取值输入框占位符
const getValuePlaceholder = () => {
  switch (deductionForm.type) {
    case 'percentage': return '请输入百分比，如：10'
    case 'fixed': return '请输入固定金额，如：100'
    case 'per_hour': return '请输入每课时费用，如：50'
    default: return '请输入值'
  }
}

// 添加新扣除项
const addNewDeduction = () => {
  resetForm()
  showAddDialog.value = true
}

// 编辑扣除项
const editDeduction = (deduction) => {
  editingDeduction.value = deduction
  Object.assign(deductionForm, deduction)
  // 确保频率字段有默认值
  if (!deductionForm.frequency) {
    deductionForm.frequency = 'once'
  }
  showAddDialog.value = true
}

// 切换状态
const toggleStatus = async (deduction) => {
  try {
    const newStatus = !deduction.is_active
    console.log('切换扣除项状态:', deduction.id, '新状态:', newStatus)
    
    const response = await deductionAPI.updateDeductionConfig(deduction.id, {
      ...deduction,
      is_active: newStatus
    })
    
    console.log('切换状态响应:', response)
    
    if (response.success) {
      deduction.is_active = newStatus
      ElMessage.success(`扣除项${newStatus ? '启用' : '禁用'}成功`)
    } else {
      console.error('切换状态失败:', response.message)
      ElMessage.error(response.message || '切换状态失败')
    }
  } catch (error) {
    console.error('切换状态失败:', error)
    console.error('错误详情:', error.response?.data || error.message)
    ElMessage.error('切换状态失败: ' + (error.response?.data?.message || error.message))
  }
}

// 保存扣除项
const saveDeduction = async () => {
  try {
    console.log('=== 开始保存扣除项 ===')
    console.log('表单验证状态:', deductionFormRef.value)
    
    await deductionFormRef.value.validate()
    console.log('表单验证通过')
    
    saving.value = true
    console.log('当前表单数据:', JSON.stringify(deductionForm, null, 2))
    
    if (editingDeduction.value) {
      // 更新
      console.log('=== 更新扣除项 ===')
      console.log('编辑的扣除项ID:', editingDeduction.value.id)
      console.log('编辑的扣除项原始数据:', JSON.stringify(editingDeduction.value, null, 2))
      console.log('要更新的表单数据:', JSON.stringify(deductionForm, null, 2))
      
      const response = await deductionAPI.updateDeductionConfig(
        editingDeduction.value.id, 
        deductionForm
      )
      
      console.log('=== 更新响应 ===')
      console.log('完整响应对象:', response)
      console.log('响应类型:', typeof response)
      console.log('响应success字段:', response?.success)
      console.log('响应message字段:', response?.message)
      console.log('响应data字段:', response?.data)
      
      if (response && response.success) {
        console.log('更新成功，刷新列表...')
        ElMessage.success('扣除项更新成功')
        await fetchDeductionConfigs()
        showAddDialog.value = false
        resetForm()
      } else {
        console.error('=== 更新失败 ===')
        console.error('响应success为false:', response?.success)
        console.error('错误消息:', response?.message)
        console.error('错误数据:', response?.data)
        ElMessage.error(response?.message || '扣除项更新失败')
      }
    } else {
      // 添加
      console.log('=== 添加扣除项 ===')
      console.log('要添加的表单数据:', JSON.stringify(deductionForm, null, 2))
      
      const response = await deductionAPI.addDeductionConfig(deductionForm)
      
      console.log('=== 添加响应 ===')
      console.log('完整响应对象:', response)
      console.log('响应类型:', typeof response)
      console.log('响应success字段:', response?.success)
      console.log('响应message字段:', response?.message)
      console.log('响应data字段:', response?.data)
      
      if (response && response.success) {
        console.log('添加成功，刷新列表...')
        ElMessage.success('扣除项添加成功')
        await fetchDeductionConfigs()
        showAddDialog.value = false
        resetForm()
      } else {
        console.error('=== 添加失败 ===')
        console.error('响应success为false:', response?.success)
        console.error('错误消息:', response?.message)
        console.error('错误数据:', response?.data)
        ElMessage.error(response?.message || '扣除项添加失败')
      }
    }
  } catch (error) {
    console.error('=== 保存扣除项异常 ===')
    console.error('错误对象:', error)
    console.error('错误类型:', typeof error)
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)
    
    if (error.response) {
      console.error('=== HTTP响应错误 ===')
      console.error('响应状态:', error.response.status)
      console.error('响应状态文本:', error.response.statusText)
      console.error('响应头:', error.response.headers)
      console.error('响应数据:', error.response.data)
    } else if (error.request) {
      console.error('=== 网络请求错误 ===')
      console.error('请求对象:', error.request)
    } else {
      console.error('=== 其他错误 ===')
      console.error('错误配置:', error.config)
    }
    
    const errorMessage = error.response?.data?.message || error.message || '未知错误'
    console.error('最终错误消息:', errorMessage)
    ElMessage.error('保存扣除项失败: ' + errorMessage)
  } finally {
    console.log('=== 保存操作完成 ===')
    saving.value = false
  }
}

// 重置表单
const resetForm = () => {
  editingDeduction.value = null
  Object.assign(deductionForm, {
    name: '',
    type: '',
    frequency: 'once',
    value: 0,
    description: '',
    is_active: true
  })
  deductionFormRef.value?.resetFields()
}

// 监听对话框关闭
const handleDialogClose = () => {
  resetForm()
}

// 组件挂载时获取数据
onMounted(() => {
  fetchDeductionConfigs()
})

// 暴露刷新方法给父组件
defineExpose({
  refresh: fetchDeductionConfigs
})
</script>

<style scoped>
.deduction-config-manager {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h3 {
  margin: 0;
  color: #303133;
}

.list-card {
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
}
</style>
