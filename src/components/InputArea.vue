<template>
  <div class="input-area-wrapper">
    <!-- 图片上传组件 -->
    <ImageUploader 
      ref="imageUploaderRef"
      @images-update="handleImagesUpdate"
    />
    
    <div class="input-area">
      <el-input
        v-model="inputValue"
        type="textarea"
        :rows="rows"
        :autosize="{ minRows: rows, maxRows: rows * 2 }"
        :placeholder="placeholder"
        class="card-textarea"
        @keydown.enter="handleKeyDown"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        @paste="handleImagePaste"
        :disabled="isLoading"
      />
    </div>
    <div class="input-footer">
      <div class="left-actions">
        <el-button 
          class="pill" 
          :class="{ 'pill-active': isDeepThinking }"
          round
          @click="toggleDeepThinking"
        >
          深度思考
        </el-button>
        <el-button 
          class="pill" 
          :class="{ 'pill-active': isKnowledgeSearch, 'pill-disabled': isWebSearch }"
          round
          :disabled="isWebSearch"
          @click="toggleKnowledgeSearch"
        >
          知识库搜索
        </el-button>
        <el-button 
          class="pill" 
          :class="{ 'pill-active': isWebSearch, 'pill-disabled': isKnowledgeSearch }"
          round
          :disabled="isKnowledgeSearch"
          @click="toggleWebSearch"
        >
          全网搜索
        </el-button>
      </div>
      <div class="right-actions">
        <el-button class="pill pill-icon" round>📎</el-button>
        <VoiceRecorder @text-recognized="handleTextRecognized" />
        <el-button 
          type="primary" 
          circle 
          class="send-circle" 
          :loading="isLoading" 
          :disabled="(!inputValue.trim() && !hasImages) || isLoading" 
          @click="handleSend"
        >
          ➤
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ImageUploader from './ImageUploader.vue'
import VoiceRecorder from './VoiceRecorder.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  rows: {
    type: Number,
    default: 2
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'send', 'knowledge-search-toggle', 'web-search-toggle', 'deep-thinking-toggle', 'images-update'])

const inputValue = ref(props.modelValue)
const isComposing = ref(false)
const isDeepThinking = ref(false)
const isKnowledgeSearch = ref(false)
const isWebSearch = ref(false)
const imageUploaderRef = ref(null)
const hasImages = ref(false)

watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

watch(inputValue, (newVal) => {
  emit('update:modelValue', newVal)
})

const handleKeyDown = (event) => {
  if (isComposing.value) return
  
  if (event.key === 'Enter') {
    if (event.shiftKey) return
    
    event.preventDefault()
    handleSend()
  }
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
}

const handleSend = () => {
  // 从 ImageUploader 获取成功上传的图片
  const imageData = imageUploaderRef.value?.getSuccessImages() || []
  
  if ((!inputValue.value.trim() && imageData.length === 0) || props.isLoading) return
  
  emit('send', inputValue.value.trim(), isKnowledgeSearch.value, isWebSearch.value, imageData)
  
  // 清空图片
  imageUploaderRef.value?.clearImages()
}

const handleImagePaste = (event) => {
  imageUploaderRef.value?.handlePaste(event)
}

const handleImagesUpdate = (images) => {
  hasImages.value = images.length > 0
  emit('images-update', images)
}

const toggleDeepThinking = () => {
  isDeepThinking.value = !isDeepThinking.value
  emit('deep-thinking-toggle', isDeepThinking.value)
}

const toggleKnowledgeSearch = () => {
  if (isWebSearch.value) return // 如果全网搜索已激活，不允许切换
  isKnowledgeSearch.value = !isKnowledgeSearch.value
  isWebSearch.value = false // 确保互斥
  emit('knowledge-search-toggle', isKnowledgeSearch.value)
}

const toggleWebSearch = () => {
  if (isKnowledgeSearch.value) return // 如果知识库搜索已激活，不允许切换
  isWebSearch.value = !isWebSearch.value
  isKnowledgeSearch.value = false // 确保互斥
  emit('web-search-toggle', isWebSearch.value)
}

const handleTextRecognized = (text) => {
  // 将识别的文本添加到输入框
  if (inputValue.value) {
    // 如果输入框已有内容，追加到末尾
    inputValue.value += ' ' + text
  } else {
    inputValue.value = text
  }
}
</script>

<style scoped>
.input-area-wrapper {
  width: 100%;
}

.card-textarea :deep(textarea) {
  background: transparent;
  color: var(--text-primary);
  border: none;
  min-height: 50px;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.left-actions { 
  display: flex; 
  gap: 10px; 
}

.right-actions { 
  display: flex; 
  gap: 10px; 
}

.pill {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-tertiary);
  transition: var(--transition-base);
}

.pill:hover {
  background: var(--bg-hover);
}

.pill-primary { 
  background: var(--color-primary);
  color: var(--text-white);
  border: none; 
}

.pill-active {
  background: var(--color-primary) !important;
  color: var(--text-white) !important;
  border: none !important;
}

.pill-disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.pill-icon { 
  width: 44px; 
  padding: 0; 
  display: inline-flex; 
  align-items: center; 
  justify-content: center; 
}

.send-circle { 
  margin-left: auto; 
}
</style>
