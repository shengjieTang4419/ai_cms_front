<template>
  <div class="user-profile-container">
    <div class="user-profile-box">
      <div class="profile-header">
        <h1>个人信息</h1>
        <el-button 
          text 
          type="primary" 
          @click="goBack"
          class="back-button"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
      
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading" style="font-size: 40px;">
          <Loading />
        </el-icon>
        <p>加载中...</p>
      </div>

      <div v-else class="profile-content">
        <!-- 基本信息 -->
        <el-card class="profile-card">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
              <el-button 
                v-if="!isEditing" 
                type="primary" 
                size="small"
                @click="startEdit"
              >
                编辑
              </el-button>
              <div v-else class="edit-buttons">
                <el-button size="small" @click="cancelEdit">取消</el-button>
                <el-button type="primary" size="small" @click="saveProfile" :loading="saving">
                  保存
                </el-button>
              </div>
            </div>
          </template>

          <el-form
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-width="100px"
            :disabled="!isEditing"
          >
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="profileForm.gender" size="large">
                <el-radio label="男">男</el-radio>
                <el-radio label="女">女</el-radio>
                <el-radio label="保密">保密</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <el-form-item label="年龄" prop="age">
              <el-input-number
                v-model="profileForm.age"
                :min="1"
                :max="150"
                size="large"
                placeholder="请输入年龄"
                style="width: 100%;"
              />
            </el-form-item>
            
            <el-form-item label="居住地" prop="location">
              <el-input
                v-model="profileForm.location"
                placeholder="例如：上海浦东"
                size="large"
              />
            </el-form-item>
            
            <el-form-item label="职业" prop="occupation">
              <el-select
                v-model="profileForm.occupation"
                placeholder="请选择职业"
                size="large"
                style="width: 100%;"
              >
                <el-option
                  v-for="item in occupationOptions"
                  :key="item.code"
                  :label="item.name"
                  :value="item.code"
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="爱好" prop="hobbies">
              <el-select
                v-model="profileForm.hobbies"
                multiple
                filterable
                allow-create
                default-first-option
                :reserve-keyword="false"
                placeholder="请输入或选择爱好（最多5个）"
                size="large"
                style="width: 100%;"
              >
                <el-option
                  v-for="item in hobbyOptions"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
              <div class="hobby-hint">已选择 {{ profileForm.hobbies.length }} / 5</div>
            </el-form-item>
          </el-form>

          <!-- 兴趣标签维度图 -->
          <div v-if="userTagsDimensions && userTagsDimensions.length > 0" class="tags-dimension-section">
            <div class="section-divider"></div>
            <div class="section-title">兴趣标签维度</div>
            <div class="radar-chart-container">
              <div ref="radarChart" class="radar-chart"></div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUpdated, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Loading } from '@element-plus/icons-vue'
import { getUserProfile, submitUserProfile } from '../api/auth'
import { getAllOccupations } from '../api/occupation'
import * as echarts from 'echarts'

const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const isEditing = ref(false)
const profileFormRef = ref()
const radarChart = ref()
const occupationOptions = ref([])
const originalProfile = ref(null)
const userTagsDimensions = ref([])
const chartInstance = ref(null)

// 爱好预设选项
const hobbyOptions = [
  '编程',
  '游戏',
  '宠物',
  '电子产品',
  '阅读',
  '运动',
  '旅游',
  '音乐',
  '电影',
  '摄影',
  '绘画',
  '烹饪',
  '健身',
  '瑜伽',
  '舞蹈'
]

const profileForm = reactive({
  gender: '',
  age: null,
  location: '',
  occupation: null,
  hobbies: []
})

// 自定义验证爱好数量
const validateHobbies = (rule, value, callback) => {
  if (value && value.length > 5) {
    callback(new Error('最多只能选择5个爱好'))
  } else {
    callback()
  }
}

const profileRules = {
  age: [
    { type: 'number', min: 1, max: 150, message: '年龄必须在1-150之间', trigger: 'blur' }
  ],
  location: [
    { min: 2, max: 50, message: '居住地长度在2到50个字符', trigger: 'blur' }
  ],
  hobbies: [
    { validator: validateHobbies, trigger: 'change' }
  ]
}

// 加载个人信息
const loadProfile = async () => {
  try {
    loading.value = true
    const data = await getUserProfile()
    
    // 保存原始数据
    originalProfile.value = { ...data }
    userTagsDimensions.value = data.userTagsDimensions || []
    
    // 填充表单
    profileForm.gender = data.gender || ''
    profileForm.age = data.age || null
    profileForm.location = data.location || ''
    profileForm.occupation = data.occupation || null
    profileForm.hobbies = data.hobbies || []
    
    // 如果有关注标签，渲染雷达图
    if (userTagsDimensions.value.length > 0) {
      await nextTick()
      renderRadarChart()
    }
  } catch (error) {
    console.error('加载个人信息失败:', error)
    ElMessage.error('加载个人信息失败')
  } finally {
    loading.value = false
  }
}

