<template>
  <el-container class="app-container">
    <!-- 侧边栏 -->
    <el-aside class="sidebar" width="250px">
      <div class="sidebar-header">
        <h2 class="sidebar-title">
          <el-icon class="title-icon"><School /></el-icon>
          培训班管理系统
        </h2>
      </div>
      
      <el-menu 
        :default-active="currentView" 
        class="sidebar-menu"
        @select="handleMenuSelect"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        
        <el-menu-item index="students">
          <el-icon><User /></el-icon>
          <span>学生管理</span>
        </el-menu-item>
        
        <el-menu-item index="deductions">
          <el-icon><Setting /></el-icon>
          <span>扣除项管理</span>
        </el-menu-item>
        
        <!-- 管理员专用菜单 -->
        <el-menu-item v-if="isAdmin" index="user-management">
          <el-icon><UserFilled /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-footer">
        <div class="system-info">
          <p>系统版本: v1.0.0</p>
          <p>最后更新: 2025-01-20</p>
        </div>
      </div>
    </el-aside>

    <!-- 主内容区域 -->
    <el-container class="main-container">
      <!-- 顶部导航栏 -->
      <el-header class="main-header">
        <div class="header-content">
          <div class="breadcrumb">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item>首页</el-breadcrumb-item>
              <el-breadcrumb-item>{{ getCurrentViewTitle() }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          
          <div class="header-actions">
            <el-button type="primary" @click="refreshCurrentView">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            
            <!-- 用户信息下拉菜单 -->
            <el-dropdown v-if="isAuthenticated && !isLoading" @command="handleUserCommand">
              <el-button>
                <el-icon><User /></el-icon>
                {{ userName || '用户' }} ({{ getRoleDisplayName(userRole) || '未知角色' }}) <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                  <el-dropdown-item v-if="isAdmin" command="user-management">用户管理</el-dropdown-item>
                  <el-dropdown-item v-if="isAdmin" command="system-settings">系统设置</el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            
            <!-- 加载状态 -->
            <el-button v-if="isLoading" disabled>
              <el-icon><Loading /></el-icon>
              加载中...
            </el-button>
          </div>
        </div>
      </el-header>

      <!-- 主要内容区域 -->
      <el-main class="main-content">
        <!-- 仪表盘视图 -->
        <Dashboard 
          v-if="currentView === 'dashboard'"
          ref="dashboardRef"
        />
        
        <!-- 学生管理视图 -->
        <StudentList 
          v-if="currentView === 'students'"
          @select-student="handleSelectStudent"
          ref="studentListRef"
        />
        
        <!-- 扣除项管理视图 -->
        <DeductionConfigManager 
          v-if="currentView === 'deductions'"
          ref="deductionConfigRef"
        />
        
        <!-- 用户管理视图（仅管理员） -->
        <UserManagement 
          v-if="currentView === 'user-management' && isAdmin"
          ref="userManagementRef"
        />
      </el-main>
    </el-container>

    <!-- 学生详情对话框 -->
    <StudentDetail 
      v-if="selectedStudent.id"
      :student="selectedStudent"
      :visible="showStudentDetail"
      @close="closeStudentDetail"
      @refresh="refreshStudentList"
    />
  </el-container>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  School, 
  DataBoard, 
  User, 
  Setting, 
  Refresh, 
  ArrowDown,
  UserFilled,
  Loading
} from '@element-plus/icons-vue'

import { useAuthStore } from '../stores/auth'
import Dashboard from './Dashboard.vue'
import StudentList from './StudentList.vue'
import StudentDetail from './StudentDetail.vue'
import DeductionConfigManager from './DeductionConfigManager.vue'
import UserManagement from './UserManagement.vue'

