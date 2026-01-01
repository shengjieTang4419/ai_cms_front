/**
 * ASR（语音识别）API 服务
 * 职责：处理语音识别相关的所有API调用
 */
import { getAuthToken, buildAuthHeaders } from '../utils/auth'

const handleJsonResponse = async (response, errorPrefix) => {
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${errorPrefix}: ${response.status} ${errorText}`)
  }
  return response.json()
}

export class AsrService {
  /**
   * 识别音频文件
   * @param {Blob} audioBlob - 音频 Blob 对象
   * @param {string} filename - 文件名
   * @returns {Promise<{success: boolean, text?: string, message?: string}>}
   */
  async recognizeAudio(audioBlob, filename = 'recording.webm') {
    const token = getAuthToken()

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, filename)

      const response = await fetch('/api/aiChat/asr/recognize', {
        method: 'POST',
        headers: buildAuthHeaders(token),
        body: formData
      })

      const data = await handleJsonResponse(response, '语音识别失败')
      
      return {
        success: data.success,
        text: data.text,
        message: data.message
      }
    } catch (error) {
      console.error('语音识别错误:', error)
      throw error
    }
  }
}

export const asrService = new AsrService()
