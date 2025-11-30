/**
 * SSE 流式客户端 - 封装所有流式响应的底层细节
 * 通用工具类，不依赖任何业务逻辑
 */
export class SseClient {
    constructor() {
        this.abortController = null
        this.heartbeatInterval = null
        this.timeoutId = null
    }

    /**
     * 打开 SSE 连接并监听流式数据
     * @param {string} url - 请求 URL
     * @param {Object} options - 配置选项
     * @param {Function} options.onMessage - 消息回调 (data) => void
     * @param {Function} options.onError - 错误回调 (error) => void
     * @param {Function} options.onComplete - 完成回调 () => void
     * @param {Object} options.headers - 自定义请求头
     * @param {number} options.timeout - 超时时间（毫秒），默认 120000
     * @param {number} options.heartbeatInterval - 心跳检测间隔（毫秒），默认 10000
     */
    async open(url, { onMessage, onError, onComplete, headers = {}, timeout = 120000, heartbeatInterval = 10000 } = {}) {
        // 关闭之前的连接
        this.close()

        this.abortController = new AbortController()
        
        // 设置请求超时
        this.timeoutId = setTimeout(() => {
            console.warn('SSE 请求超时，取消连接')
            this.abortController.abort()
        }, timeout)

        try {
            console.log('开始 SSE 请求:', url)

            const defaultHeaders = {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...headers
            }

            const response = await fetch(url, {
                headers: defaultHeaders,
                signal: this.abortController.signal
            })

            clearTimeout(this.timeoutId)

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
            }

            await this._processStream(response, { onMessage, onError, onComplete, heartbeatInterval })
        } catch (error) {
            this._cleanup()
            this._handleError(error, onError)
        }
    }

    /**
     * 处理流式响应
     * @private
     */
    async _processStream(response, { onMessage, onError, onComplete, heartbeatInterval }) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let lastActivity = Date.now()
        let hasReceivedData = false

        // 启动心跳检测
        this._startHeartbeat(reader, lastActivity, hasReceivedData, onError, heartbeatInterval)

        try {
            while (true) {
                const { done, value } = await reader.read()

                if (done) {
                    console.log('SSE 流式读取完成')
                    this._cleanup()
                    onComplete()
                    break
                }

                // 更新活动时间
                lastActivity = Date.now()
                hasReceivedData = true

                // 解码并处理数据
                const chunk = decoder.decode(value, { stream: true })
                buffer += chunk

                // 按行分割处理 SSE 数据
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    this._processLine(line, onMessage, onComplete)
                }
            }
        } catch (readError) {
            this._cleanup()
            if (readError.name === 'AbortError') {
                onError(new Error('连接被中断'))
            } else {
                onError(readError)
            }
        }
    }

    /**
     * 处理单行 SSE 数据
     * @private
     */
    _processLine(line, onMessage, onComplete) {
        if (!line.trim()) return

        if (line.startsWith('data:')) {
            const content = line.substring(5)
            
            if (content.trim() === '[DONE]') {
                this._cleanup()
                onComplete()
            } else if (content.trim() === '') {
                // 空的 data: 行 = 换行符
                onMessage({ content: '\n' })
            } else {
                // 正常内容
                onMessage({ content: content.trim() })
            }
        } else if (line.trim() !== '') {
            // 其他格式数据直接发送
            onMessage({ content: line })
        }
    }

    /**
     * 启动心跳检测
     * @private
     */
    _startHeartbeat(reader, lastActivity, hasReceivedData, onError, interval) {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now()
            const timeSinceLastActivity = now - lastActivity

            // 60秒无数据且已收到数据，认为连接异常
            if (timeSinceLastActivity > 60000 && hasReceivedData) {
                console.warn('SSE 长时间无数据，关闭连接')
                reader.cancel()
                this._cleanup()
                onError(new Error('流式响应超时，请重试'))
                return
            }

            // 2分钟完全无数据，强制关闭
            if (timeSinceLastActivity > 120000) {
                console.warn('SSE 完全超时，关闭连接')
                reader.cancel()
                this._cleanup()
                onError(new Error('连接超时，请检查网络'))
                return
            }
        }, interval)
    }

    /**
     * 错误处理
     * @private
     */
    _handleError(error, onError) {
        console.error('SSE 请求失败:', error)

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

    /**
     * 清理资源
     * @private
     */
    _cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = null
        }
    }

    /**
     * 关闭连接
     */
    close() {
        if (this.abortController) {
            this.abortController.abort()
            this.abortController = null
        }
        this._cleanup()
    }
}
