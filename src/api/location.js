/**
 * 定位服务 - 使用浏览器原生定位API，更安全且不需要前端API Key
 */

/**
 * 使用浏览器原生Geolocation API进行定位
 * 无需高德地图API Key，更安全
 * @param {Object} options 定位选项
 * @returns {Promise} 返回定位结果 {longitude, latitude}
 */
export async function getCurrentLocation(options = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject({
                success: false,
                message: '您的浏览器不支持定位功能',
                errorCode: 'NOT_SUPPORTED'
            })
            return
        }

        const defaultOptions = {
            enableHighAccuracy: true,  // 高精度定位
            timeout: 10000,            // 10秒超时
            maximumAge: 0              // 不使用缓存
        }

        const geolocationOptions = { ...defaultOptions, ...options }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('浏览器定位成功:', position)
                resolve({
                    success: true,
                    longitude: position.coords.longitude.toString(),
                    latitude: position.coords.latitude.toString(),
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    heading: position.coords.heading,
                    speed: position.coords.speed,
                    timestamp: position.timestamp
                })
            },
            (error) => {
                console.error('浏览器定位失败:', error)

                let errorMessage = '定位失败'
                let errorCode = 'UNKNOWN'

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = '定位失败：用户拒绝了定位权限请求'
                        errorCode = 'PERMISSION_DENIED'
                        break
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = '定位失败：位置信息不可用'
                        errorCode = 'POSITION_UNAVAILABLE'
                        break
                    case error.TIMEOUT:
                        errorMessage = '定位超时：请检查网络连接'
                        errorCode = 'TIMEOUT'
                        break
                    default:
                        errorMessage = '定位失败：未知错误'
                        errorCode = 'UNKNOWN'
                        break
                }

                reject({
                    success: false,
                    message: errorMessage,
                    errorCode: errorCode,
                    error: error
                })
            },
            geolocationOptions
        )
    })
}

/**
 * 加载高德地图JS API（已废弃，不再使用）
 * @deprecated 使用浏览器原生定位API，不再需要高德地图JS API
 */
async function loadAMapScript() {
    throw new Error('已废弃：请使用浏览器原生定位API')
}

/**
 * 调用后端API获取详细地址信息
 * @param {string} longitude 经度
 * @param {string} latitude 纬度
 * @returns {Promise} 返回详细地址信息
 */
export async function getDetailedAddress(longitude, latitude) {
    const token = localStorage.getItem('token')
    if (!token) {
        throw new Error('认证失败，请重新登录')
    }

    try {
        const url = `/api/location/coordinates?longitude=${encodeURIComponent(longitude)}&latitude=${encodeURIComponent(latitude)}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`获取详细地址失败: ${response.status} ${errorText}`)
        }

        const data = await response.json()

        if (!data.success) {
            throw new Error(data.message || '获取详细地址失败')
        }

        return {
            success: true,
            data: data.data
        }
    } catch (error) {
        console.error('获取详细地址错误:', error)
        throw error
    }
}

/**
 * 执行完整的高精度定位流程：定位 -> 获取详细地址
 * @param {Object} options 定位选项
 * @param {boolean} skipAddress 是否跳过地址获取（仅返回经纬度），默认false
 * @returns {Promise} 返回完整的定位和地址信息（如果skipAddress为true，则只返回经纬度）
 */
export async function getCurrentLocationWithAddress(options = {}, skipAddress = false) {
    try {
        // 第一步：获取高精度定位
        const locationResult = await getCurrentLocation(options)

        if (!locationResult.success) {
            throw new Error(locationResult.message || '定位失败')
        }

        // 如果只需要经纬度，直接返回
        if (skipAddress) {
            return {
                success: true,
                longitude: locationResult.longitude,
                latitude: locationResult.latitude,
                accuracy: locationResult.accuracy
            }
        }

        // 第二步：调用后端获取详细地址
        const addressResult = await getDetailedAddress(
            locationResult.longitude,
            locationResult.latitude
        )

        if (!addressResult.success) {
            throw new Error(addressResult.message || '获取详细地址失败')
        }

        // 合并结果
        return {
            success: true,
            longitude: locationResult.longitude,
            latitude: locationResult.latitude,
            accuracy: locationResult.accuracy,
            address: addressResult.data.formattedAddress || locationResult.address,
            addressComponent: addressResult.data.addressComponent || {},
            rawLocationData: locationResult.rawData,
            rawAddressData: addressResult.data
        }
    } catch (error) {
        console.error('高精度定位流程失败:', error)
        throw error
    }
}

/**
 * 检测消息是否包含地理位置相关的咨询
 * @param {string} message 用户消息
 * @returns {boolean} 是否包含地理位置相关咨询
 */
export function isLocationRelatedQuery(message) {
    if (!message || typeof message !== 'string') {
        return false
    }

    // 如果明确包含"从...到"、"从...去"等模式，说明是路线规划问题，不是位置查询
    const explicitRoutePattern = /从[\s\S]{1,50}?(?:到|去|走|往|前往)[\s\S]{1,50}/
    if (explicitRoutePattern.test(message)) {
        return false
    }

    // 位置查询关键词（不包括路线规划相关的）
    const locationKeywords = [
        '位置', '定位', '地址', '在哪里', '我在哪', '当前位置', '当前地址',
        '附近', '周边', '距离', '多远', '多近',
        '我的位置', '当前位置', '定位我', '我在哪里', '我在什么地方'
    ]

    const lowerMessage = message.toLowerCase()
    return locationKeywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))
}

