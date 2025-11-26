/**
 * 定位服务 - 使用浏览器原生定位API，更安全且不需要前端API Key
 */

import request from './request'

let amapLoader = null // 缓存 AMap 加载器

/**
 * 加载高德地图 JS SDK
 * 通过后端代理获取安全 Key，保证 API Key 不暴露在前端
 * @returns {Promise} 返回 AMap 实例
 */
async function loadAMapSDK() {
    if (amapLoader) {
        return amapLoader
    }

    try {
        // 从后端获取高德地图配置（包括安全 Key）
        const config = await request.get('/location/amap-config')
        const { key, securityJsCode } = config
        // 设置安全密钥
        if (securityJsCode) {
            window._AMapSecurityConfig = {
                securityJsCode
            }
        }

        // 动态加载高德 JS SDK
        amapLoader = new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Geolocation`
            script.async = true
            script.onload = () => resolve(window.AMap)
            script.onerror = () => reject(new Error('高德地图 SDK 加载失败'))
            document.head.appendChild(script)
        })
        return amapLoader
    } catch (error) {
        console.error('加载高德地图 SDK 失败:', error)
        throw error
    }
}

/**
 * 使用高德地图进行高精度定位
 * @param {Object} options 定位选项
 * @returns {Promise} 返回定位结果 {longitude, latitude, address}
 */
export async function getCurrentLocation(options = {}) {
    try {
        const AMap = await loadAMapSDK()
        return new Promise((resolve, reject) => {
            AMap.plugin('AMap.Geolocation', () => {
                const geolocation = new AMap.Geolocation({
                    enableHighAccuracy: true,  // 高精度定位
                    timeout: 10000,            // 10秒超时
                    needAddress: true,         // 需要详细地址
                    extensions: 'all',         // 返回完整信息
                    ...options
                })

                geolocation.getCurrentPosition((status, result) => {
                    if (status === 'complete') {
                        console.log('高德地图定位成功:', result)
                        resolve({
                            success: true,
                            longitude: result.position.lng.toString(),
                            latitude: result.position.lat.toString(),
                            accuracy: result.accuracy,
                            address: result.formattedAddress,
                            addressComponent: result.addressComponent,
                            timestamp: Date.now()
                        })
                    } else {
                        console.error('高德地图定位失败:', result)
                        reject({
                            success: false,
                            message: result.message || '定位失败',
                            errorCode: result.info,
                            error: result
                        })
                    }
                })
            })
        })
    } catch (error) {
        console.error('定位服务初始化失败:', error)
        throw error
    }
}

/**
 * 通过后端代理获取详细地址信息（逆地理编码）
 * @param {string} longitude 经度
 * @param {string} latitude 纬度
 * @returns {Promise} 返回详细地址信息
 */
export async function getDetailedAddress(longitude, latitude) {
    try {
        const response = await request.get('/location/coordinates', {
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
 * 执行完整的高精度定位流程
 * 高德 SDK 已自带地址信息，无需额外调用后端
 * @param {Object} options 定位选项
 * @returns {Promise} 返回完整的定位和地址信息
 */
export async function getCurrentLocationWithAddress(options = {}) {
    try {
        const result = await getCurrentLocation(options)
        return result
    } catch (error) {
        console.error('定位失败:', error)
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
        const result = await request.post('/location/check-location-need', { message })
        return result.needLocation || false
    } catch (error) {
        console.error('判断位置需求失败，默认不需要:', error)
        return false // 失败时默认不需要定位
    }
}
