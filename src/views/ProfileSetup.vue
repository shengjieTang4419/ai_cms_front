<template>
  <div class="profile-setup-container">
    <div class="profile-setup-box">
      <div class="profile-setup-header">
        <h1>完善个人信息</h1>
        <p>请填写您的基本信息，帮助我们为您提供更好的服务</p>
      </div>
      
      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        class="profile-form"
        label-width="100px"
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
        
        <el-form-item>
          <div class="button-group">
            <el-button
              type="primary"
              size="large"
              class="submit-button"
              :loading="loading"
              @click="handleSubmit"
            >
              完成
            </el-button>
            <el-button
              size="large"
              class="skip-button"
              @click="handleSkip"
            >
              跳过
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { submitUserProfile } from '../api/auth'
import { getAllOccupations } from '../api/occupation'

const router = useRouter()

const profileFormRef = ref()
const loading = ref(false)
const occupationOptions = ref([])

// 加载职业列表
const loadOccupations = async () => {
  try {
    const data = await getAllOccupations()
    occupationOptions.value = data || []
  } catch (error) {
    console.error('加载职业列表失败:', error)
    ElMessage.error('加载职业列表失败')
  }
}

// 组件挂载时加载职业列表
onMounted(() => {
  loadOccupations()
})

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
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' },
    { type: 'number', min: 1, max: 150, message: '年龄必须在1-150之间', trigger: 'blur' }
  ],
  location: [
    { required: true, message: '请输入居住地', trigger: 'blur' },
    { min: 2, max: 50, message: '居住地长度在2到50个字符', trigger: 'blur' }
  ],
  occupation: [
    { required: true, message: '请选择职业', trigger: 'change' }
  ],
  hobbies: [
    { required: true, message: '请至少选择一个爱好', trigger: 'change' },
    { validator: validateHobbies, trigger: 'change' }
  ]
}

const handleSubmit = async () => {
  if (!profileFormRef.value) return
  
  try {
    await profileFormRef.value.validate()
    loading.value = true
    
    await submitUserProfile(profileForm)
    ElMessage.success('个人信息提交成功')
    router.push('/chat')
  } catch (error) {
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else if (error.message) {
      // 验证失败
      console.error('表单验证失败:', error)
    } else {
      ElMessage.error('提交失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

const handleSkip = () => {
  ElMessage.info('已跳过个人信息填写')
  router.push('/chat')
}
</script>

<style scoped>
.profile-setup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.profile-setup-box {
  width: 100%;
  max-width: 600px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.profile-setup-header {
  text-align: center;
  margin-bottom: 30px;
}

.profile-setup-header h1 {
  color: #333;
  margin-bottom: 10px;
  font-size: 28px;
  font-weight: 600;
}

.profile-setup-header p {
  color: #666;
  font-size: 14px;
}

.profile-form {
  margin-top: 20px;
}

.hobby-hint {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
}

.button-group {
  display: flex;
  gap: 15px;
  width: 100%;
}

.submit-button {
  flex: 1;
  height: 45px;
  font-size: 16px;
  font-weight: 500;
}

.skip-button {
  flex: 1;
  height: 45px;
  font-size: 16px;
  font-weight: 500;
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
</style>

