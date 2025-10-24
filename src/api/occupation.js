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

/**
 * 获取所有职业列表
 */
export const getAllOccupations = () => {
    return api.get('/occupations')
}

/**
 * 根据职业代码获取职业信息
 */
export const getOccupationByCode = (code) => {
    return api.get(`/occupations/${code}`)
}

/**
 * 根据职业代码获取标签列表
 */
export const getTagsByCode = (code) => {
    return api.get(`/occupations/${code}/tags`)
}

