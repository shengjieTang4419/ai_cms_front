import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getUserInfo } from '../api/auth'

export const useUserStore = defineStore('user', () => {
    const user = ref(null)
    const token = ref(localStorage.getItem('token'))

    const isAuthenticated = computed(() => !!token.value)

    const setUser = (userData) => {
        user.value = userData
    }

    const setToken = (tokenValue) => {
        token.value = tokenValue
        if (tokenValue) {
            localStorage.setItem('token', tokenValue)
        } else {
            localStorage.removeItem('token')
        }
    }

    const loginUser = async (credentials) => {
        try {
            const response = await login(credentials)
            // 根据API返回的数据结构设置token和用户信息
            setToken(response.token)
            setUser({
                id: response.id,
                username: response.username,
                email: response.email
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

    const logout = () => {
        setUser(null)
        setToken(null)
    }

    const checkAuth = async () => {
        if (token.value) {
            try {
                const userData = await getUserInfo()
                setUser(userData)
            } catch (error) {
                logout()
            }
        }
    }

    return {
        user,
        token,
        isAuthenticated,
        setUser,
        setToken,
        loginUser,
        registerUser,
        logout,
        checkAuth
    }
})
