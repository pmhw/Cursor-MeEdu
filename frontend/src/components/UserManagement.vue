<template>
  <div class="user-management">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        添加用户
      </el-button>
    </div>

    <!-- 用户列表 -->
    <el-table :data="users" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="real_name" label="真实姓名" width="120" />
      <el-table-column prop="role" label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="getRoleTagType(row.role)">
            {{ getRoleDisplayName(row.role) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="email" label="邮箱" width="180" />
      <el-table-column prop="phone" label="手机" width="120" />
      <el-table-column prop="is_active" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'danger'">
            {{ row.is_active ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="last_login" label="最后登录" width="160" />
      <el-table-column prop="created_at" label="创建时间" width="160" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="editUser(row)">编辑</el-button>
          <el-button 
            size="small" 
            :type="row.is_active ? 'warning' : 'success'"
            @click="toggleUserStatus(row)"
          >
            {{ row.is_active ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog 
      :title="isEditing ? '编辑用户' : '添加用户'" 
      v-model="showCreateDialog"
      width="500px"
    >
      <el-form 
        ref="userForm" 
        :model="userForm" 
        :rules="userRules" 
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input 
            v-model="userForm.username" 
            :disabled="isEditing"
            placeholder="请输入用户名"
          />
        </el-form-item>
        
        <el-form-item label="密码" prop="password" v-if="!isEditing">
          <el-input 
            v-model="userForm.password" 
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="真实姓名" prop="real_name">
          <el-input 
            v-model="userForm.real_name" 
            placeholder="请输入真实姓名"
          />
        </el-form-item>
        
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="教师" value="teacher" />
            <el-option label="操作员" value="operator" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="邮箱" prop="email">
          <el-input 
            v-model="userForm.email" 
            placeholder="请输入邮箱"
          />
        </el-form-item>
        
        <el-form-item label="手机" prop="phone">
          <el-input 
            v-model="userForm.phone" 
            placeholder="请输入手机号"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveUser" :loading="saving">
          {{ saving ? '保存中...' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { authApi } from '../api/auth'

export default {
  name: 'UserManagement',
  components: {
    Plus
  },
  setup() {
    const loading = ref(false)
    const saving = ref(false)
    const users = ref([])
    const showCreateDialog = ref(false)
    const isEditing = ref(false)
    const userForm = ref(null)
    
    const formData = reactive({
      username: '',
      password: '',
      role: '',
      real_name: '',
      email: '',
      phone: ''
    })
    
    const userRules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
      ],
      role: [
        { required: true, message: '请选择角色', trigger: 'change' }
      ],
      real_name: [
        { required: true, message: '请输入真实姓名', trigger: 'blur' }
      ]
    }
    
    // 获取用户列表
    const fetchUsers = async () => {
      try {
        loading.value = true
        const response = await authApi.getUsers()
        if (response.success) {
          users.value = response.data
        } else {
          ElMessage.error(response.message || '获取用户列表失败')
        }
      } catch (error) {
        console.error('获取用户列表失败:', error)
        ElMessage.error('获取用户列表失败')
      } finally {
        loading.value = false
      }
    }
    
    // 编辑用户
    const editUser = (user) => {
      isEditing.value = true
      Object.assign(formData, {
        username: user?.username || '',
        password: '',
        role: user?.role || '',
        real_name: user?.real_name || '',
        email: user?.email || '',
        phone: user?.phone || ''
      })
      showCreateDialog.value = true
    }
    
    // 保存用户
    const saveUser = async () => {
      try {
        const valid = await userForm.value.validate()
        if (!valid) return
        
        saving.value = true
        
        let response
        if (isEditing.value) {
          // 编辑用户（这里需要实现编辑API）
          ElMessage.info('编辑用户功能开发中...')
          return
        } else {
          // 创建用户
          response = await authApi.register(formData)
        }
        
        if (response.success) {
          ElMessage.success(response.message || '用户保存成功')
          showCreateDialog.value = false
          resetForm()
          fetchUsers()
        } else {
          ElMessage.error(response.message || '保存失败')
        }
      } catch (error) {
        console.error('保存用户失败:', error)
        ElMessage.error('保存失败')
      } finally {
        saving.value = false
      }
    }
    
    // 切换用户状态
    const toggleUserStatus = async (user) => {
      try {
        const action = user?.is_active ? '禁用' : '启用'
        await ElMessageBox.confirm(
          `确定要${action}用户 "${user?.username || '未知用户'}" 吗？`,
          `确认${action}`,
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        const response = await authApi.updateUserStatus(user?.id, !user?.is_active)
        if (response.success) {
          ElMessage.success(response.message || `${action}成功`)
          fetchUsers()
        } else {
          ElMessage.error(response.message || `${action}失败`)
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('切换用户状态失败:', error)
          ElMessage.error('操作失败')
        }
      }
    }
    
    // 重置表单
    const resetForm = () => {
      Object.assign(formData, {
        username: '',
        password: '',
        role: '',
        real_name: '',
        email: '',
        phone: ''
      })
      isEditing.value = false
      if (userForm.value) {
        userForm.value.resetFields()
      }
    }
    
    // 获取角色标签类型
    const getRoleTagType = (role) => {
      const typeMap = {
        'admin': 'danger',
        'teacher': 'warning',
        'operator': 'info'
      }
      return typeMap[role] || 'info'
    }
    
    // 获取角色显示名称
    const getRoleDisplayName = (role) => {
      const nameMap = {
        'admin': '管理员',
        'teacher': '教师',
        'operator': '操作员'
      }
      return nameMap[role] || '未知角色'
    }
    
    // 刷新数据
    const refresh = () => {
      fetchUsers()
    }
    
    onMounted(() => {
      fetchUsers()
    })
    
    // 暴露刷新方法给父组件
    defineExpose({
      refresh
    })
    
    return {
      loading,
      saving,
      users,
      showCreateDialog,
      isEditing,
      userForm,
      formData,
      userRules,
      editUser,
      saveUser,
      toggleUserStatus,
      getRoleTagType,
      getRoleDisplayName,
      refresh
    }
  }
}
</script>

<style scoped>
.user-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #333;
}

.el-table {
  margin-bottom: 20px;
}

.el-tag {
  margin-right: 5px;
}
</style>
