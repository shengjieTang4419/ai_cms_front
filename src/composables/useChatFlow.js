import { createThinkingStreamProcessor } from '../utils/thinking'

function createDialogueId() {
  try {
    return (crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  } catch (e) {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export function useChatFlow({
  chatService,
  getUserInterests,
  scrollToBottom,
  onStreamErrorMessage
} = {}) {
  const sendMessage = async ({
    messages,
    isLoading,
    messageText,
    currentSessionId,
    images = [],
    enableRagSearch,
    enableWebSearch,
    deepThinking,
    locationInfo,
    onSessionsRefresh
  }) => {
    if ((!messageText && (!images || images.length === 0)) || isLoading.value) return

    const dialogueId = createDialogueId()

    const userMessage = {
      role: 'user',
      content: messageText || '(图片消息)',
      timestamp: new Date(),
      dialogueId,
      images,
      locationInfo
    }

    messages.value.push(userMessage)
    scrollToBottom && scrollToBottom()

    isLoading.value = true

    const useThinkingMode = Boolean(deepThinking)

    const aiMessage = {
      role: 'ai',
      content: '',
      thinking: '',
      timestamp: new Date(),
      dialogueId
    }
    messages.value.push(aiMessage)
    const messageIndex = messages.value.length - 1

    let pendingContent = ''
    let refreshTimer = null

    const forceRefresh = () => {
      if (useThinkingMode) return
      if (!pendingContent) return
      const currentMessage = messages.value[messageIndex]
      if (!currentMessage) {
        pendingContent = ''
        return
      }
      messages.value[messageIndex] = {
        ...currentMessage,
        content: (currentMessage.content || '') + pendingContent
      }
      pendingContent = ''
    }

    const thinkingProcessor = createThinkingStreamProcessor({
      onThinking: (txt) => {
        const currentMessage = messages.value[messageIndex]
        if (!currentMessage) return
        messages.value[messageIndex] = {
          ...currentMessage,
          thinking: (currentMessage.thinking || '') + txt
        }
      },
      onAnswer: (txt) => {
        const currentMessage = messages.value[messageIndex]
        if (!currentMessage) return
        messages.value[messageIndex] = {
          ...currentMessage,
          content: (currentMessage.content || '') + txt
        }
      }
    })

    const clearRefreshTimer = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }
    }

    try {
      chatService.streamChat({
        message: messageText,
        sessionId: currentSessionId.value,
        dialogueId,
        images: images.map(img => (typeof img === 'string' ? img : img.fileUrl || img)),
        enableRagSearch,
        enableWebSearch,
        deepThinking,
        location: locationInfo,
        onMessage: (data) => {
          if (!data || !data.content) return

          if (useThinkingMode) {
            thinkingProcessor.push(data.content)
            scrollToBottom && scrollToBottom()
            return
          }

          pendingContent += data.content
          clearRefreshTimer()

          const CHAR_THRESHOLD = 80
          const DEBOUNCE_DELAY = 150

          if (pendingContent.length >= CHAR_THRESHOLD) {
            forceRefresh()
            scrollToBottom && scrollToBottom()
          } else {
            refreshTimer = setTimeout(() => {
              forceRefresh()
              scrollToBottom && scrollToBottom()
            }, DEBOUNCE_DELAY)
          }
        },
        onError: (error) => {
          clearRefreshTimer()
          forceRefresh()
          isLoading.value = false
          onStreamErrorMessage && onStreamErrorMessage(error)
        },
        onComplete: async () => {
          clearRefreshTimer()

          if (!useThinkingMode) {
            forceRefresh()
          } else {
            thinkingProcessor.flush()
          }

          isLoading.value = false

          try {
            const guides = await getUserInterests(currentSessionId.value, dialogueId)
            if (Array.isArray(guides) && guides.length > 0) {
              const currentMessage = messages.value[messageIndex]
              if (currentMessage) {
                messages.value[messageIndex] = {
                  ...currentMessage,
                  topics: guides.slice(0, 3)
                }
              }
            }
          } catch (e) {
          }

          scrollToBottom && scrollToBottom()
          onSessionsRefresh && (await onSessionsRefresh())
        }
      })
    } catch (error) {
      isLoading.value = false
      onStreamErrorMessage && onStreamErrorMessage(error)
    }
  }

  return {
    sendMessage
  }
}