export default {
  name: 'Layout',
  components: {
    Dashboard,
    StudentList,
    StudentDetail,
    DeductionConfigManager,
    UserManagement,
    School,
    DataBoard,
    User,
    Setting,
    Refresh,
    ArrowDown,
    UserFilled,
    Loading
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const currentView = ref('dashboard')
    
    // 学生详情相关状态
    const selectedStudent = ref({})
    const showStudentDetail = ref(false)
    
    // 从认证store获取状态
    const isAuthenticated = computed(() => authStore?.isAuthenticated || false)
    const userRole = computed(() => authStore?.userRole || '')
    const isAdmin = computed(() => authStore?.isAdmin || false)
    const userName = computed(() => authStore?.userName || '用户')
    const isLoading = computed(() => authStore?.loading || false)
    
    // 组件引用
    const dashboardRef = ref(null)
    const studentListRef = ref(null)
    const deductionConfigRef = ref(null)
    const userManagementRef = ref(null)
    
    // 获取当前视图标题
    const getCurrentViewTitle = () => {
      const viewTitles = {
        'dashboard': '仪表盘',
        'students': '学生管理',
        'deductions': '扣除项管理',
        'user-management': '用户管理'
      }
      return viewTitles[currentView.value] || '未知页面'
    }
    
    // 获取角色显示名称
    const getRoleDisplayName = (role) => {
      const roleNames = {
        'admin': '管理员',
        'teacher': '教师',
        'operator': '操作员'
      }
      return roleNames[role] || '未知角色'
    }
    
    // 处理菜单选择
    const handleMenuSelect = (index) => {
      currentView.value = index
      router.push(`/${index}`)
    }
    
    // 处理用户命令
    const handleUserCommand = async (command) => {
      switch (command) {
        case 'profile':
          // TODO: 实现个人设置页面
          ElMessage.info('个人设置功能开发中...')
          break
        case 'user-management':
          currentView.value = 'user-management'
          router.push('/user-management')
          break
        case 'system-settings':
          // TODO: 实现系统设置页面
          ElMessage.info('系统设置功能开发中...')
          break
        case 'logout':
          await handleLogout()
          break
      }
    }
    
    // 处理登出
    const handleLogout = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要退出登录吗？',
          '确认退出',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        if (authStore?.logout) {
          await authStore.logout()
        }
        ElMessage.success('已成功退出登录')
        router.push('/login')
      } catch (error) {
        if (error !== 'cancel') {
          console.error('登出失败:', error)
          ElMessage.error('登出失败')
        }
      }
    }
    
    // 刷新当前视图
    const refreshCurrentView = () => {
      const currentRef = getCurrentComponentRef()
      if (currentRef && currentRef.value && currentRef.value.refresh) {
        currentRef.value.refresh()
        ElMessage.success('刷新成功')
      }
    }
    
    // 获取当前组件引用
    const getCurrentComponentRef = () => {
      switch (currentView.value) {
        case 'dashboard':
          return dashboardRef
        case 'students':
          return studentListRef
        case 'deductions':
          return deductionConfigRef
        case 'user-management':
          return userManagementRef
        default:
          return null
      }
    }
    
    // 处理学生选择
    const handleSelectStudent = (student) => {
      if (student && student.id) {
        selectedStudent.value = student
        showStudentDetail.value = true
        console.log('显示学生详情:', student)
      }
    }
    
    // 关闭学生详情
    const closeStudentDetail = () => {
      showStudentDetail.value = false
      selectedStudent.value = {}
    }
    
    // 刷新学生列表
    const refreshStudentList = () => {
      if (studentListRef.value && studentListRef.value.fetchStudents) {
        studentListRef.value.fetchStudents()
      }
    }
    
    // 初始化视图
    onMounted(() => {
      // 根据当前路由设置视图
      const path = router.currentRoute.value?.path
      if (path === '/' || !path) {
        currentView.value = 'dashboard'
      } else {
        currentView.value = path.substring(1)
      }
    })
    
    return {
      // 状态
      currentView,
      selectedStudent,
      showStudentDetail,
      isAuthenticated,
      userRole,
      isAdmin,
      userName,
      isLoading,
      
      // 组件引用
      dashboardRef,
      studentListRef,
      deductionConfigRef,
      userManagementRef,
      
      // 方法
      getCurrentViewTitle,
      getRoleDisplayName,
      handleMenuSelect,
      handleUserCommand,
      handleLogout,
      refreshCurrentView,
      handleSelectStudent,
      closeStudentDetail,
      refreshStudentList
    }
  }
}
</script>

<style scoped>
.app-container {
  height: 100vh;
}

/* 侧边栏样式 */
.sidebar {
  background: #304156;
  color: #bfcbd9;
  box-shadow: 2px 0 6px rgba(0, 21, 41, 0.35);
  position: relative;
  z-index: 1000;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #435266;
  text-align: center;
}

.sidebar-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-icon {
  margin-right: 8px;
  font-size: 20px;
}

.sidebar-menu {
  border: none;
  margin-top: 20px;
}

.sidebar-menu .el-menu-item {
  height: 50px;
  line-height: 50px;
  margin: 4px 0;
  border-radius: 0;
}

.sidebar-menu .el-menu-item:hover {
  background-color: #263445 !important;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #409EFF !important;
  color: #fff !important;
}

.sidebar-menu .el-menu-item .el-icon {
  margin-right: 12px;
  font-size: 16px;
}

.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  border-top: 1px solid #435266;
  background: #263445;
}

.system-info {
  text-align: center;
  font-size: 12px;
  color: #8a8a8a;
}

.system-info p {
  margin: 4px 0;
}

/* 主容器样式 */
.main-container {
  background: #f0f2f5;
}

/* 主头部样式 */
.main-header {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.breadcrumb {
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 主内容区域样式 */
.main-content {
  padding: 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 60px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px !important;
  }
  
  .main-header {
    padding: 0 15px;
  }
  
  .main-content {
    padding: 15px;
  }
  
  .header-actions {
    gap: 8px;
  }
}

/* 滚动条样式 */
.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: #304156;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #435266;
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #5a6c7d;
}

/* 动画效果 */
.sidebar-menu .el-menu-item {
  transition: all 0.3s ease;
}

.main-content > div {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
