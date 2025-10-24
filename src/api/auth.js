import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// 响应拦截器
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export const login = (credentials) => {
    return api.post('/auth/login', credentials)
}

export const register = (userData) => {
    return api.post('/auth/register', userData)
}

export const getUserInfo = () => {
    return api.get('/auth/user')
}

export const submitUserProfile = (profileData) => {
    return api.post('/user/profile', profileData)
}
