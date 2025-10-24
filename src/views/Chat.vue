<template>
  <div class="chat-container">
    <!-- 头部 -->
    <div class="chat-header">
      <div class="header-left">
        <h1>AI聊天助手</h1>
      </div>
      <div class="header-right">
        <el-dropdown @command="handleCommand">
          <el-button type="text" class="user-button">
            <el-icon><User /></el-icon>
            {{ userStore.user?.username }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主体：左侧固定会话栏 + 右侧聊天区 -->
    <div class="chat-body">
      <!-- 左侧固定会话栏 -->
      <ChatSidebar 
        v-model:collapsed="sidebarCollapsed"
        :sessions="sessions"
        :current-session-id="currentSessionId"
        @new-session="createNewSession"
        @select-session="selectSession"
        @session-action="handleSessionAction"
      />

      <!-- 右侧聊天区 -->
      <div class="chat-main">
        <!-- 消息列表 -->
        <div v-if="messages.length > 0" class="chat-messages" ref="messagesContainer">
          <template v-for="(item, index) in renderedMessages" :key="index">
            <div v-if="item.type === 'divider'" class="message-divider">
              <span>{{ item.text }}</span>
            </div>
            <ChatMessage v-else :message="item.data" />
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
        <div v-if="messages.length === 0" class="feature-hints">
          <div class="hint-card">
            <div class="hint-icon">🌤️</div>
            <div class="hint-content">
              <h3>天气查询</h3>
              <p>现在支持天气查询功能！您可以询问任何城市的天气情况。</p>
              <div class="hint-examples">
                <span class="example-tag" @click="fillExample('北京今天天气怎么样？')">"北京今天天气怎么样？"</span>
                <span class="example-tag" @click="fillExample('上海今天会下雨吗？')">"上海今天会下雨吗？"</span>
              </div>
            </div>
          </div>

          <!-- 猜你喜欢组件 -->
          <div class="hint-card">
            <div class="hint-icon">💡</div>
            <div class="hint-content">
              <h3>猜你喜欢</h3>
              <p v-if="loadingRecommendations">正在加载推荐内容...</p>
              <p v-else-if="recommendations.length === 0">暂无推荐内容</p>
              <div v-else class="hint-examples">
                <span 
                  v-for="(item, index) in recommendations" 
                  :key="index"
                  class="example-tag recommendation-tag" 
                  @click="fillExample(item.question)"
                  :title="item.label ? `${item.label}` : ''"
                >
                  <span v-if="item.label" class="tag-label">{{ item.label }}</span>
                  <span class="tag-question">{{ item.question }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <ChatInput 
          v-model="inputMessage"
          :is-hero-mode="messages.length === 0"
          :is-loading="isLoading"
          @send="handleSend"
          @knowledge-search-toggle="handleKnowledgeSearchToggle"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { chatService, getPersonalizedRecommendations } from '../api/chat'
import ChatSidebar from '../components/ChatSidebar.vue'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'

const router = useRouter()
const userStore = useUserStore()


const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesContainer = ref()
const sidebarCollapsed = ref(false)
const sessions = ref([])
const isKnowledgeSearch = ref(false)

const currentSessionId = ref('')
const historyLoaded = ref(false)

// 个性化推荐数据
const recommendations = ref([])
const loadingRecommendations = ref(false)

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

// 处理知识库搜索切换
const handleKnowledgeSearchToggle = (isActive) => {
  isKnowledgeSearch.value = isActive
}

// 发送消息
const handleSend = async (messageText, useKnowledgeSearch = false) => {
  if (!messageText || isLoading.value) return

  const userMessage = {
    role: 'user',
    content: messageText,
    timestamp: new Date()
  }
  
  messages.value.push(userMessage)
  
  // 滚动到底部
  await nextTick()
  scrollToBottom()
  
  // 延迟一下再开始AI回复，避免Element Plus组件更新冲突
  setTimeout(() => {
    // 开始AI回复
    isLoading.value = true
    
    const aiMessage = {
      role: 'ai',
      content: '',
      timestamp: new Date()
    }
    messages.value.push(aiMessage)
    const messageIndex = messages.value.length - 1
    
    try {
      console.log('开始发送消息:', messageText, '知识库搜索:', useKnowledgeSearch || isKnowledgeSearch.value)
      // 若没有会话ID，则自动创建一个
      if (!currentSessionId.value) {
        createNewSession()
      }
      
      // 根据知识库搜索状态调用不同的接口
      const shouldUseKnowledgeSearch = useKnowledgeSearch || isKnowledgeSearch.value

      if (shouldUseKnowledgeSearch) {
        chatService.streamRagChat(

        messageText,
        (data) => {
          // 处理流式数据
          if (data && data.content && data.content.trim() !== '') {
            messages.value[messageIndex].content += data.content
            scrollToBottom()
          }
        },
        (error) => {
          console.error('知识库搜索错误:', error)
          
          // 根据错误类型提供不同的提示
          let errorMessage = '知识库搜索失败，请重试'
          if (error.message) {
            if (error.message.includes('认证失败') || error.message.includes('401')) {
              errorMessage = '登录已过期，请重新登录'
              // 自动跳转到登录页
              setTimeout(() => {
                userStore.logout()
                router.push('/login')
              }, 2000)
            } else if (error.message.includes('权限不足') || error.message.includes('403')) {
              errorMessage = '权限不足，请联系管理员'
            } else if (error.message.includes('超时')) {
              errorMessage = '知识库搜索超时，请重试'
            } else if (error.message.includes('连接被中断')) {
              errorMessage = '连接中断，请重试'
            } else {
              errorMessage = `知识库搜索失败: ${error.message}`
            }
          }
          
          ElMessage.error(errorMessage)
          isLoading.value = false
        },
        async () => {
          // 完成
          isLoading.value = false
          
          // 强制刷新消息以确保Markdown正确渲染
          await nextTick()
          const lastMessage = messages.value[messageIndex]
          if (lastMessage) {
            // 创建新对象以触发响应式更新，确保Markdown完全渲染
            const content = lastMessage.content
            messages.value[messageIndex] = { ...lastMessage, content }
          }
          
          // 再次等待DOM更新
          await nextTick()
          scrollToBottom()
          
          // 重新加载会话列表，以显示新创建的会话
          await loadSessions()
          console.log('流式响应完成，已刷新会话列表和Markdown渲染')
        },
        currentSessionId.value
        )
      } else {
        chatService.streamChat(
          messageText,
          (data) => {
            // 处理流式数据
            if (data && data.content && data.content.trim() !== '') {
              messages.value[messageIndex].content += data.content
              scrollToBottom()
            }
          },
          (error) => {
            console.error('聊天错误:', error)
            
            // 根据错误类型提供不同的提示
            let errorMessage = '发送消息失败，请重试'
            if (error.message) {
              if (error.message.includes('认证失败') || error.message.includes('401')) {
                errorMessage = '登录已过期，请重新登录'
                // 自动跳转到登录页
                setTimeout(() => {
                  userStore.logout()
                  router.push('/login')
                }, 2000)
              } else if (error.message.includes('权限不足') || error.message.includes('403')) {
                errorMessage = '权限不足，请联系管理员'
              } else if (error.message.includes('超时')) {
                errorMessage = '请求超时，请检查网络连接'
              } else if (error.message.includes('连接被中断')) {
                errorMessage = '连接中断，请重试'
              } else {
                errorMessage = `发送消息失败: ${error.message}`
              }
            }
            
            ElMessage.error(errorMessage)
            isLoading.value = false
          },
          async () => {
            // 完成
            isLoading.value = false
            
            // 强制刷新消息以确保Markdown正确渲染
            await nextTick()
            const lastMessage = messages.value[messageIndex]
            if (lastMessage) {
              // 创建新对象以触发响应式更新，确保Markdown完全渲染
              const content = lastMessage.content
              messages.value[messageIndex] = { ...lastMessage, content }
            }
            
            // 再次等待DOM更新
            await nextTick()
            scrollToBottom()
            
            // 重新加载会话列表，以显示新创建的会话
            await loadSessions()
            console.log('流式响应完成，已刷新会话列表和Markdown渲染')
          },
          currentSessionId.value
        )
      }
    } catch (error) {
      console.error('聊天错误:', error)
      ElMessage.error('发送消息失败，请重试')
      isLoading.value = false
    }
  }, 100)
}



const formatSessionTime = (timestamp) => {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return d.toLocaleString('zh-CN', { hour12: false })
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 处理用户操作
const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      userStore.logout()
      router.push('/login')
    } catch {
      // 用户取消
    }
  }
}

