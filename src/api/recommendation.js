import request from './request'

/**
 * 获取个性化推荐
 * @param {number|string} userId - 用户 ID
 * @returns {Promise} 推荐结果
 */
export const getPersonalizedRecommendations = (userId) => {
    return request.get(`/aiChat/recommendations/personalized`).then((res) => {
        return res && typeof res === 'object' && 'data' in res ? res.data : res
    })
}

/**
 * 获取对话完成后的话题引导（3个）
 * @param {string} sessionId - 会话ID
 * @param {string} dialogueId - 对话ID
 * @returns {Promise<Array<string>>} 话题引导列表
 */
export const getUserInterests = (sessionId, dialogueId) => {
    return request.get(`/aiChat/recommendations/recommendations`, {
        params: { sessionId, dialogueId }
    }).then((res) => {
        return res && typeof res === 'object' && 'data' in res ? res.data : res
    })
}
