import { SseClient } from './sse-client'
import { ChatRequestOptions, getAuthToken, buildAuthHeaders } from './chat-utils'

export class ChatService {
    constructor() {
        this.sseClient = new SseClient()
    }

    /**
     * 发起流式聊天（支持知识库搜索或普通聊天）
     * @param {Object} options - 聊天请求选项
     * @param {string} options.message - 消息内容
     * @param {string} options.sessionId - 会话 ID
     * @param {Array<string>} options.images - 图片 URL 列表
     * @param {boolean} options.enableWebSearch - 启用全网搜索
     * @param {boolean} options.enableRagSearch - 启用知识库搜索
     * @param {boolean} options.deepThinking - 深度思考模式
     * @param {Object} options.location - 位置信息 { longitude, latitude }
     * @param {Function} options.onMessage - 消息回调
     * @param {Function} options.onError - 错误回调
     * @param {Function} options.onComplete - 完成回调
     */
    streamChat(options) {
        const requestOptions = new ChatRequestOptions(options)
        
        try {
            // 验证参数
            requestOptions.validate()
            
            // 获取 Token
            const token = getAuthToken()
            
            // 根据搜索类型决定端点
            const endpoint = requestOptions.enableRagSearch ? 'rag' : 'simple'
            const url = requestOptions.buildUrl(endpoint)
            
            // 使用 SSE 客户端发起连接
            this.sseClient.open(url, {
                onMessage: requestOptions.onMessage,
                onError: requestOptions.onError,
                onComplete: requestOptions.onComplete,
                headers: buildAuthHeaders(token)
            })
        } catch (error) {
            console.error('聊天请求失败:', error)
            requestOptions.onError(error)
        }
    }

    /**
     * 关闭连接
     */
    close() {
        if (this.sseClient) {
            this.sseClient.close()
        }
    }
}

export const chatService = new ChatService()
