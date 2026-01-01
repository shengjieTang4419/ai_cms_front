/**
 * 对话（会话管理）API 服务
 * 职责：处理会话列表、历史对话、会话操作等所有相关API调用
 */

/**
 * 获取用户会话列表
 * @param {Object} headers - 请求头（包含 Authorization 和 X-Device-ID）
 * @returns {Promise<Array>} 会话列表
 */
export const getUserSessions = (headers) => {
  return fetch('/api/aiChat/sessions/user', {
    headers
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(`获取会话列表失败: ${res.status} ${res.statusText}`)
    }
    return res.json()
  })
}

/**
 * 获取会话历史对话
 * @param {string} sessionId - 会话ID
 * @param {Object} headers - 请求头（包含 Authorization 和 X-Device-ID）
 * @returns {Promise<Array>} 历史对话记录
 */
export const getSessionHistory = (sessionId, headers) => {
  return fetch(`/api/aiChat/dialogue/history/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    headers
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(`获取历史对话失败: ${res.status} ${res.statusText}`)
    }
    return res.json()
  })
}

/**
 * 删除会话
 * @param {string} sessionId - 会话ID
 * @param {Object} headers - 请求头（包含 Authorization 和 X-Device-ID）
 * @returns {Promise<boolean>} 删除是否成功
 */
export const deleteSession = (sessionId, headers) => {
  return fetch(`/api/aiChat/dialogue/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error('删除会话失败')
    }
    return true
  })
}

/**
 * 重命名会话（预留接口）
 * @param {string} sessionId - 会话ID
 * @param {string} title - 新标题
 * @param {Object} headers - 请求头（包含 Authorization 和 X-Device-ID）
 * @returns {Promise<boolean>} 重命名是否成功
 */
export const renameSession = (sessionId, title, headers) => {
  return fetch(`/api/aiChat/dialogue/${encodeURIComponent(sessionId)}/rename`, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error('重命名会话失败')
    }
    return true
  })
}
