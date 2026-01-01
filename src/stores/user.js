import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getUserInfo } from '../api/auth'

export const useUserStore = defineStore('user', () => {
    const user = ref(null)
    const accessToken = ref(localStorage.getItem('access_token'))
    const refreshToken = ref(localStorage.getItem('refresh_token'))

    const isAuthenticated = computed(() => !!accessToken.value)

    const setUser = (userData) => {
        user.value = userData
    }

    const setTokens = (accessTokenValue, refreshTokenValue) => {
        accessToken.value = accessTokenValue
        refreshToken.value = refreshTokenValue
        
        if (accessTokenValue) {
            localStorage.setItem('access_token', accessTokenValue)
        } else {
            localStorage.removeItem('access_token')
        }
        
        if (refreshTokenValue) {
            localStorage.setItem('refresh_token', refreshTokenValue)
        } else {
            localStorage.removeItem('refresh_token')
        }
    }

    const loginUser = async (credentials) => {
        try {
            const response = await login(credentials)
            
            // 后端返回格式：{ code: 200, data: { access_token, refresh_token, ... } }
            const tokenData = response.data || response
            
            // 根据新的Token策略设置双token
            const { access_token, refresh_token, device_type, strategy } = tokenData
            
            setTokens(access_token, refresh_token)
            
            // 显示设备策略信息（可选）
            console.log(`登录成功 - ${strategy}`)
            
            // 设置用户信息（暂时使用基本信息，后续可以通过getUserInfo获取）
            setUser({
                userName: credentials.userName || credentials.username,
                deviceType: device_type,
                strategy: strategy
            })
            
            return response
        } catch (error) {
            throw error
        }
    }

    const registerUser = async (userData) => {
        try {
            const response = await register(userData)
            // 注册成功后，需要用户手动登录
            return response
        } catch (error) {
            throw error
        }
    }

    const logout = async () => {
        // 先保存 token，用于异步调用后端
        const token = accessToken.value
        
        // 立即清除本地状态（立即生效）
        setUser(null)
        setTokens(null, null)

        // 异步调用后端 logout，不阻塞前端
        if (token) {
            fetch('/api/auth/doLogout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Device-ID': localStorage.getItem('device_id') || ''
                }
            }).catch(error => {
                console.warn('后端logout接口调用失败:', error)
                // 失败也不影响前端退出
            })
        }
    }

    const checkAuth = async () => {
        if (accessToken.value) {
            try {
                const userData = await getUserInfo()
                setUser(userData)
            } catch (error) {
                // Token可能过期，清除本地数据
                logout()
            }
        }
    }

    return {
        user,
        accessToken,
        refreshToken,
        isAuthenticated,
        setUser,
        setTokens,
        loginUser,
        registerUser,
        logout,
        checkAuth
    }
})
