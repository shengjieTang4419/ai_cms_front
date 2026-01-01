import request from './request'

export const login = (credentials) => {
    const userName = credentials?.userName || credentials?.username
    return request.post('/auth/login', {
        ...credentials,
        userName,
        username: userName
    })
}

export const register = (userData) => {
    return request.post('/auth/register', {
        userName: userData.userName,
        password: userData.password,
        email: userData.email
    })
}

export const getUserInfo = () => {
    return request.get('/auth/info')
}

export const submitUserProfile = (profileData) => {
    return request.post('/membership/user/profile', profileData)
}

export const getUserProfile = () => {
    return request.get('/membership/user/profile')
}
