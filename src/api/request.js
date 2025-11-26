import axios from 'axios'

/**
 * 创建统一的 axios 实例
 * 自动注入 token、处理 401 跳转
 */
const request = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器 - 自动添加 token
request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器 - 统一处理错误
request.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default request
