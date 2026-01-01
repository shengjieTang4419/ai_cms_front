/**
 * 录音功能的组合式函数
 * 职责：管理录音状态、控制录音流程、处理错误
 * 使用 RecordRTC 录制 WAV 格式，符合阿里云 ASR 要求
 */
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { asrService } from '../api/asr'
import RecordRTC, { StereoAudioRecorder } from 'recordrtc'

// 常量配置
const CONFIG = {
  MAX_DURATION: 60, // 最长录音时长（秒）
  SAMPLE_RATE: 16000, // 采样率，符合阿里云要求
  FILENAME: 'recording.wav' // WAV 格式
}

// 错误消息映射
const ERROR_MESSAGES = {
  'NotAllowedError': '请允许浏览器访问麦克风',
  'PermissionDeniedError': '请允许浏览器访问麦克风',
  'NotFoundError': '未检测到麦克风设备',
  'default': '无法启动录音'
}

export function useVoiceRecorder() {
  // 状态管理
  const isRecording = ref(false)
  const isProcessing = ref(false)
  const recordingDuration = ref(0)

  // 录音相关
  let recorder = null  // RecordRTC 实例
  let recordingTimer = null
  let audioStream = null

  /**
   * 开始录音
   */
  const startRecording = async () => {
    try {
      // 请求麦克风权限
      audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: CONFIG.SAMPLE_RATE,
          channelCount: 1,  // 单声道
          echoCancellation: true,
          noiseSuppression: true
        } 
      })

      // 创建 RecordRTC 实例，录制 WAV 格式
      recorder = new RecordRTC(audioStream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: StereoAudioRecorder,
        numberOfAudioChannels: 1,  // 单声道
        desiredSampRate: CONFIG.SAMPLE_RATE,
        timeSlice: 1000,
        ondataavailable: (blob) => {
          // 实时数据回调（可选）
        }
      })

      recordingDuration.value = 0

      // 开始录音
      recorder.startRecording()
      isRecording.value = true

      console.log('✅ 使用 RecordRTC 录制 WAV 格式，采样率:', CONFIG.SAMPLE_RATE)

      // 启动计时器
      startTimer()

      ElMessage.success('开始录音')
    } catch (error) {
      console.error('启动录音失败:', error)
      handleRecordingError(error)
      throw error
    }
  }

  /**
   * 停止录音
   */
  const stopRecording = () => {
    return new Promise((resolve) => {
      if (recorder && isRecording.value) {
        recorder.stopRecording(() => {
          // 获取 WAV Blob
          const audioBlob = recorder.getBlob()
          cleanup()
          isRecording.value = false
          
          console.log('✅ 录音完成，文件大小:', audioBlob.size, 'bytes, 格式: WAV')
          resolve(audioBlob)
        })
      } else {
        resolve(null)
      }
    })
  }

  /**
   * 识别音频
   */
  const recognizeAudio = async (audioBlob) => {
    if (!audioBlob) return null

    isProcessing.value = true

    try {
      // 使用 WAV 格式
      const result = await asrService.recognizeAudio(audioBlob, CONFIG.FILENAME)

      if (result.success && result.text) {
        ElMessage.success('语音识别成功')
        return result.text
      } else {
        ElMessage.error(result.message || '语音识别失败')
        return null
      }
    } catch (error) {
      console.error('语音识别失败:', error)
      ElMessage.error('语音识别失败，请稍后重试')
      return null
    } finally {
      isProcessing.value = false
      recordingDuration.value = 0
    }
  }

  /**
   * 启动计时器
   */
  const startTimer = () => {
    recordingTimer = setInterval(() => {
      recordingDuration.value++

      // 达到最长时长，自动停止
      if (recordingDuration.value >= CONFIG.MAX_DURATION) {
        stopRecording()
        ElMessage.warning(`录音时长已达上限（${CONFIG.MAX_DURATION}秒），自动停止`)
      }
    }, 1000)
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    // 销毁录音器
    if (recorder) {
      recorder.destroy()
      recorder = null
    }

    // 停止音频流
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
      audioStream = null
    }

    // 清除计时器
    if (recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }
  }

  /**
   * 处理录音错误
   */
  const handleRecordingError = (error) => {
    const errorMsg = ERROR_MESSAGES[error.name] || ERROR_MESSAGES.default
    ElMessage.error(errorMsg)
  }

  /**
   * 组件卸载时清理
   */
  onUnmounted(() => {
    cleanup()
  })

  return {
    // 状态
    isRecording,
    isProcessing,
    recordingDuration,
    
    // 方法
    startRecording,
    stopRecording,
    recognizeAudio
  }
}
