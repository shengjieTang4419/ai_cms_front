<template>
  <div class="voice-recorder">
    <el-button 
      :class="['record-btn', { 'recording': isRecording }]" 
      circle
      @click="toggleRecording"
      :loading="isProcessing"
      :title="isRecording ? '点击停止录音' : '点击开始录音'"
    >
      <span v-if="!isProcessing" class="icon">🎤</span>
    </el-button>

    <!-- 录音状态提示 -->
    <div v-if="isRecording" class="recording-indicator">
      <span class="pulse"></span>
      <span class="text">录音中...</span>
      <span class="duration">{{ recordingDuration }}s</span>
    </div>

    <!-- 处理中提示 -->
    <div v-if="isProcessing" class="processing-indicator">
      正在识别语音...
    </div>
  </div>
</template>

<script setup>
import { useVoiceRecorder } from '../composables/useVoiceRecorder'

const emit = defineEmits(['text-recognized'])

// 使用录音组合式函数
const {
  isRecording,
  isProcessing,
  recordingDuration,
  startRecording,
  stopRecording,
  recognizeAudio
} = useVoiceRecorder()

/**
 * 切换录音状态
 */
const toggleRecording = async () => {
  if (isRecording.value) {
    // 停止录音并识别
    const audioBlob = await stopRecording()
    if (audioBlob) {
      const text = await recognizeAudio(audioBlob)
      if (text) {
        emit('text-recognized', text)
      }
    }
  } else {
    // 开始录音
    await startRecording()
  }
}
</script>

<style scoped>
.voice-recorder {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.record-btn {
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-tertiary);
  transition: var(--transition-base);
  font-size: 18px;
}

.record-btn:hover {
  background: var(--bg-hover);
  transform: scale(1.05);
}

.record-btn.recording {
  background: var(--color-danger) !important;
  border-color: var(--color-danger) !important;
  animation: pulse 1.5s ease-in-out infinite;
}

.record-btn .icon {
  display: inline-block;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 var(--danger-shadow-70);
  }
  50% {
    box-shadow: 0 0 0 10px var(--danger-shadow-0);
  }
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--danger-transparent-10);
  border-radius: var(--radius-full);
  font-size: 14px;
  color: var(--color-danger);
}

.recording-indicator .pulse {
  width: 8px;
  height: 8px;
  background: var(--color-danger);
  border-radius: 50%;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.recording-indicator .text {
  font-weight: 500;
}

.recording-indicator .duration {
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.processing-indicator {
  padding: var(--spacing-xs) var(--spacing-md);
  background: rgba(64, 158, 255, 0.1);
  border-radius: var(--radius-full);
  font-size: 14px;
  color: var(--color-primary);
  font-weight: 500;
}
</style>
