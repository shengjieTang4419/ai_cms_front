import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCurrentLocationWithAddress } from '../services/geolocation'
import { LOCATION_CONFIG } from '../config/constants'

/**
 * 位置信息 Store
 * 管理应用级别的位置缓存，避免频繁定位
 * 
 * 缓存策略：
 * 1. 位置信息缓存在 store 中，包含创建时间
 * 2. 每次新建会话时检查是否过期（默认 4 小时）
 * 3. 如果过期，在新建会话时重新获取位置
 * 4. 未过期则复用缓存，避免频繁定位
 */
export const useLocationStore = defineStore('location', () => {
    // 当前缓存的位置信息
    const currentLocation = ref(null)
    
    // 是否正在定位中
    const isLocating = ref(false)
    
    // 位置信息创建时间戳（用于判断是否过期）
    const locationTimestamp = ref(null)

    /**
     * 获取当前位置
     * @param {boolean} forceRefresh - 是否强制刷新（忽略缓存）
     * @returns {Promise} 位置信息
     */
    const fetchLocation = async (forceRefresh = false) => {
        // 如果有缓存且不强制刷新，直接返回缓存
        if (!forceRefresh && currentLocation.value) {
            console.log('使用缓存的位置信息:', currentLocation.value)
            return currentLocation.value
        }

        // 如果正在定位中，等待定位完成
        if (isLocating.value) {
            console.log('定位进行中，等待结果...')
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!isLocating.value) {
                        clearInterval(checkInterval)
                        resolve(currentLocation.value)
                    }
                }, 100)
            })
        }

        // 开始定位
        isLocating.value = true
        try {
            console.log('开始获取位置信息...')
            const location = await getCurrentLocationWithAddress()
            
            if (location && location.success) {
                // 缓存位置信息，包含时间戳
                const now = Date.now()
                currentLocation.value = {
                    longitude: location.longitude,
                    latitude: location.latitude,
                    address: location.address,
                    addressComponent: location.addressComponent,
                    accuracy: location.accuracy
                }
                locationTimestamp.value = now
                console.log('位置信息获取成功并已缓存，时间戳:', new Date(now).toLocaleString())
                return currentLocation.value
            } else {
                throw new Error(location?.message || '定位失败')
            }
        } catch (error) {
            console.error('获取位置信息失败:', error)
            throw error
        } finally {
            isLocating.value = false
        }
    }

    /**
     * 检查缓存是否过期
     * @param {number} maxAge - 最大缓存时间（毫秒），默认使用配置的 4 小时
     * @returns {boolean} 是否过期
     */
    const isCacheExpired = (maxAge = LOCATION_CONFIG.CACHE_MAX_AGE) => {
        if (!locationTimestamp.value || !currentLocation.value) {
            console.log('位置缓存检查: 无缓存数据')
            return true
        }
        
        const now = Date.now()
        const age = now - locationTimestamp.value
        const expired = age > maxAge
        
        console.log('位置缓存检查:', {
            缓存时间: new Date(locationTimestamp.value).toLocaleString(),
            当前时间: new Date(now).toLocaleString(),
            缓存年龄: `${Math.floor(age / 1000 / 60)} 分钟`,
            过期阈值: `${Math.floor(maxAge / 1000 / 60)} 分钟`,
            是否过期: expired
        })
        
        return expired
    }

    /**
     * 清空位置缓存
     * 在登出时调用
     */
    const clearLocation = () => {
        console.log('清空位置缓存')
        currentLocation.value = null
        locationTimestamp.value = null
    }

    return {
        currentLocation,
        isLocating,
        locationTimestamp,
        fetchLocation,
        isCacheExpired,
        clearLocation
    }
})