// 加载职业列表
const loadOccupations = async () => {
  try {
    const data = await getAllOccupations()
    occupationOptions.value = data || []
  } catch (error) {
    console.error('加载职业列表失败:', error)
  }
}

// 渲染雷达图
const renderRadarChart = () => {
  console.log('开始渲染雷达图', {
    hasElement: !!radarChart.value,
    dataLength: userTagsDimensions.value.length,
    data: userTagsDimensions.value
  })
  
  if (!radarChart.value || userTagsDimensions.value.length === 0) {
    console.log('雷达图条件不满足')
    return
  }
  
  // 如果已经有实例，先销毁
  if (chartInstance.value) {
    chartInstance.value.dispose()
    chartInstance.value = null
  }
  
  try {
    chartInstance.value = echarts.init(radarChart.value)
    
    const maxValue = Math.max(...userTagsDimensions.value.map(item => item.totalWeight), 10)
    
    const option = {
      radar: {
        indicator: userTagsDimensions.value.map(item => ({
          name: item.tagName,
          max: maxValue
        })),
        center: ['50%', '50%'],
        radius: '65%',
        startAngle: 90,
        axisName: {
          color: '#666',
          fontSize: 14,
          fontWeight: 'bold'
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(102, 126, 234, 0.1)', 'rgba(102, 126, 234, 0.05)']
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(102, 126, 234, 0.3)'
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(102, 126, 234, 0.5)'
          }
        }
      },
      series: [{
        type: 'radar',
        data: [{
          value: userTagsDimensions.value.map(item => item.totalWeight),
          name: '兴趣维度',
          areaStyle: {
            color: 'rgba(102, 126, 234, 0.3)'
          },
          lineStyle: {
            color: '#667eea',
            width: 2
          },
          itemStyle: {
            color: '#667eea'
          }
        }]
      }]
    }
    
    chartInstance.value.setOption(option)
    console.log('雷达图渲染成功')
    
    // 响应式调整
    const resizeHandler = () => {
      if (chartInstance.value) {
        chartInstance.value.resize()
      }
    }
    window.addEventListener('resize', resizeHandler)
    
  } catch (error) {
    console.error('渲染雷达图失败:', error)
  }
}

// 开始编辑
const startEdit = () => {
  isEditing.value = true
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
  // 恢复原始数据
  if (originalProfile.value) {
    profileForm.gender = originalProfile.value.gender || ''
    profileForm.age = originalProfile.value.age || null
    profileForm.location = originalProfile.value.location || ''
    profileForm.occupation = originalProfile.value.occupation || null
    profileForm.hobbies = originalProfile.value.hobbies || []
  }
}

// 保存个人信息
const saveProfile = async () => {
  if (!profileFormRef.value) return
  
  try {
    await profileFormRef.value.validate()
    saving.value = true
    
    const dataToSave = {
      gender: profileForm.gender,
      age: profileForm.age,
      location: profileForm.location,
      occupation: profileForm.occupation,
      hobbies: profileForm.hobbies
    }
    
    await submitUserProfile(dataToSave)
    ElMessage.success('保存成功')
    
    // 重新加载数据
    await loadProfile()
    isEditing.value = false
  } catch (error) {
    if (error.message && error.message.includes('验证')) {
      // 验证失败
      console.error('表单验证失败:', error)
    } else {
      ElMessage.error('保存失败，请重试')
    }
  } finally {
    saving.value = false
  }
}

// 返回
const goBack = () => {
  router.push('/chat')
}

// 监听数据变化，重新渲染图表
watch(
  () => userTagsDimensions.value,
  async (newVal) => {
    if (newVal && newVal.length > 0) {
      await nextTick()
      setTimeout(() => {
        renderRadarChart()
      }, 100)
    }
  },
  { deep: true }
)

onMounted(() => {
  loadOccupations()
  loadProfile()
})

onUpdated(() => {
  if (userTagsDimensions.value && userTagsDimensions.value.length > 0 && radarChart.value) {
    setTimeout(() => {
      renderRadarChart()
    }, 100)
  }
})
</script>

<style scoped>
.user-profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.user-profile-box {
  max-width: 900px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.profile-header h1 {
  color: white;
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.back-button {
  color: white;
  font-size: 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  color: white;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.edit-buttons {
  display: flex;
  gap: 10px;
}

.hobby-hint {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
}

.tags-dimension-section {
  margin-top: 20px;
  padding-top: 20px;
}

.section-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #e4e7ed, transparent);
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-left: 10px;
  border-left: 3px solid #667eea;
}

.radar-chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.radar-chart {
  width: 100%;
  height: 400px;
  min-height: 400px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #333;
}

:deep(.el-radio-group) {
  display: flex;
  gap: 20px;
}

:deep(.el-select__tags) {
  max-height: 100px;
  overflow-y: auto;
}

:deep(.el-card__header) {
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}
</style>

