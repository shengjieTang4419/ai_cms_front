<template>
  <div class="chat-container">
    <!-- 头部 -->
    <ChatHeader />

    <!-- 主体：左侧固定会话栏 + 右侧聊天区 -->
    <div class="chat-body">
      <!-- 左侧固定会话栏 -->
      <ChatSidebar 
        v-model:collapsed="sidebarCollapsed"
        :sessions="sessions"
        :current-session-id="currentSessionId"
        @new-session="createNewSession"
        @select-session="selectSession"
        @rename-session="handleRenameSession"
        @delete-session="handleDeleteSession"
      />

      <!-- 右侧聊天区 -->
      <div class="chat-main">
        <!-- 消息列表 -->
        <div v-if="messages.length > 0" class="chat-messages" ref="messagesContainer">
          <template v-for="(item, index) in renderedMessages" :key="index">
            <div v-if="item.type === 'divider'" class="message-divider">
              <span>{{ item.text }}</span>
            </div>
            <ChatMessage v-else :message="item.data" @image-deleted="handleImageDeleted" @topic-click="fillExample" />
          </template>
          
          <!-- 加载中状态 -->
          <div v-if="isLoading" class="loading-message">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <!-- 功能提示区域 -->
        <FeatureHints v-if="messages.length === 0" @fill="fillExample" />

        <!-- 输入区域 -->
        <ChatInput 
          v-model="inputMessage"
          :is-hero-mode="messages.length === 0"
          :is-loading="isLoading"
          @send="handleSend"
          @knowledge-search-toggle="handleKnowledgeSearchToggle"
          @web-search-toggle="handleWebSearchToggle"
          @deep-thinking-toggle="handleDeepThinkingToggle"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { useLocationStore } from '../stores/location'
import { chatService } from '../api/chat'
import { getUserInterests } from '../api/recommendation'
import { isLocationRelatedQuery } from '../api/location'
import { getUserSessions, getSessionHistory, deleteSession as deleteSessionApi } from '../api/dialogue'
import { splitThinkingAnswer } from '../utils/thinking'
import { useChatLocation } from '../composables/useChatLocation'
import { useChatFlow } from '../composables/useChatFlow'
import { useSessions } from '../composables/useSessions'
import ChatHeader from '../components/ChatHeader.vue'
import FeatureHints from '../components/FeatureHints.vue'
import ChatSidebar from '../components/ChatSidebar.vue'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'

const router = useRouter()
const userStore = useUserStore()
const locationStore = useLocationStore()

const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref()

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Session 级别的位置缓存
// 每个 session 开启时获取一次，多轮对话复用
const { resolveLocationForMessage, clearSessionLocation } = useChatLocation({
  locationStore,
  isLocationRelatedQuery
})
const sidebarCollapsed = ref(false)
const isKnowledgeSearch = ref(false)
const isWebSearch = ref(false)
const isDeepThinking = ref(false)

const {
  sessions,
  currentSessionId,
  historyLoaded,
  loadSessions,
  createNewSession: createNewSessionFromComposable,
  selectSession: selectSessionFromComposable,
  deleteSession: deleteSessionFromComposable,
  renameSession
} = useSessions({
  getUserSessions,
  getSessionHistory,
  deleteSessionApi,
  splitThinkingAnswer,
  locationStore,
  clearSessionLocation,
  ElMessage
})

const createNewSession = async () => {
  await createNewSessionFromComposable({ messages })
}

// 带日期分隔与“历史会话记录”提示的渲染列表
const renderedMessages = computed(() => {
  const items = []
  let lastKey = ''
  const now = new Date()
  const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString()
  const yestKey = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString()

  for (const m of messages.value) {
    const d = new Date(m.timestamp || Date.now())
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString()
    if (key !== lastKey) {
      let label = d.toLocaleDateString('zh-CN')
      if (key === todayKey) label = '今天'
      else if (key === yestKey) label = '昨天'
      items.push({ type: 'divider', text: label })
      lastKey = key
    }
    items.push({ type: 'message', data: m })
  }
  if (historyLoaded.value && items.length) {
    items.unshift({ type: 'divider', text: '历史会话记录' })
  }
  return items
})


// 填充示例文本
const fillExample = (text) => {
  inputMessage.value = text
}

