/**
 * 地理定位服务
 * 职责：处理定位相关的业务逻辑
 */
import { loadAMapSDK } from '../utils/amap-loader'

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
