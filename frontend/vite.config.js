

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ command, mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  // 调试信息
  console.log('=== Vite 配置信息 ===')
  console.log('当前模式:', mode)
  console.log('当前命令:', command)
  console.log('环境变量 VITE_API_URL:', env.VITE_API_URL)
  console.log('=====================')
  
  return {
    plugins: [vue()],
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    build: {
      // 确保环境变量在构建时可用
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    // 定义全局常量
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __APP_TITLE__: JSON.stringify(env.VITE_APP_TITLE || 'MeEdu培训班管理系统')
    }
  }
})
