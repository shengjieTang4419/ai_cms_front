import { SseClient } from '../utils/sse-client'
import { getAuthToken, buildAuthHeaders } from '../utils/auth'

/**
 * 聊天请求参数类
 */
class ChatRequestOptions {
  constructor({
    message,
    sessionId = null,
    dialogueId = null,
    images = [],
    enableWebSearch = false,
    enableRagSearch = false,
    deepThinking = false,
    location = null,
    onMessage,
    onError,
    onComplete
  } = {}) {
    this.message = message
    this.sessionId = sessionId
    this.dialogueId = dialogueId
    this.images = images
    this.enableWebSearch = enableWebSearch
    this.enableRagSearch = enableRagSearch
    this.deepThinking = deepThinking
    this.location = location
    this.onMessage = onMessage
    this.onError = onError
    this.onComplete = onComplete
  }

  /**
   * 构建查询 URL
   * @param {string} endpoint - API 端点 ('simple' 或 'rag')
   * @returns {string} 完整的查询 URL
   */
  buildUrl(endpoint = 'simple') {
    const encodedQuery = encodeURIComponent(this.message)
    const sessionParam = this.sessionId ? `&sessionId=${encodeURIComponent(this.sessionId)}` : ''
    const dialogueParam = this.dialogueId ? `&dialogueId=${encodeURIComponent(this.dialogueId)}` : ''
    
    // 图片参数
    const imageParams = this.images.length > 0 
      ? this.images.map(img => `&imageUrl=${encodeURIComponent(img)}`).join('') 
      : ''
    
    // 搜索参数（仅在 simple 模式下）
    const searchParam = endpoint === 'simple' && this.enableWebSearch 
      ? '&isWithEnableSearch=true' 
      : ''
    
    // 深度思考参数
    const thinkingParam = this.deepThinking ? '&isDeepThinking=true' : ''
    
    // 位置参数
    const locationParam = this.location?.longitude && this.location?.latitude
      ? `&longitude=${encodeURIComponent(this.location.longitude)}&latitude=${encodeURIComponent(this.location.latitude)}`
      : ''

    return `/api/aiChat/${endpoint}/streamChat?query=${encodedQuery}${sessionParam}${dialogueParam}${imageParams}${searchParam}${thinkingParam}${locationParam}`
  }

  /**
   * 验证必需参数
   * @throws {Error} 缺少必需参数
   */
  validate() {
    if (!this.message) {
      throw new Error('消息内容不能为空')
    }
    if (!this.dialogueId) {
      throw new Error('缺少对话ID')
    }
    if (!this.onMessage || typeof this.onMessage !== 'function') {
      throw new Error('必须提供 onMessage 回调函数')
    }
    if (!this.onError || typeof this.onError !== 'function') {
      throw new Error('必须提供 onError 回调函数')
    }
    if (!this.onComplete || typeof this.onComplete !== 'function') {
      throw new Error('必须提供 onComplete 回调函数')
    }
  }
}

export class ChatService {
    constructor() {
        this.sseClient = new SseClient()
    }

    /**
     * 发起流式聊天（支持知识库搜索或普通聊天）∏
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
