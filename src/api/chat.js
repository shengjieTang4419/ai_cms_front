export class ChatService {
    constructor() {
        this.eventSource = null
        this.mockTimeout = null
    }

    // 创建SSE连接进行知识库搜索流式聊天
    streamRagChat(message, onMessage, onError, onComplete, sessionId) {
        // 确保this上下文正确
        if (!this || typeof this.close !== 'function') {
            console.error('ChatService实例上下文丢失')
            onError(new Error('服务实例错误'))
            return
        }

        // 关闭之前的连接
        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }
        if (this.mockTimeout) {
            clearTimeout(this.mockTimeout)
            this.mockTimeout = null
        }

        const token = localStorage.getItem('token')

        // 使用知识库搜索接口
        try {
            // 对查询参数进行URL编码
            const encodedQuery = encodeURIComponent(message)
            const encodedSessionId = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''
            const url = `/api/aiChat/rag/streamChat?query=${encodedQuery}${encodedSessionId}`

            // 使用fetch获取流式响应
            this.fetchStreamResponse(url, onMessage, onError, onComplete)

        } catch (error) {
            console.error('知识库搜索请求失败:', error)
            onError(error)
        }
    }

    // 创建SSE连接进行流式聊天
    streamChat(message, onMessage, onError, onComplete, sessionId) {
        // 确保this上下文正确
        if (!this || typeof this.close !== 'function') {
            console.error('ChatService实例上下文丢失')
            onError(new Error('服务实例错误'))
            return
        }

        // 关闭之前的连接
        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }
        if (this.mockTimeout) {
            clearTimeout(this.mockTimeout)
            this.mockTimeout = null
        }

        const token = localStorage.getItem('token')

        // 优先尝试真实后端，即使有模拟token
        // 只有在真实后端失败时才使用模拟回复

        // 使用真实的后端接口
        try {
            // 对查询参数进行URL编码
            const encodedQuery = encodeURIComponent(message)
            const encodedSessionId = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''
            const url = `/api/aiChat/simple/streamChat?query=${encodedQuery}${encodedSessionId}`

            // 先尝试使用fetch获取数据，看看后端是否真的支持流式
            this.fetchStreamResponse(url, onMessage, onError, onComplete)

        } catch (error) {
            console.error('聊天请求失败:', error)
            onError(error)
        }
    }

    // 使用fetch获取流式响应
    async fetchStreamResponse(url, onMessage, onError, onComplete) {
        // 确保this上下文正确
        if (!this) {
            onError(new Error('服务实例错误'))
            return
        }

        try {
            console.log('开始fetch请求:', url)
            // 设置超时和重试逻辑
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

            const headers = {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache'
            }

            // 添加认证头
            const currentToken = localStorage.getItem('token')
            if (currentToken) {
                headers['Authorization'] = `Bearer ${currentToken}`
            }

            const response = await fetch(url, {
                headers,
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let lastActivity = Date.now()
            const heartbeatInterval = setInterval(() => {
                // 检查是否有活动，如果超过30秒没有数据，认为连接可能有问题
                if (Date.now() - lastActivity > 30000) {
                    console.warn('流式响应可能超时，关闭连接')
                    reader.cancel()
                    clearInterval(heartbeatInterval)
                    onError(new Error('流式响应超时'))
                    return
                }
            }, 5000)

            try {
                while (true) {
                    const { done, value } = await reader.read()

                    if (done) {
                        console.log('流式读取完成')
                        clearInterval(heartbeatInterval)
                        onComplete()
                        break
                    }

                    // 更新最后活动时间
                    lastActivity = Date.now()

                    // 解码数据
                    const chunk = decoder.decode(value, { stream: true })
                    buffer += chunk

                    // 按行分割数据
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || '' // 保留最后一个不完整的行

                    for (const line of lines) {
                        if (line.trim()) {
                            console.log('收到SSE数据行:', line)

                            // 处理SSE格式的数据
                            if (line.startsWith('data:')) {
                                const content = line.substring(5).trim() // 移除 'data:' 前缀
                                if (content && content !== '' && content !== '[DONE]') {
                                    console.log('发送内容到前端:', content)
                                    onMessage({ content })
                                } else if (content === '[DONE]') {
                                    console.log('流式响应完成')
                                    clearInterval(heartbeatInterval)
                                    onComplete()
                                    return
                                }
                            } else if (line.trim() === '') {
                                // 空行表示一个事件结束
                                continue
                            } else {
                                // 其他格式的数据直接发送
                                console.log('发送其他格式数据到前端:', line)
                                onMessage({ content: line })
                            }
                        }
                    }
                }
            } catch (readError) {
                clearInterval(heartbeatInterval)
                console.error('读取流式数据时出错:', readError)
                onError(readError)
            }
        } catch (error) {
            console.error('fetch流式请求失败:', error)
            if (error.name === 'AbortError') {
                onError(new Error('请求超时，请检查网络连接'))
            } else {
                onError(error)
            }
        }
    }

    // 关闭连接
    close() {
        // 确保this上下文正确
        if (!this) return

        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }
        if (this.mockTimeout) {
            clearTimeout(this.mockTimeout)
            this.mockTimeout = null
        }
    }
}

export const chatService = new ChatService()
