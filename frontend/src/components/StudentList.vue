<template>
  <div class="student-list">
         <div class="header">
       <h2>学生列表</h2>
       <div class="header-actions">
         <el-button type="primary" @click="showAddDialog = true">
           <el-icon><Plus /></el-icon>
           添加学生
         </el-button>
       </div>
     </div>

    <!-- 学生列表表格 -->
    <el-table 
      :data="students" 
      v-loading="loading"
      stripe
      @row-click="handleRowClick"
      class="student-table"
    >
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phone" label="手机号" width="150" />
      <el-table-column prop="remaining_hours" label="剩余课时" width="120">
        <template #default="{ row }">
          <el-tag :type="row.remaining_hours > 0 ? 'success' : 'danger'">
            {{ row.remaining_hours }} 课时
          </el-tag>
        </template>
      </el-table-column>
             <el-table-column label="操作" width="280">
         <template #default="{ row }">
           <el-button size="small" @click.stop="handleRecharge(row)">
             充值
           </el-button>
           <el-button size="small" type="warning" @click.stop="handleConsume(row)">
             上课
           </el-button>
           <el-button size="small" type="danger" @click.stop="handleDelete(row)">
             删除
           </el-button>
         </template>
       </el-table-column>
    </el-table>

    <!-- 添加学生对话框 -->
    <el-dialog v-model="showAddDialog" title="添加学生" width="400px">
      <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="addForm.name" placeholder="请输入学生姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="addForm.phone" placeholder="请输入手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddStudent" :loading="adding">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 充值对话框 -->
    <el-dialog v-model="showRechargeDialog" title="课时充值" width="400px">
      <el-form :model="rechargeForm" :rules="rechargeRules" ref="rechargeFormRef" label-width="80px">
        <el-form-item label="学生姓名">
          <el-input v-model="selectedStudent.name" disabled />
        </el-form-item>
        <el-form-item label="充值金额" prop="amount">
          <el-input-number 
            v-model="rechargeForm.amount" 
            :min="0" 
            :precision="2"
            placeholder="请输入充值金额"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="充值课时" prop="hours">
          <el-input-number 
            v-model="rechargeForm.hours" 
            :min="1" 
            :precision="0"
            placeholder="请输入充值课时"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRechargeDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleRechargeSubmit" 
          :loading="recharging"
          :disabled="recharging"
        >
          确认充值
        </el-button>
      </template>
    </el-dialog>

    <!-- 上课扣除课时对话框 -->
    <el-dialog v-model="showConsumeDialog" title="上课记录" width="400px">
      <el-form :model="consumeForm" :rules="consumeRules" ref="consumeFormRef" label-width="80px">
        <el-form-item label="学生姓名">
          <el-input v-model="selectedStudent.name" disabled />
        </el-form-item>
        <el-form-item label="剩余课时">
          <el-tag type="info">{{ selectedStudent.remaining_hours }} 课时</el-tag>
        </el-form-item>
        <el-form-item label="消耗课时" prop="hours_used">
          <el-input-number 
            v-model="consumeForm.hours_used" 
            :min="1" 
            :max="selectedStudent.remaining_hours"
            :precision="0"
            placeholder="请输入消耗课时"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConsumeDialog = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleConsumeSubmit" 
          :loading="consuming"
          :disabled="consuming"
        >
          确认上课
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, DataBoard } from '@element-plus/icons-vue'
import { studentAPI } from '../api'
import DeductionDetailManager from './DeductionDetailManager.vue'

// 响应式数据
const students = ref([])
const loading = ref(false)
const adding = ref(false)
const recharging = ref(false)
const consuming = ref(false)
const deleting = ref(false)

// 对话框状态
const showAddDialog = ref(false)
const showRechargeDialog = ref(false)
const showConsumeDialog = ref(false)

// 选中的学生
const selectedStudent = ref({})

// 表单引用
const addFormRef = ref()
const rechargeFormRef = ref()
const consumeFormRef = ref()

// 表单数据
const addForm = reactive({
  name: '',
  phone: ''
})

const rechargeForm = reactive({
  amount: 0,
  hours: 0
})

const consumeForm = reactive({
  hours_used: 0
})