// 获取会话列表
const loadSessions = async () => {
  try {
    const token = localStorage.getItem('token')
    const headers = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch('/api/chat/sessions/user', {
      headers
    })

    if (!res.ok) {
      throw new Error(`获取会话列表失败: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()

    // 验证响应数据
    if (!Array.isArray(data)) {
      throw new Error('会话列表数据格式错误')
    }

    // 为每个会话生成标题（如果没有标题，则使用第一条用户消息的前20个字符）
    const sessionsWithTitles = await Promise.all(
      data.map(async (session) => {
        if (session.title && session.title.trim()) {
          return session
        }

        // 如果没有标题，尝试获取第一条用户消息作为标题
        try {
          const historyRes = await fetch(`/api/dialogue/history/${encodeURIComponent(session.sessionId)}`, {
            headers,
            method: 'GET'
          })

          if (historyRes.ok) {
            const history = await historyRes.json()
            const firstUserMessage = Array.isArray(history)
              ? history.find(msg => msg.messageType === 'USER')
              : null

            if (firstUserMessage && firstUserMessage.content) {
              const title = firstUserMessage.content.substring(0, 20) +
                (firstUserMessage.content.length > 20 ? '...' : '')
              return { ...session, title }
            }
          }
        } catch (e) {
          console.warn(`无法获取会话 ${session.sessionId} 的标题:`, e)
        }

        return { ...session, title: '未命名会话' }
      })
    )

    sessions.value = sessionsWithTitles
    console.log(`成功加载 ${sessionsWithTitles.length} 个会话`)
  } catch (e) {
    console.error('加载会话列表失败:', e)
    ElMessage.error(`加载历史会话失败: ${e.message}`)
    sessions.value = []
  }
}

// 新增会话
const createNewSession = () => {
  try {
    const newId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    currentSessionId.value = newId
    // 新会话开始时清空当前对话内容
    messages.value = []
    historyLoaded.value = false
  } catch (e) {
    console.error(e)
  }
}

// 选择历史会话并加载对话
const selectSession = async (item) => {
  try {
    currentSessionId.value = item.sessionId
    // 加载历史对话 - 使用新的GET接口
    const url = `/api/dialogue/history/${encodeURIComponent(item.sessionId)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    })

    if (!res.ok) {
      throw new Error(`获取历史对话失败: ${res.status} ${res.statusText}`)
    }

    const records = await res.json()

    // 验证响应数据
    if (!Array.isArray(records)) {
      throw new Error('历史对话数据格式错误')
    }

    // 将数据转换为消息格式，按时间排序
    const flat = records
      .filter(r => r && r.messageType && r.content) // 过滤有效记录
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // 按时间排序
      .map(r => {
        const timestamp = r.createdAt ? new Date(r.createdAt) : new Date()

        return {
          role: r.messageType === 'USER' ? 'user' : 'ai',
          content: r.content || '',
          timestamp,
          isRagEnhanced: r.isRagEnhanced || false,
          messageId: r.id
        }
      })

    // 验证是否至少有一条消息
    if (flat.length === 0) {
      console.log('该会话暂无对话记录')
    }

    messages.value = flat
    historyLoaded.value = true

    await nextTick()
    scrollToBottom()

    console.log(`成功加载会话 ${item.sessionId} 的 ${flat.length} 条历史消息`)
  } catch (e) {
    console.error('加载会话历史失败:', e)
    ElMessage.error(`加载会话历史失败: ${e.message}`)

    // 加载失败时，重置状态
    messages.value = []
    historyLoaded.value = false
  }
}

// 处理会话操作
const handleSessionAction = async (command, item) => {
  switch (command) {
    case 'rename':
      await renameSession(item)
      break
    case 'share':
      await shareSession(item)
      break
    case 'delete':
      await deleteSession(item.sessionId)
      break
  }
}

// 重命名会话
const renameSession = async (item) => {
  try {
    const { value: newTitle } = await ElMessageBox.prompt('请输入新的会话名称', '重命名会话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: item.title || '未命名会话',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return '会话名称不能为空'
        }
        return true
      }
    })
    
    // 这里可以调用重命名接口
    // const url = `/api/dialogue/${encodeURIComponent(item.sessionId)}/rename`
    // await fetch(url, { method: 'PUT', body: JSON.stringify({ title: newTitle }) })
    
    // 暂时只更新本地数据
    item.title = newTitle.trim()
    ElMessage.success('重命名成功')
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('重命名失败')
    }
  }
}

