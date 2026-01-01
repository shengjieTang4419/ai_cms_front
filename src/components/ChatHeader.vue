<template>
  <div class="chat-header">
    <div class="header-left">
      <h1>AI聊天助手</h1>
    </div>
    <div class="header-right">
      <div class="user-menu" @click="toggleDropdown" ref="userMenuRef">
        <span class="user-button-wrapper">
          <el-icon><User /></el-icon>
          <span class="username">{{ userStore.user?.username }}</span>
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </span>

        <div v-if="showDropdown" class="custom-dropdown-menu">
          <div class="dropdown-item" @click="goToProfile">
            <el-icon><User /></el-icon>
            <span>个人信息</span>
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item" @click="handleLogout">
            <el-icon><CircleClose /></el-icon>
            <span>退出登录</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, ArrowDown, CircleClose } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const showDropdown = ref(false)
const userMenuRef = ref(null)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const goToProfile = () => {
  showDropdown.value = false
  router.push('/profile')
}

const handleLogout = async () => {
  showDropdown.value = false
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (action) {
    if (action === 'cancel') return
  }

  try {
    await userStore.logout()

    localStorage.removeItem('token')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.clear()

    ElMessage.success('已退出登录')
    setTimeout(() => {
      router.replace('/login')
    }, 100)
  } catch (error) {
    console.error('退出登录失败:', error)
    ElMessage.error('退出登录失败，请重试')
  }
}

const handleClickOutside = (event) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.chat-header {
  background: white;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 100;
}

.header-right {
  position: relative;
  z-index: 101;
}

.header-left h1 {
  color: #333;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.user-button-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.3s;
}

.user-button-wrapper:hover {
  color: #409eff;
  background-color: #f5f7fa;
}

.username {
  font-weight: 500;
}

.header-right :deep(.el-dropdown) {
  cursor: pointer;
}

.user-menu {
  position: relative;
}

.custom-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.dropdown-item:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.dropdown-divider {
  height: 1px;
  background-color: #e0e0e0;
  margin: 4px 0;
}
</style>
