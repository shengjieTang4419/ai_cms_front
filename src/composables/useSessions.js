import { ref } from 'vue'

export function useSessions({
  getUserSessions,
  getSessionHistory,
  deleteSessionApi,
  splitThinkingAnswer,
  locationStore,
  clearSessionLocation,
  ElMessage
} = {}) {
  const sessions = ref([])
  const currentSessionId = ref('')
  const historyLoaded = ref(false)

  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const deviceId = localStorage.getItem('device_id')
      const headers = {
        'Content-Type': 'application/json'
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      if (deviceId) {
        headers['X-Device-ID'] = deviceId
      }

      const data = await getUserSessions(headers)

      if (!Array.isArray(data)) {
        throw new Error('会话列表数据格式错误')
      }

      const sessionsWithTitles = await Promise.all(
        data.map(async (session) => {
          if (session.title && session.title.trim()) {
            return session
          }

          try {
            const history = await getSessionHistory(session.sessionId, headers)
            const firstUserMessage = Array.isArray(history)
              ? history.find(msg => msg && msg.user && msg.user.messageType === 'USER' ? msg.user : msg.messageType === 'USER')
              : null

            const content = firstUserMessage?.content || firstUserMessage?.user?.content
            if (content) {
              const title = content.substring(0, 20) + (content.length > 20 ? '...' : '')
              return { ...session, title }
            }
          } catch (e) {
            console.warn(`无法获取会话 ${session.sessionId} 的标题:`, e)
          }

          return { ...session, title: '未命名会话' }
        })
      )

      sessions.value = sessionsWithTitles
    } catch (e) {
      console.error('加载会话列表失败:', e)
      ElMessage && ElMessage.error(`加载历史会话失败: ${e.message}`)
      sessions.value = []
    }
  }

  const createNewSession = async ({ messages } = {}) => {
    try {
      const newId = (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

      currentSessionId.value = newId
      if (messages) {
        messages.value = []
      }
      historyLoaded.value = false

      clearSessionLocation && clearSessionLocation()

      if (locationStore && locationStore.isCacheExpired && locationStore.isCacheExpired()) {
        try {
          await locationStore.fetchLocation(true)
        } catch (error) {
          console.warn('新建会话位置刷新失败，不影响正常使用:', error)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const selectSession = async ({ session, messages }) => {
    try {
      currentSessionId.value = session.sessionId
      clearSessionLocation && clearSessionLocation()

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        'X-Device-ID': localStorage.getItem('device_id') || ''
      }

      const records = await getSessionHistory(session.sessionId, headers)
      if (!Array.isArray(records)) {
        throw new Error('历史对话数据格式错误')
      }

      const isGroupedTurn = records.length > 0 && records[0] && ('user' in records[0] || 'assistant' in records[0] || 'recommendations' in records[0])
      if (!isGroupedTurn) {
        throw new Error('历史对话数据格式错误')
      }

      const flattenChatMessage = (r) => {
        if (!r || !r.messageType) return null
        const timestamp = r.createdAt ? new Date(r.createdAt) : new Date()

        const message = {
          role: r.messageType === 'USER' ? 'user' : 'ai',
          content: r.content || '',
          thinking: '',
          timestamp,
          dialogueId: r.dialogueId,
          isRagEnhanced: r.isRagEnhanced || false,
          messageId: r.id,
          messageType: r.messageType
        }

        if (message.role === 'ai' && message.messageType === 'ASSISTANT' && message.content) {
          const { thinking, answer } = splitThinkingAnswer(message.content)
          message.thinking = thinking
          message.content = answer
        }

        if (message.role === 'user' && r.imageUrls && Array.isArray(r.imageUrls) && r.imageUrls.length > 0) {
          message.images = r.imageUrls.map(url => ({
            fileUrl: url,
            preview: url
          }))
        }

        return message
      }

      const flat = records.flatMap(turn => {
        const items = []
        const userMsg = flattenChatMessage(turn.user)
        const assistantMsg = flattenChatMessage(turn.assistant)
        if (assistantMsg && turn.recommendations && turn.recommendations.content) {
          let topics = []
          try {
            topics = JSON.parse(turn.recommendations.content || '[]')
          } catch (e) {
            topics = []
          }
          assistantMsg.topics = Array.isArray(topics) ? topics : []
        }
        if (userMsg) items.push(userMsg)
        if (assistantMsg) items.push(assistantMsg)
        return items
      }).filter(Boolean)

      flat.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      if (messages) {
        messages.value = flat
      }
      historyLoaded.value = true
    } catch (e) {
      console.error('加载会话历史失败:', e)
      ElMessage && ElMessage.error(`加载会话历史失败: ${e.message}`)
      if (messages) {
        messages.value = []
      }
      historyLoaded.value = false
    }
  }

  const deleteSession = async ({ sessionId, messages }) => {
    try {
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        'X-Device-ID': localStorage.getItem('device_id') || ''
      }
      await deleteSessionApi(sessionId, headers)

      sessions.value = sessions.value.filter(s => s.sessionId !== sessionId)

      if (currentSessionId.value === sessionId) {
        currentSessionId.value = ''
        if (messages) {
          messages.value = []
        }
        historyLoaded.value = false
      }

      ElMessage && ElMessage.success('会话删除成功')
    } catch (e) {
      console.error(e)
      ElMessage && ElMessage.error('删除会话失败')
    }
  }

  const renameSession = ({ sessionId, title }) => {
    const target = sessions.value.find(s => s.sessionId === sessionId)
    if (target) {
      target.title = title
    }
  }

  return {
    sessions,
    currentSessionId,
    historyLoaded,
    loadSessions,
    createNewSession,
    selectSession,
    deleteSession,
    renameSession
  }
}
