import request from './request'

/**
 * 获取所有职业列表
 */
export const getAllOccupations = () => {
    return request.get('/aiChat/occupations')
}

/**
 * 根据职业代码获取职业信息
 */
export const getOccupationByCode = (code) => {
    return request.get(`/aiChat/occupations/${code}`)
}

/**
 * 根据职业代码获取标签列表
 */
export const getTagsByCode = (code) => {
    return request.get(`/aiChat/occupations/${code}/tags`)
}