const { sendMessage } = useChatFlow({
  chatService,
  getUserInterests,
  scrollToBottom,
  onStreamErrorMessage: (error) => {
    console.error('聊天错误:', error)

    let errorMessage = isKnowledgeSearch.value ? '知识库搜索失败，请重试' : '发送消息失败，请重试'
    if (error && error.message) {
      if (error.message.includes('检测到设备变化') || error.message.includes('设备变化')) {
        errorMessage = '检测到设备变化，请重新登录'
        setTimeout(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.clear()
          router.push('/login')
        }, 2000)
      } else if (error.message.includes('认证失败') || error.message.includes('401')) {
        errorMessage = '登录已过期，请重新登录'
        setTimeout(() => {
          userStore.logout()
          router.push('/login')
        }, 2000)
      } else if (error.message.includes('权限不足') || error.message.includes('403')) {
        errorMessage = '权限不足，请联系管理员'
      } else if (error.message.includes('超时')) {
        errorMessage = isKnowledgeSearch.value ? '知识库搜索超时，请重试' : '请求超时，请检查网络连接'
      } else if (error.message.includes('连接被中断')) {
        errorMessage = '连接中断，请重试'
      } else {
        errorMessage = `${isKnowledgeSearch.value ? '知识库搜索' : '发送消息'}失败: ${error.message}`
      }
    }
    ElMessage.error(errorMessage)
  }
})

// 处理知识库搜索切换
const handleKnowledgeSearchToggle = (isActive) => {
  isKnowledgeSearch.value = isActive
  if (isActive) {
    isWebSearch.value = false // 确保互斥
  }
}

// 处理全网搜索切换
const handleWebSearchToggle = (isActive) => {
  isWebSearch.value = isActive
  if (isActive) {
    isKnowledgeSearch.value = false // 确保互斥
  }
}

// 处理深度思考切换
const handleDeepThinkingToggle = (isActive) => {
  isDeepThinking.value = isActive
}

// 处理图片删除事件
const handleImageDeleted = (imageUrl) => {
  // 从所有消息中移除被删除的图片
  messages.value.forEach(message => {
    if (message.images && Array.isArray(message.images)) {
      // 查找匹配的图片（可能是字符串 URL 或对象）
      const index = message.images.findIndex(img => {
        if (typeof img === 'string') {
          return img === imageUrl
        } else if (img && typeof img === 'object') {
          return img.fileUrl === imageUrl || img.preview === imageUrl
        }
        return false
      })
      
      if (index !== -1) {
        message.images.splice(index, 1)
        // 如果图片数组为空，删除images属性
        if (message.images.length === 0) {
          delete message.images
        }
      }
    }
  })
  ElMessage.success('图片已从消息中移除')
}

// 发送消息
const handleSend = async (messageText, useKnowledgeSearch = false, useWebSearch = false, imageList = []) => {
  if (!currentSessionId.value) {
    await createNewSession()
  }

  const { locationInfo, enhancedMessageText } = await resolveLocationForMessage(messageText)
  const imageData = imageList || []

  await nextTick()

  await sendMessage({
    messages,
    isLoading,
    messageText: enhancedMessageText,
    currentSessionId,
    images: imageData,
    enableRagSearch: useKnowledgeSearch || isKnowledgeSearch.value,
    enableWebSearch: useWebSearch || isWebSearch.value,
    deepThinking: isDeepThinking.value,
    locationInfo,
    onSessionsRefresh: loadSessions
  })
}


const selectSession = async (item) => {
  await selectSessionFromComposable({ session: item, messages })
  await nextTick()
  scrollToBottom()
}

const handleRenameSession = (payload) => {
  renameSession(payload)
}

const handleDeleteSession = async (sessionId) => {
  await deleteSessionFromComposable({ sessionId, messages })
}

onMounted(() => {
  loadSessions()
  // 添加欢迎消息
  messages.value.push({
    role: 'ai',
    content: '您好！我是AI聊天助手，有什么可以帮助您的吗？',
    timestamp: new Date()
  })
})

onUnmounted(() => {
  // 清理SSE连接
  chatService.close()
})
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1f1f1f;
}

.chat-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.message-divider {
  display: flex;
  justify-content: center;
  align-items: center;
  color: #a6a6a6;
  font-size: 12px;
  margin: 10px 0;
}

.message-divider span {
  background: #2a2a2a;
  padding: 2px 10px;
  border-radius: 10px;
}

.loading-message {
  display: flex;
  justify-content: flex-start;
  padding: 12px 16px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
