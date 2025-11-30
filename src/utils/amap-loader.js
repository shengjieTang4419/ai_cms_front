/**
 * 高德地图 SDK 加载器
 * 职责：动态加载高德地图 JS SDK
 * 通用工具，不包含业务逻辑
 */
import request from '../api/request'

let amapLoader = null // 缓存 AMap 加载器

/**
 * 加载高德地图 JS SDK
 * 通过后端代理获取安全 Key，保证 API Key 不暴露在前端
 * @returns {Promise} 返回 AMap 实例
 */
export async function loadAMapSDK() {
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
 * 清除 SDK 缓存（用于测试或重新加载）
 */
export function clearAMapCache() {
  amapLoader = null
}
