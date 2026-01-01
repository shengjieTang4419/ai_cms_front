/**
 * 认证工具函数
 * 职责：处理所有认证相关的通用操作
 * 可被所有 API 模块复用
 */

 import DeviceInfoUtils from './deviceInfo'

/**
 * 获取认证 Token，如果不存在则抛出错误
 * @returns {string} token
 * @throws {Error} 认证失败
 */
export function getAuthToken() {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('认证失败，请重新登录')
  }
  return token
}

/**
 * 构建带认证的请求头
 * @param {string} token - 认证 token
 * @returns {Object} headers
 */
export function buildAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'X-Device-ID': DeviceInfoUtils.getDeviceId()
  }
}

/**
 * 检查是否已登录
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!localStorage.getItem('access_token')
}

/**
 * 清除认证信息
 */
export function clearAuth() {
  localStorage.removeItem('token')
}
