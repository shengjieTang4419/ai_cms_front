/**
 * 全局常量配置
 */

/**
 * 位置缓存配置
 */
export const LOCATION_CONFIG = {
  // 位置缓存有效期（毫秒）
  // 默认 4 小时 = 4 * 60 * 60 * 1000 = 14400000 毫秒
  CACHE_MAX_AGE: 4 * 60 * 60 * 1000,
  
  // 位置精度要求（米）
  DESIRED_ACCURACY: 100,
  
  // 定位超时时间（毫秒）
  TIMEOUT: 15000
}

/**
 * API 配置
 */
export const API_CONFIG = {
  // API 基础路径
  BASE_URL: '/api',
  
  // 请求超时时间（毫秒）
  TIMEOUT: 30000
}

/**
 * 聊天配置
 */
export const CHAT_CONFIG = {
  // 最大历史消息数
  MAX_HISTORY_MESSAGES: 100,
  
  // 消息发送间隔（毫秒）
  MESSAGE_INTERVAL: 500
}