// 分享会话
const shareSession = async (item) => {
  try {
    // 这里可以实现分享功能，比如生成分享链接
    const shareUrl = `${window.location.origin}/chat?session=${item.sessionId}`
    
    // 复制到剪贴板
    await navigator.clipboard.writeText(shareUrl)
    ElMessage.success('分享链接已复制到剪贴板')
  } catch (e) {
    console.error(e)
    ElMessage.error('分享失败')
  }
}

// 删除会话
const deleteSession = async (sessionId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个会话吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const url = `/api/dialogue/${encodeURIComponent(sessionId)}`
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除会话失败')
    
    // 从会话列表中移除
    sessions.value = sessions.value.filter(s => s.sessionId !== sessionId)
    
    // 如果删除的是当前会话，清空消息
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = ''
      messages.value = []
      historyLoaded.value = false
    }
    
    ElMessage.success('会话删除成功')
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
      ElMessage.error('删除会话失败')
    }
  }
}

// 加载个性化推荐
const loadRecommendations = async () => {
  try {
    loadingRecommendations.value = true
    const userId = userStore.user?.id || 1 // 从用户store中获取用户ID，默认为1
    const data = await getPersonalizedRecommendations(userId)
    
    // 处理返回的数据，支持 generatedQuestions 格式
    if (data && data.generatedQuestions && Array.isArray(data.generatedQuestions)) {
      // 处理 "标签 -> 问题" 格式的数据
      recommendations.value = data.generatedQuestions.map(item => {
        // 如果是字符串格式 "标签 -> 问题"，提取问题部分
        if (typeof item === 'string' && item.includes('->')) {
          const parts = item.split('->')
          return {
            label: parts[0].trim(),
            question: parts[1].trim(),
            fullText: item
          }
        }
        return {
          label: '',
          question: item,
          fullText: item
        }
      })
    } else if (Array.isArray(data)) {
      recommendations.value = data.map(item => ({
        label: '',
        question: item,
        fullText: item
      }))
    } else if (data && data.recommendations && Array.isArray(data.recommendations)) {
      recommendations.value = data.recommendations.map(item => ({
        label: '',
        question: item,
        fullText: item
      }))
    } else {
      recommendations.value = []
    }
    
    console.log('成功加载个性化推荐:', recommendations.value)
  } catch (error) {
    console.error('加载个性化推荐失败:', error)
    // 不显示错误消息，保持静默失败
    recommendations.value = []
  } finally {
    loadingRecommendations.value = false
  }
}

onMounted(() => {
  loadSessions()
  loadRecommendations() // 加载推荐内容
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

.chat-header {
  background: white;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left h1 {
  color: #333;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.user-button {
  color: #666;
  font-size: 14px;
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

/* 功能提示区域样式 */
.feature-hints {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 20px;
  flex-wrap: wrap;
}

.hint-card {
  background: #2a2a2a;
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  flex: 1;
  min-width: 400px;
  border: 1px solid #3a3a3a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hint-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.hint-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: 16px;
}

.hint-content h3 {
  color: #e6e6e6;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px 0;
  text-align: center;
}

.hint-content p {
  color: #b6b6b6;
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 20px 0;
  text-align: center;
}

.hint-examples {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-tag {
  background: #3a3a3a;
  color: #d6d6d6;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  border: 1px solid #4a4a4a;
  transition: all 0.2s ease;
  cursor: pointer;
}

.example-tag:hover {
  background: #4a4a4a;
  border-color: #5a5a5a;
  transform: translateY(-1px);
}

/* 推荐标签样式 */
.recommendation-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.tag-label {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.tag-question {
  flex: 1;
  font-size: 13px;
  color: #e6e6e6;
  line-height: 1.4;
}


</style>
