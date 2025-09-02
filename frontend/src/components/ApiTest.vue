<template>
  <div class="api-test">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>🔍 API接口测试</span>
          <el-button type="primary" @click="runAllTests" :loading="loading">
            运行所有测试
          </el-button>
        </div>
      </template>

      <div class="test-results">
        <div v-for="(test, index) in testResults" :key="index" class="test-item">
          <div class="test-header">
            <span class="test-number">{{ index + 1 }}️⃣</span>
            <span class="test-name">{{ test.name }}</span>
            <el-tag :type="test.status === 'success' ? 'success' : test.status === 'error' ? 'danger' : 'info'">
              {{ test.status === 'success' ? '通过' : test.status === 'error' ? '失败' : '等待' }}
            </el-tag>
          </div>
          
          <div v-if="test.result" class="test-result">
            <el-collapse>
              <el-collapse-item title="查看详情">
                <pre>{{ JSON.stringify(test.result, null, 2) }}</pre>
              </el-collapse-item>
            </el-collapse>
          </div>
          
          <div v-if="test.error" class="test-error">
            <el-alert
              :title="test.error"
              type="error"
              :closable="false"
              show-icon
            />
          </div>
        </div>
      </div>

      <div class="test-summary">
        <el-divider />
        <div class="summary-stats">
          <el-statistic title="总测试数" :value="testResults.length" />
          <el-statistic title="通过数" :value="passedCount" />
          <el-statistic title="失败数" :value="failedCount" />
          <el-statistic title="成功率" :value="successRate" suffix="%" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { studentAPI, statsAPI, deductionAPI, profitAPI } from '@/api'

const loading = ref(false)
const testResults = ref([])

// 计算属性
const passedCount = computed(() => testResults.value.filter(t => t.status === 'success').length)
const failedCount = computed(() => testResults.value.filter(t => t.status === 'error').length)
const successRate = computed(() => {
  if (testResults.value.length === 0) return 0
  return Math.round((passedCount.value / testResults.value.length) * 100)
})

// 测试配置
const tests = [
  {
    name: '健康检查',
    api: () => studentAPI.getStudents().then(() => ({ message: 'API连接正常' }))
  },
  {
    name: '获取学生列表',
    api: () => studentAPI.getStudents()
  },
  {
    name: '获取统计数据',
    api: () => statsAPI.getStats()
  },
  {
    name: '获取扣除项配置',
    api: () => deductionAPI.getDeductionConfigs()
  },
  {
    name: '获取利润统计',
    api: () => profitAPI.getOverallProfit()
  }
]

// 运行所有测试
const runAllTests = async () => {
  loading.value = true
  testResults.value = tests.map(test => ({
    name: test.name,
    status: 'waiting',
    result: null,
    error: null
  }))

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i]
    try {
      const result = await test.api()
      testResults.value[i] = {
        name: test.name,
        status: 'success',
        result: result,
        error: null
      }
    } catch (error) {
      testResults.value[i] = {
        name: test.name,
        status: 'error',
        result: null,
        error: error.message || '未知错误'
      }
    }
    
    // 添加延迟，让用户看到测试过程
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  loading.value = false
}
</script>

<style scoped>
.api-test {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-results {
  margin-top: 20px;
}

.test-item {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background-color: #fafafa;
}

.test-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.test-number {
  font-weight: bold;
  font-size: 16px;
}

.test-name {
  flex: 1;
  font-weight: 500;
}

.test-result {
  margin-top: 10px;
}

.test-result pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

.test-error {
  margin-top: 10px;
}

.test-summary {
  margin-top: 20px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
</style>
