import request from './request'

export const login = (credentials) => {
    return request.post('/auth/login', credentials)
}

export const register = (userData) => {
    return request.post('/auth/register', userData)
}

export const getUserInfo = () => {
    return request.get('/auth/user')
}

export const submitUserProfile = (profileData) => {
    return request.post('/user/profile', profileData)
}

export const getUserProfile = () => {
    return request.get('/user/profile')
}
