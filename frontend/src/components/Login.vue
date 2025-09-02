<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>培训班课时管理系统</h1>
        <p>请登录以继续操作</p>
      </div>
      
      <el-form 
        ref="loginForm" 
        :model="formData" 
        :rules="loginRules" 
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="formData.username"
            placeholder="用户名"
            prefix-icon="el-icon-user"
            size="large"
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="密码"
            prefix-icon="el-icon-lock"
            size="large"
            show-password
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="formData.rememberMe">
            记住登录状态（7天）
          </el-checkbox>
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p>默认管理员账户：admin / admin123</p>
        <p>请及时修改默认密码！</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const loginForm = ref()
    const loading = ref(false)
    
    const formData = reactive({
      username: '',
      password: '',
      rememberMe: false
    })
    
    const loginRules = {
      username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
      ],
      password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
      ]
    }
    
    const handleLogin = async () => {
      try {
        const valid = await loginForm.value?.validate()
        if (!valid) return
        
        loading.value = true
        
        const result = await authStore.login({
          username: formData.username,
          password: formData.password,
          rememberMe: formData.rememberMe
        })
        
        if (result.success) {
          ElMessage.success('登录成功！')
          router.push('/')
        } else {
          ElMessage.error(result.message || '登录失败')
        }
      } catch (error) {
        console.error('登录错误:', error)
        ElMessage.error('登录失败，请检查网络连接')
      } finally {
        loading.value = false
      }
    }
    
    onMounted(() => {
      // 检查是否已经登录
      if (authStore.isAuthenticated) {
        router.push('/')
      }
      
      // 尝试从本地存储恢复用户名
      const savedUsername = localStorage.getItem('rememberedUsername')
      if (savedUsername) {
        formData.username = savedUsername
        formData.rememberMe = true
      }
    })
    
    return {
      loginForm,
      loginRules,
      loading,
      formData,
      handleLogin
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  color: #333;
  font-size: 24px;
  margin-bottom: 8px;
  font-weight: 600;
}

.login-header p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.login-form {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

.login-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.login-footer p {
  color: #999;
  font-size: 12px;
  margin: 5px 0;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-box {
    padding: 30px 20px;
    margin: 10px;
  }
  
  .login-header h1 {
    font-size: 20px;
  }
}
</style>
