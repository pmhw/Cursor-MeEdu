<template>
  <div class="deduction-detail-manager">
    <!-- 添加扣除项按钮 -->
    <div class="action-bar">
      <el-button 
        type="success" 
        icon="Plus" 
        @click="showAddDialog = true"
        :disabled="!studentId"
      >
        添加扣除项
      </el-button>
    </div>

    <!-- 扣除项明细表格 -->
    <el-table 
      :data="deductionDetails" 
      v-loading="loading"
      style="width: 100%; margin-top: 20px;"
    >
      <el-table-column prop="deduction_type" label="扣除类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getDeductionTypeTag(row.deduction_type)">
            {{ getDeductionTypeLabel(row.deduction_type) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="amount" label="扣除金额" width="120">
        <template #default="{ row }">
          <span class="amount">¥{{ row.amount.toFixed(2) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="description" label="扣除说明" min-width="200" />
      
      <el-table-column prop="date" label="扣除日期" width="120" />
      
      <el-table-column prop="operator" label="操作人" width="100" />
      
      <el-table-column prop="related_class_id" label="关联上课" width="120">
        <template #default="{ row }">
          <span v-if="row.related_class_id">
            {{ row.related_class_hours }}课时 ({{ row.related_class_date }})
          </span>
          <span v-else class="text-muted">无关联</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="created_at" label="创建时间" width="160">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button 
            size="small" 
            type="primary" 
            @click="editDeduction(row)"
          >
            编辑
          </el-button>
          <el-button 
            size="small" 
            type="danger" 
            @click="deleteDeduction(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/编辑扣除项弹窗 -->
    <el-dialog 
      v-model="showAddDialog" 
      :title="editingDeduction ? '编辑扣除项' : '添加扣除项'"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form 
        ref="deductionFormRef" 
        :model="deductionForm" 
        :rules="deductionRules" 
        label-width="100px"
      >
        <el-form-item label="扣除类型" prop="deduction_type">
          <el-select 
            v-model="deductionForm.deduction_type" 
            placeholder="请选择扣除类型"
            style="width: 100%"
          >
            <el-option 
              v-for="type in deductionTypes" 
              :key="type.value" 
              :label="type.label" 
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="扣除金额" prop="amount">
          <el-input-number 
            v-model="deductionForm.amount" 
            :min="0.01" 
            :precision="2" 
            :step="0.01"
            style="width: 100%"
            placeholder="请输入扣除金额"
          />
        </el-form-item>
        
        <el-form-item label="扣除说明" prop="description">
          <el-input 
            v-model="deductionForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入扣除说明"
          />
        </el-form-item>
        
        <el-form-item label="扣除日期" prop="date">
          <el-date-picker 
            v-model="deductionForm.date" 
            type="date" 
            placeholder="选择扣除日期"
            style="width: 100%"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        
        <el-form-item label="关联上课" prop="related_class_id">
          <el-select 
            v-model="deductionForm.related_class_id" 
            placeholder="选择关联上课记录（可选）"
            clearable
            style="width: 100%"
          >
            <el-option 
              v-for="classRecord in classRecords" 
              :key="classRecord.id" 
              :label="`${classRecord.date} - ${classRecord.hours_used}课时`" 
              :value="classRecord.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="操作人" prop="operator">
          <el-input 
            v-model="deductionForm.operator" 
            placeholder="请输入操作人姓名"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="saveDeduction"
            :loading="saving"
          >
            {{ editingDeduction ? '更新' : '添加' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 删除确认弹窗 -->
    <el-dialog 
      v-model="showDeleteDialog" 
      title="确认删除" 
      width="400px"
    >
      <p>确定要删除这条扣除项明细吗？</p>
      <p class="text-muted">
        类型：{{ getDeductionTypeLabel(deletingDeduction?.deduction_type) }}<br>
        金额：¥{{ deletingDeduction?.amount }}<br>
        说明：{{ deletingDeduction?.description }}
      </p>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button 
            type="danger" 
            @click="confirmDelete"
            :loading="deleting"
          >
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deductionDetailAPI } from '../api'

const props = defineProps({
  studentId: {
    type: [Number, String],
    required: true
  },
  classRecords: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['refresh'])

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const deductionDetails = ref([])
const editingDeduction = ref(null)
const deletingDeduction = ref(null)

// 扣除类型选项
const deductionTypes = [
  { value: 'teacher_fee', label: '老师课时费' },
  { value: 'material_fee', label: '材料费' },
  { value: 'equipment_fee', label: '设备费' },
  { value: 'other_fee', label: '其他费用' }
]

// 表单数据
const deductionForm = reactive({
  deduction_type: '',
  amount: 0,
  description: '',
  date: '',
  operator: '',
  related_class_id: null
})

// 表单验证规则
const deductionRules = {
  deduction_type: [
    { required: true, message: '请选择扣除类型', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入扣除金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '扣除金额必须大于0', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入扣除说明', trigger: 'blur' }
  ],
  date: [
    { required: true, message: '请选择扣除日期', trigger: 'change' }
  ],
  operator: [
    { required: true, message: '请输入操作人姓名', trigger: 'blur' }
  ]
}

const deductionFormRef = ref()

// 监听学生ID变化
watch(() => props.studentId, (newId) => {
  if (newId) {
    fetchDeductionDetails()
  }
})

// 获取扣除项明细
const fetchDeductionDetails = async () => {
  if (!props.studentId) return
  
  loading.value = true
  try {
    const response = await deductionDetailAPI.getStudentDeductionDetails(props.studentId)
    if (response.success) {
      deductionDetails.value = response.data
    } else {
      ElMessage.error(response.message || '获取扣除项明细失败')
    }
  } catch (error) {
    console.error('获取扣除项明细失败:', error)
    ElMessage.error('获取扣除项明细失败')
  } finally {
    loading.value = false
  }
}

// 获取扣除类型标签
const getDeductionTypeLabel = (type) => {
  const typeMap = {
    'teacher_fee': '老师课时费',
    'material_fee': '材料费',
    'equipment_fee': '设备费',
    'other_fee': '其他费用'
  }
  return typeMap[type] || type
}

// 获取扣除类型标签样式
const getDeductionTypeTag = (type) => {
  const tagMap = {
    'teacher_fee': 'primary',
    'material_fee': 'success',
    'equipment_fee': 'warning',
    'other_fee': 'info'
  }
  return tagMap[type] || 'info'
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 编辑扣除项
const editDeduction = (deduction) => {
  editingDeduction.value = deduction
  Object.assign(deductionForm, {
    deduction_type: deduction.deduction_type,
    amount: deduction.amount,
    description: deduction.description,
    date: deduction.date,
    operator: deduction.operator,
    related_class_id: deduction.related_class_id
  })
  showAddDialog.value = true
}

// 删除扣除项
const deleteDeduction = (deduction) => {
  deletingDeduction.value = deduction
  showDeleteDialog.value = true
}

// 确认删除
const confirmDelete = async () => {
  if (!deletingDeduction.value) return
  
  deleting.value = true
  try {
    const response = await deductionDetailAPI.deleteDeductionDetail(deletingDeduction.value.id)
    if (response.success) {
      ElMessage.success('删除成功')
      showDeleteDialog.value = false
      deletingDeduction.value = null
      await fetchDeductionDetails()
      emit('refresh')
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    console.error('删除扣除项明细失败:', error)
    ElMessage.error('删除失败')
  } finally {
    deleting.value = false
  }
}

// 保存扣除项
const saveDeduction = async () => {
  if (!deductionFormRef.value) return
  
  try {
    await deductionFormRef.value.validate()
  } catch (error) {
    return
  }
  
  saving.value = true
  try {
    let response
    if (editingDeduction.value) {
      // 更新
      response = await deductionDetailAPI.updateDeductionDetail(
        editingDeduction.value.id, 
        deductionForm
      )
    } else {
      // 添加
      response = await deductionDetailAPI.addDeductionDetail(
        props.studentId, 
        deductionForm
      )
    }
    
    if (response.success) {
      ElMessage.success(editingDeduction.value ? '更新成功' : '添加成功')
      showAddDialog.value = false
      await fetchDeductionDetails()
      emit('refresh')
    } else {
      ElMessage.error(response.message || (editingDeduction.value ? '更新失败' : '添加失败'))
    }
  } catch (error) {
    console.error('保存扣除项明细失败:', error)
    ElMessage.error(editingDeduction.value ? '更新失败' : '添加失败')
  } finally {
    saving.value = false
  }
}

// 对话框关闭处理
const handleDialogClose = () => {
  resetForm()
}

// 重置表单
const resetForm = () => {
  editingDeduction.value = null
  Object.assign(deductionForm, {
    deduction_type: '',
    amount: 0,
    description: '',
    date: '',
    operator: '',
    related_class_id: null
  })
  if (deductionFormRef.value) {
    deductionFormRef.value.resetFields()
  }
}

// 组件挂载时获取数据
onMounted(() => {
  if (props.studentId) {
    fetchDeductionDetails()
  }
})

// 暴露方法给父组件
defineExpose({
  fetchDeductionDetails
})
</script>

<style scoped>
.deduction-detail-manager {
  padding: 20px;
}

.action-bar {
  margin-bottom: 20px;
}

.amount {
  font-weight: bold;
  color: #e6a23c;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

.dialog-footer {
  text-align: right;
}
</style>
