import axios from 'axios'
import DeviceInfoUtils from '../utils/deviceInfo.js'

/**
 * 创建统一的 axios 实例
 * 集成Token管理器和设备信息
 */
const request = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': DeviceInfoUtils.getDeviceId()
    }
})

// 简化的Token管理器集成
let isRefreshing = false
let requestQueue = []

// 请求拦截器 - 自动添加 token 和设备信息
request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        
        // 确保设备ID是最新的
        config.headers['X-Device-ID'] = DeviceInfoUtils.getDeviceId()
        
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器 - 统一处理错误和Token预警
request.interceptors.response.use(
    (response) => {
        handleTokenWarning(response)
        return response.data
    },
    async (error) => {
        if (error.response?.status === 401) {
            // 检查是否是设备变化导致的401
            const errorMessage = error.response.data?.msg || ''
            if (errorMessage.includes('检测到设备变化') || errorMessage.includes('设备变化')) {
                // 设备变化，直接跳转登录页面
                handleDeviceChange()
                return Promise.reject(error)
            }
            // 其他401错误，尝试刷新Token
            return handleTokenExpired(error.config)
        }
        return Promise.reject(error)
    }
)

/**
 * 处理设备变化
 */
function handleDeviceChange() {
    console.warn('检测到设备变化，跳转登录页面')
    
    // 清除本地存储
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.clear()
    
    // 显示提示信息
    if (typeof window !== 'undefined' && window.ElMessage) {
        window.ElMessage.warning('检测到设备变化，请重新登录')
    }
    
    // 跳转到登录页面
    setTimeout(() => {
        window.location.href = '/login'
    }, 1000)
}

/**
 * 处理Token预警响应头
 */
function handleTokenWarning(response) {
    const tokenWarning = response.headers['x-token-warning']
    const tokenRemaining = response.headers['x-token-remaining']

    if (tokenWarning === 'expiring-soon') {
        console.log(`Token即将过期，剩余时间: ${tokenRemaining}秒`)
        
        // 如果没有正在刷新，则主动刷新Token
        if (!isRefreshing) {
            refreshTokenProactively()
        }
    }
}

/**
 * 主动刷新Token（收到预警时）
 */
async function refreshTokenProactively() {
    if (isRefreshing) return

    isRefreshing = true
    
    try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
            throw new Error('RefreshToken不存在')
        }

        const response = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken
        })

        const { access_token, refresh_token: newRefreshToken } = response.data
        
        // 更新本地存储
        localStorage.setItem('access_token', access_token)
        if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken)
        }
        
        console.log('Token预警刷新成功')

    } catch (error) {
        console.error('Token预警刷新失败:', error)
        handleRefreshFailure()
    } finally {
        isRefreshing = false
        processRequestQueue()
    }
}

/**
 * 处理Token过期（401响应）
 */
async function handleTokenExpired(originalConfig) {
    // 如果已经在刷新，将请求加入队列
    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            requestQueue.push({ config: originalConfig, resolve, reject })
        })
    }

    isRefreshing = true

    try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
            throw new Error('RefreshToken不存在')
        }

        const response = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken
        })

        const { access_token, refresh_token: newRefreshToken } = response.data
        
        // 更新本地存储
        localStorage.setItem('access_token', access_token)
        if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken)
        }
        
        console.log('Token过期刷新成功')

        // 重试原请求
        originalConfig.headers.Authorization = `Bearer ${access_token}`
        return axios(originalConfig)

    } catch (error) {
        console.error('Token过期刷新失败:', error)
        handleRefreshFailure()
        throw error
    } finally {
        isRefreshing = false
        processRequestQueue()
    }
}

/**
 * 处理刷新失败的情况
 */
function handleRefreshFailure() {
    // 清除本地Token
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    
    // 清空请求队列
    requestQueue.forEach(({ reject }) => {
        reject(new Error('Token刷新失败，请重新登录'))
    })
    requestQueue = []
    
    // 跳转到登录页面
    setTimeout(() => {
        window.location.href = '/login'
    }, 1000)
}

/**
 * 处理等待队列中的请求
 */
function processRequestQueue() {
    requestQueue.forEach(({ config, resolve, reject }) => {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
            resolve(axios(config))
        } else {
            reject(new Error('Token刷新失败'))
        }
    })
    requestQueue = []
}

export default request
