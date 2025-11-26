/**
 * 聊天服务工具函数和类型定义
 */

/**
 * 获取认证 Token，如果不存在则抛出错误
 * @returns {string} token
 * @throws {Error} 认证失败
 */
export function getAuthToken() {
    const token = localStorage.getItem('token')
    if (!token) {
        throw new Error('认证失败，请重新登录')
    }
    return token
}

/**
 * 构建带认证的请求头
 * @param {string} token - 认证 token
 * @returns {Object} headers
 */
export function buildAuthHeaders(token) {
    return {
        'Authorization': `Bearer ${token}`
    }
}

/**
 * 聊天请求参数类
 */
export class ChatRequestOptions {
    constructor({
        message,
        sessionId = null,
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

        return `/api/aiChat/${endpoint}/streamChat?query=${encodedQuery}${sessionParam}${imageParams}${searchParam}${thinkingParam}${locationParam}`
    }

    /**
     * 验证必需参数
     * @throws {Error} 缺少必需参数
     */
    validate() {
        if (!this.message) {
            throw new Error('消息内容不能为空')
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
