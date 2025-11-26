import request from './request'

/**
 * 获取个性化推荐
 * @param {number|string} userId - 用户 ID
 * @returns {Promise} 推荐结果
 */
export const getPersonalizedRecommendations = (userId) => {
    return request.get(`/recommendations/personalized/${userId}`)
}
