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
              <el-dropdown-item command="profile">个人信息</el-dropdown-item>
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
            <ChatMessage v-else :message="item.data" @image-deleted="handleImageDeleted" />
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

          <!-- 路线规划组件 -->
          <div class="hint-card">
            <div class="hint-icon">🗺️</div>
            <div class="hint-content">
              <h3>路线规划</h3>
              <p>支持多种出行方式的路线规划！</p>
              <div class="route-types">
                <span class="route-type-tag">🚗 驾车</span>
                <span class="route-type-tag">🚶 步行</span>
                <span class="route-type-tag">🚴 骑行</span>
              </div>
              <div class="hint-examples">
                <span class="example-tag" @click="fillExample('我现在开车去上海南站怎么走？')">"我现在开车去上海南站怎么走？"</span>
                <span class="example-tag" @click="fillExample('从上海外滩步行到东方明珠塔怎么走？')">"从上海外滩步行到东方明珠塔怎么走？"</span>
                <span class="example-tag" @click="fillExample('我现在骑行去上海浦江郊野公园怎么走？')">"我现在骑行去上海浦江郊野公园怎么走？"</span>
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
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { User, ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useLocationStore } from '../stores/location'
import { chatService } from '../api/chat'
import { getPersonalizedRecommendations } from '../api/recommendation'
import { getCurrentLocationWithAddress, isLocationRelatedQuery } from '../api/location'
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

// Session 级别的位置缓存
// 每个 session 开启时获取一次，多轮对话复用
const sessionLocation = ref(null)
const sidebarCollapsed = ref(false)
const sessions = ref([])
const isKnowledgeSearch = ref(false)
const isWebSearch = ref(false)
const isDeepThinking = ref(false)

const currentSessionId = ref('')
const historyLoaded = ref(false)
const images = ref([])

// 个性化推荐数据
const recommendations = ref([])
const loadingRecommendations = ref(false)