// 表单验证规则
const addRules = {
  name: [{ required: true, message: '请输入学生姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }]
}

const rechargeRules = {
  amount: [{ required: true, message: '请输入充值金额', trigger: 'blur' }],
  hours: [{ required: true, message: '请输入充值课时', trigger: 'blur' }]
}

const consumeRules = {
  hours_used: [{ required: true, message: '请输入消耗课时', trigger: 'blur' }]
}

// 获取学生列表
const fetchStudents = async () => {
  loading.value = true
  try {
    const response = await studentAPI.getStudents()
    if (response.success) {
      students.value = response.data
    } else {
      ElMessage.error(response.message || '获取学生列表失败')
    }
  } catch (error) {
    ElMessage.error('获取学生列表失败')
  } finally {
    loading.value = false
  }
}

// 添加学生
const handleAddStudent = async () => {
  if (!addFormRef.value) return
  
  try {
    await addFormRef.value.validate()
    adding.value = true
    
    const response = await studentAPI.addStudent(addForm)
    if (response.success) {
      ElMessage.success('添加学生成功')
      showAddDialog.value = false
      // 重置表单
      addForm.name = ''
      addForm.phone = ''
      // 刷新列表
      fetchStudents()
    } else {
      ElMessage.error(response.message || '添加学生失败')
    }
  } catch (error) {
    ElMessage.error('添加学生失败')
  } finally {
    adding.value = false
  }
}

// 充值
const handleRecharge = (row) => {
  selectedStudent.value = { ...row }
  rechargeForm.amount = 0
  rechargeForm.hours = 0
  showRechargeDialog.value = true
}

// 提交充值
const handleRechargeSubmit = async () => {
  if (!rechargeFormRef.value) return
  
  try {
    await rechargeFormRef.value.validate()
    recharging.value = true
    
    const response = await studentAPI.rechargeStudent(selectedStudent.value.id, rechargeForm)
    if (response.success) {
      ElMessage.success('充值成功')
      showRechargeDialog.value = false
      // 刷新列表
      fetchStudents()
      // 触发父组件刷新详情
      emit('refresh-detail')
    } else {
      ElMessage.error(response.message || '充值失败')
    }
  } catch (error) {
    ElMessage.error('充值失败')
  } finally {
    recharging.value = false
  }
}

// 上课扣除课时
const handleConsume = (row) => {
  selectedStudent.value = { ...row }
  consumeForm.hours_used = 0
  showConsumeDialog.value = true
}

// 提交上课记录
const handleConsumeSubmit = async () => {
  if (!consumeFormRef.value) return
  
  try {
    await consumeFormRef.value.validate()
    consuming.value = true
    
    const response = await studentAPI.consumeStudent(selectedStudent.value.id, consumeForm)
    if (response.success) {
      ElMessage.success('上课记录成功')
      showConsumeDialog.value = false
      // 刷新列表
      fetchStudents()
      // 触发父组件刷新详情
      emit('refresh-detail')
    } else {
      ElMessage.error(response.message || '上课记录失败')
    }
  } catch (error) {
    ElMessage.error('上课记录失败')
  } finally {
    consuming.value = false
  }
}

// 删除学生
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除学生 "${row.name}" 吗？\n删除后将无法恢复，包括所有充值记录和上课记录。`,
    '确认删除',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      dangerouslyUseHTMLString: false
    }
  ).then(async () => {
    try {
      deleting.value = true
      
      const response = await studentAPI.deleteStudent(row.id)
      if (response.success) {
        ElMessage.success('学生删除成功')
        // 刷新列表
        fetchStudents()
        // 如果删除的是当前选中的学生，清空选中状态
        emit('select-student', {})
      } else {
        ElMessage.error(response.message || '删除学生失败')
      }
    } catch (error) {
      ElMessage.error('删除学生失败')
    } finally {
      deleting.value = false
    }
  }).catch(() => {
    // 用户取消删除
    ElMessage.info('已取消删除')
  })
}

// 行点击事件
const emit = defineEmits(['select-student', 'refresh-detail'])
const handleRowClick = (row) => {
  emit('select-student', row)
}

// 组件挂载时获取学生列表
onMounted(() => {
  fetchStudents()
})

// 暴露刷新方法给父组件
defineExpose({
  fetchStudents,
  refresh: fetchStudents
})
</script>

<style scoped>
.student-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.header h2 {
  margin: 0;
  color: #303133;
}

.student-table {
  margin-bottom: 20px;
}

.student-table :deep(.el-table__row) {
  cursor: pointer;
}

.student-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>
