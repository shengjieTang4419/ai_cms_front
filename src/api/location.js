/**
 * 定位 API 服务
 * 职责：处理定位相关的API调用
 */
import request from './request'

// 重新导出地理定位服务（向后兼容）
export { getCurrentLocation, getCurrentLocationWithAddress } from '../services/geolocation'

/**
 * 通过后端代理获取详细地址信息（逆地理编码）
 * @param {string} longitude 经度
 * @param {string} latitude 纬度
 * @returns {Promise} 返回详细地址信息
 */
export async function getDetailedAddress(longitude, latitude) {
    try {
        const response = await request.get('/aiChat/location/coordinates', {
            params: { longitude, latitude }
        })
        return {
            success: true,
            data: response
        }
    } catch (error) {
        console.error('获取详细地址错误:', error)
        throw error
    }
}


/**
 * 通过后端 AI 智能判断是否需要位置信息
 * 替代前端关键词匹配，更准确、更智能
 * @param {string} message 用户消息
 * @returns {Promise<boolean>} 是否需要位置信息
 */
export async function isLocationRelatedQuery(message) {
    if (!message || typeof message !== 'string') {
        return false
    }

    try {
        // 调用后端 AI 判断接口
        const result = await request.post('/aiChat/location/check-location-need', { message })
        return result.needLocation || false
    } catch (error) {
        console.error('判断位置需求失败，默认不需要:', error)
        return false // 失败时默认不需要定位
    }
}
