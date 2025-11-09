export class ChatService {
    constructor() {
        this.eventSource = null
        this.mockTimeout = null
    }

    // 上传图片（文件对象格式）- 调用 /api/images/upload
    async uploadImageFile(file, userId = 1) {
        const token = localStorage.getItem('token')
        if (!token) {
            throw new Error('认证失败，请重新登录')
        }

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('userId', userId.toString())

            const response = await fetch('/api/images/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`图片上传失败: ${response.status} ${errorText}`)
            }

            const data = await response.json()
            if (data.success) {
                return {
                    success: true,
                    fileUrl: data.fileUrl,
                    ocrResult: data.ocr || null
                }
            } else {
                throw new Error(data.message || '图片上传失败')
            }
        } catch (error) {
            console.error('图片上传错误:', error)
            throw error
        }
    }

    // 上传图片（base64格式）
    async uploadImage(base64Data, contentType = 'image/png') {
        const token = localStorage.getItem('token')
        if (!token) {
            throw new Error('认证失败，请重新登录')
        }

        try {
            const formData = new FormData()
            formData.append('base64', base64Data)
            formData.append('contentType', contentType)
            formData.append('userId', '1')

            const response = await fetch('/api/images/upload/base64', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`图片上传失败: ${response.status} ${errorText}`)
            }

            const data = await response.json()
            if (data.success) {
                return data.fileUrl
            } else {
                throw new Error(data.message || '图片上传失败')
            }
        } catch (error) {
            console.error('图片上传错误:', error)
            throw error
        }
    }

    // 删除图片
    async deleteImage(fileUrl) {
        const token = localStorage.getItem('token')
        if (!token) {
            throw new Error('认证失败，请重新登录')
        }

        try {
            const url = `/api/images/delete?fileUrl=${encodeURIComponent(fileUrl)}`

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`图片删除失败: ${response.status} ${errorText}`)
            }

            const data = await response.json()

            if (data.success) {
                return true
            } else {
                throw new Error(data.message || '图片删除失败')
            }
        } catch (error) {
            throw error
        }
    }

    // 批量上传图片
    async uploadImages(base64ImageList) {
        try {
            const uploadPromises = base64ImageList.map(base64Data => {
                // 从base64中提取contentType
                const match = base64Data.match(/^data:([^;]+);base64,(.+)$/)
                const contentType = match ? match[1] : 'image/png'
                return this.uploadImage(base64Data, contentType)
            })

            const imageUrls = await Promise.all(uploadPromises)
            return imageUrls
        } catch (error) {
            console.error('批量上传图片错误:', error)
            throw error
        }
    }

    // 创建SSE连接进行知识库搜索流式聊天
    streamRagChat(message, imageList, onMessage, onError, onComplete, sessionId, isWithEnableSearch = false, isDeepThinking = false, location = null) {
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

        // 检查token是否存在
        if (!token) {
            console.error('未找到认证token')
            onError(new Error('认证失败，请重新登录'))
            return
        }

        // 使用知识库搜索接口
        try {
            // 对查询参数进行URL编码
            const encodedQuery = encodeURIComponent(message)
            const encodedSessionId = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''

            // 添加图片参数（现在传递URL而不是base64）
            let imageParams = ''
            if (imageList && imageList.length > 0) {
                imageParams = imageList.map(img => `&imageUrl=${encodeURIComponent(img)}`).join('')
            }

            // 注意：知识库搜索和全网搜索互斥，所以这里不传isWithEnableSearch
            const thinkingParam = isDeepThinking ? `&isDeepThinking=true` : ''
            // 添加location参数（如果提供）
            const locationParam = location && location.longitude && location.latitude 
                ? `&longitude=${encodeURIComponent(location.longitude)}&latitude=${encodeURIComponent(location.latitude)}` 
                : ''
            const url = `/api/aiChat/rag/streamChat?query=${encodedQuery}${encodedSessionId}${imageParams}${thinkingParam}${locationParam}`

            console.log('发送知识库搜索请求到:', url, '深度思考:', isDeepThinking)
            // 使用fetch获取流式响应
            this.fetchStreamResponse(url, onMessage, onError, onComplete)

        } catch (error) {
            console.error('知识库搜索请求失败:', error)
            onError(error)
        }
    }

    // 创建SSE连接进行流式聊天
    streamChat(message, imageList, onMessage, onError, onComplete, sessionId, isWithEnableSearch = false, isDeepThinking = false, location = null) {
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

        // 检查token是否存在
        if (!token) {
            console.error('未找到认证token')
            onError(new Error('认证失败，请重新登录'))
            return
        }

        // 使用真实的后端接口
        try {
            // 对查询参数进行URL编码
            const encodedQuery = encodeURIComponent(message)
            const encodedSessionId = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''

            // 添加图片参数（现在传递URL而不是base64）
            let imageParams = ''
            if (imageList && imageList.length > 0) {
                imageParams = imageList.map(img => `&imageUrl=${encodeURIComponent(img)}`).join('')
            }

            const searchParam = isWithEnableSearch ? `&isWithEnableSearch=true` : ''
            const thinkingParam = isDeepThinking ? `&isDeepThinking=true` : ''
            // 添加location参数（如果提供）
            const locationParam = location && location.longitude && location.latitude 
                ? `&longitude=${encodeURIComponent(location.longitude)}&latitude=${encodeURIComponent(location.latitude)}` 
                : ''
            const url = `/api/aiChat/simple/streamChat?query=${encodedQuery}${encodedSessionId}${imageParams}${searchParam}${thinkingParam}${locationParam}`

            console.log('发送聊天请求到:', url, '图片数量:', imageList ? imageList.length : 0, '全网搜索:', isWithEnableSearch, '深度思考:', isDeepThinking)
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

        let heartbeatInterval = null
        let timeoutId = null

        try {
            console.log('开始fetch请求:', url)

            // 设置更长的超时时间，因为AI生成可能需要更长时间
            const controller = new AbortController()
            timeoutId = setTimeout(() => {
                console.warn('请求超时，取消连接')
                controller.abort()
            }, 120000) // 2分钟超时

            const headers = {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }

            // 添加认证头
            const currentToken = localStorage.getItem('token')
            if (currentToken) {
                headers['Authorization'] = `Bearer ${currentToken}`
                console.log('已添加认证头:', currentToken.substring(0, 20) + '...')
            } else {
                console.warn('未找到认证token')
            }

            const response = await fetch(url, {
                headers,
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('HTTP错误响应:', response.status, errorText)
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let lastActivity = Date.now()
            let hasReceivedData = false

            // 设置心跳检测，但频率降低
            heartbeatInterval = setInterval(() => {
                const now = Date.now()
                const timeSinceLastActivity = now - lastActivity

                // 如果超过60秒没有数据，且已经收到过数据，认为连接可能有问题
                if (timeSinceLastActivity > 60000 && hasReceivedData) {
                    console.warn('流式响应长时间无数据，关闭连接')
                    reader.cancel()
                    clearInterval(heartbeatInterval)
                    onError(new Error('流式响应超时，请重试'))
                    return
                }

                // 如果超过2分钟完全没有数据，也关闭连接
                if (timeSinceLastActivity > 120000) {
                    console.warn('流式响应完全超时，关闭连接')
                    reader.cancel()
                    clearInterval(heartbeatInterval)
                    onError(new Error('连接超时，请检查网络'))
                    return
                }
            }, 10000) // 每10秒检查一次

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
                    hasReceivedData = true

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
                                    console.log('收到完成信号，结束流式响应')
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
                if (readError.name === 'AbortError') {
                    onError(new Error('连接被中断'))
                } else {
                    onError(readError)
                }
            }
        } catch (error) {
            console.error('fetch流式请求失败:', error)
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval)
            }
            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (error.name === 'AbortError') {
                onError(new Error('请求超时，请检查网络连接'))
            } else if (error.message.includes('401')) {
                onError(new Error('认证失败，请重新登录'))
            } else if (error.message.includes('403')) {
                onError(new Error('权限不足，请联系管理员'))
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

// 获取个性化推荐
export const getPersonalizedRecommendations = async (userId) => {
    const token = localStorage.getItem('token')
    if (!token) {
        throw new Error('认证失败，请重新登录')
    }

    const response = await fetch(`/api/recommendations/personalized/${userId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    return response.json()
}

export const chatService = new ChatService()