// 处理图片更新
const handleImagesUpdate = (newImages) => {
  images.value = newImages
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
  if ((!messageText && (!imageList || imageList.length === 0)) || isLoading.value) return

  // imageList 包含 { preview: base64, fileUrl: url } 或直接的 URL 字符串（历史记录）
  // 对于新发送的消息，使用包含 preview 的对象；对于历史记录，只有 URL 字符串
  const imageData = imageList || []
  
  // 提取 fileUrl 列表用于后端API调用
  const imageUrls = imageData.map(img => {
    return typeof img === 'string' ? img : img.fileUrl
  })

  // Session 级别的位置信息缓存
  // 策略：每个 session 首次需要时获取一次，之后复用
  let locationInfo = null
  let enhancedMessageText = messageText || ''
  
  // 检测用户是否明确要求使用当前位置
  const forceRefreshLocation = /当前位置|现在的位置|我现在在|我的位置/.test(messageText)
  
  // 通过后端 AI 智能判断是否需要位置信息
  const needLocationForQuery = await isLocationRelatedQuery(messageText)
  
  console.log('位置策略:', {
    message: messageText,
    needLocation: needLocationForQuery,
    hasSessionCache: !!sessionLocation.value,
    forceRefresh: forceRefreshLocation
  })
  
  if (messageText && needLocationForQuery) {
    // 优先使用 store 中的全局缓存
    if (locationStore.currentLocation && !forceRefreshLocation) {
      locationInfo = locationStore.currentLocation
      console.log('使用 store 缓存的位置信息:', locationInfo)
    } else if (sessionLocation.value && !forceRefreshLocation) {
      // 其次使用 session 级别缓存（兼容性）
      locationInfo = sessionLocation.value
      console.log('使用 session 缓存的位置信息:', locationInfo)
    } else {
      // 需要重新定位
      let loadingInstance = null
      try {
        // 显示定位加载提示
        loadingInstance = ElLoading.service({
          lock: false,
          text: forceRefreshLocation ? '正在刷新您的位置...' : '正在获取您的位置信息...',
          background: 'rgba(0, 0, 0, 0.7)'
        })
        
        // 使用 store 的 fetchLocation（带缓存管理）
        locationInfo = await locationStore.fetchLocation(forceRefreshLocation)
        
        // 关闭加载提示
        if (loadingInstance) {
          loadingInstance.close()
          loadingInstance = null
        }
        
        if (locationInfo) {
          // 同步到 session 级别缓存
          sessionLocation.value = locationInfo
          ElMessage.success(forceRefreshLocation ? '位置信息已刷新' : '位置信息获取成功')
        }
      } catch (error) {
        // 确保关闭加载提示
        if (loadingInstance) {
          loadingInstance.close()
        }
        
        console.error('定位失败:', error)
        
        // 提供详细的错误提示
        let errorMsg = '定位失败'
        let showDetailedGuide = false
        
        if (error.message) {
          if (error.message.includes('定位权限') || error.message.includes('PERMISSION_DENIED')) {
            errorMsg = '定位失败：请允许浏览器访问您的位置信息'
            showDetailedGuide = true
          } else if (error.message.includes('超时') || error.message.includes('TIMEOUT')) {
            errorMsg = '定位超时：请检查网络连接或稍后重试'
          } else if (error.message.includes('不可用') || error.message.includes('UNAVAILABLE')) {
            errorMsg = '定位服务不可用：您的设备可能不支持定位功能'
          } else {
            errorMsg = `定位失败：${error.message}`
          }
        }
        
        // 显示错误提示
        ElMessage.warning(errorMsg)
        
        // 如果是权限问题，显示详细设置指南
        if (showDetailedGuide) {
          setTimeout(() => {
            ElMessageBox.alert(
              'Chrome浏览器定位权限设置方法：\n\n' +
              '1. 点击地址栏左侧的锁图标（或信息图标）\n' +
              '2. 选择"网站设置"或"权限"\n' +
              '3. 找到"位置"选项，设置为"允许"\n' +
              '4. 刷新页面后重试\n\n' +
              '或者：\n' +
              '1. 点击浏览器右上角三个点菜单\n' +
              '2. 选择"设置" > "隐私和安全" > "网站设置"\n' +
              '3. 找到"位置"权限，设置为"允许"\n' +
              '4. 刷新页面后重试',
              '定位权限设置指南',
              {
                confirmButtonText: '知道了',
                type: 'info'
              }
            )
          }, 500)
        }
        
        // 定位失败不影响消息发送，继续正常流程
      }
    }
  }

  // 用户消息显示时只显示原始文本，不显示坐标信息
  const userMessage = {
    role: 'user',
    content: messageText || '(图片消息)', // 只显示原始消息，不显示坐标信息
    timestamp: new Date(),
    images: imageData, // 保存完整数据（包含 preview 和 fileUrl）
    locationInfo: locationInfo // 保存位置信息
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
    
    // 流式渲染控制变量
    let pendingContent = ''           // 待刷新的内容缓冲区
    let lastRefreshTime = Date.now()  // 上次刷新时间
    let refreshTimer = null           // 刷新定时器
    
    // 强制刷新函数：创建新对象触发 Markdown 渲染
    const forceRefresh = () => {
      if (pendingContent) {
        const currentMessage = messages.value[messageIndex]
        messages.value[messageIndex] = {
          ...currentMessage,
          content: currentMessage.content + pendingContent
        }
        pendingContent = ''
        lastRefreshTime = Date.now()
      }
    }
    
    try {
      // 若没有会话ID，则自动创建一个
      if (!currentSessionId.value) {
        createNewSession()
      }
      
      // 统一使用 streamChat，通过参数控制搜索类型
      const shouldUseKnowledgeSearch = useKnowledgeSearch || isKnowledgeSearch.value
      const shouldUseWebSearch = useWebSearch || isWebSearch.value

      chatService.streamChat({
        message: enhancedMessageText,
        sessionId: currentSessionId.value,
        images: imageUrls,
        enableRagSearch: shouldUseKnowledgeSearch,
        enableWebSearch: shouldUseWebSearch,
        deepThinking: isDeepThinking.value,
        location: locationInfo,
        onMessage: (data) => {
          // 处理流式数据
          if (data && data.content) {
            // 累加到缓冲区
            pendingContent += data.content
            
            // 清除之前的定时器
            if (refreshTimer) {
              clearTimeout(refreshTimer)
              refreshTimer = null
            }
            
            // 策略1：累积内容超过 80 字符，立即刷新
            // 策略2：否则设置 150ms 延迟刷新（debounce）
            const CHAR_THRESHOLD = 80    // 字符阈值
            const DEBOUNCE_DELAY = 150   // 延迟时间（毫秒）
            
            if (pendingContent.length >= CHAR_THRESHOLD) {
              // 超过阈值，立即刷新
              forceRefresh()
              scrollToBottom()
            } else {
              // 未超过阈值，设置延迟刷新
              refreshTimer = setTimeout(() => {
                forceRefresh()
                scrollToBottom()
              }, DEBOUNCE_DELAY)
            }
          }
        },
        onError: (error) => {
          // 清理定时器
          if (refreshTimer) {
            clearTimeout(refreshTimer)
            refreshTimer = null
          }
          
          // 刷新已接收的内容
          forceRefresh()
          
          console.error('聊天错误:', error)
          
          // 根据错误类型提供不同的提示
          let errorMessage = shouldUseKnowledgeSearch ? '知识库搜索失败，请重试' : '发送消息失败，请重试'
          if (error.message) {
            if (error.message.includes('认证失败') || error.message.includes('401')) {
              errorMessage = '登录已过期，请重新登录'
              setTimeout(() => {
                userStore.logout()
                router.push('/login')
              }, 2000)
            } else if (error.message.includes('权限不足') || error.message.includes('403')) {
              errorMessage = '权限不足，请联系管理员'
            } else if (error.message.includes('超时')) {
              errorMessage = shouldUseKnowledgeSearch ? '知识库搜索超时，请重试' : '请求超时，请检查网络连接'
            } else if (error.message.includes('连接被中断')) {
              errorMessage = '连接中断，请重试'
            } else {
              errorMessage = `${shouldUseKnowledgeSearch ? '知识库搜索' : '发送消息'}失败: ${error.message}`
            }
          }
          
          ElMessage.error(errorMessage)
          isLoading.value = false
        },
        onComplete: async () => {
          // 清理定时器
          if (refreshTimer) {
            clearTimeout(refreshTimer)
            refreshTimer = null
          }
          
          // 强制刷新剩余内容
          forceRefresh()
          
          // 完成
          isLoading.value = false
          
          // 等待 DOM 更新后滚动到底部
          await nextTick()
          scrollToBottom()
          
          // 重新加载会话列表，以显示新创建的会话
          await loadSessions()
        }
      })
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
  if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'logout') {
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
const createNewSession = async () => {
  try {
    const newId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    currentSessionId.value = newId
    // 新会话开始时清空当前对话内容
    messages.value = []
    historyLoaded.value = false
    // 清空 session 级别缓存
    sessionLocation.value = null
    
    // 新建会话时检查位置缓存是否过期
    // 只有过期时才重新获取，否则复用缓存（避免频繁定位）
    if (locationStore.isCacheExpired()) {
      // 缓存过期，后台静默获取位置
      try {
        console.log('新建会话，位置缓存已过期，重新获取位置...')
        await locationStore.fetchLocation(true) // 强制刷新
        console.log('新建会话位置刷新成功')
      } catch (error) {
        console.warn('新建会话位置刷新失败，不影响正常使用:', error)
        // 定位失败不影响会话创建
      }
    } else {
      console.log('新建会话，使用缓存的位置信息（未过期）')
    }
  } catch (e) {
    console.error(e)
  }
}

// 选择历史会话并加载对话
const selectSession = async (item) => {
  try {
    currentSessionId.value = item.sessionId
    // 切换 session 时清空 session 级别缓存（但保留 store 全局缓存）
    sessionLocation.value = null
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

        const message = {
          role: r.messageType === 'USER' ? 'user' : 'ai',
          content: r.content || '',
          timestamp,
          isRagEnhanced: r.isRagEnhanced || false,
          messageId: r.id
        }

        // 如果是用户消息且有图片URL，恢复图片显示
        // 注意：OCR结果不在这里，只恢复图片URL
        if (message.role === 'user' && r.imageUrls && Array.isArray(r.imageUrls) && r.imageUrls.length > 0) {
          // 将图片URL转换为前端需要的格式（字符串数组或对象数组）
          message.images = r.imageUrls.map(url => ({
            fileUrl: url,
            preview: url // 历史记录中，preview也使用URL（因为没有base64数据）
          }))
        }

        return message
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
  align-items: stretch;
  justify-content: center;
  padding: 40px 20px;
  gap: 20px;
  flex-wrap: nowrap;
}

.hint-card {
  background: #2a2a2a;
  border-radius: 16px;
  padding: 20px;
  flex: 1;
  min-width: 0;
  max-width: 380px;
  border: 1px solid #3a3a3a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
}

.hint-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.hint-icon {
  font-size: 40px;
  text-align: center;
  margin-bottom: 12px;
}

.hint-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hint-content h3 {
  color: #e6e6e6;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 10px 0;
  text-align: center;
}

.hint-content p {
  color: #b6b6b6;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 12px 0;
  text-align: center;
}

.hint-examples {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.example-tag {
  background: #3a3a3a;
  color: #d6d6d6;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  border: 1px solid #4a4a4a;
  transition: all 0.2s ease;
  cursor: pointer;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.example-tag:hover {
  background: #4a4a4a;
  border-color: #5a5a5a;
  transform: translateY(-1px);
}

/* 路线类型标签样式 */
.route-types {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.route-type-tag {
  background: #3a3a3a;
  color: #e6e6e6;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #4a4a4a;
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
  font-size: 12px;
  color: #e6e6e6;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 响应式设计 - 小屏幕时换行 */
@media (max-width: 1200px) {
  .feature-hints {
    flex-wrap: wrap;
  }
  
  .hint-card {
    max-width: 500px;
    min-width: 300px;
  }
}


</style>
