<template>
  <div class="chat-input-wrapper">
    <!-- 空状态的中央输入框 -->
    <div v-if="isHeroMode" class="hero">
      <div class="hero-title">今天有什么可以帮到你？</div>
      <div class="input-card input-card--hero">
        <InputArea 
          v-model="inputValue"
          :is-loading="isLoading"
          :rows="2"
          placeholder="给我发送消息（支持粘贴图片）"
          @send="handleSend"
          @knowledge-search-toggle="handleKnowledgeSearchToggle"
          @deep-thinking-toggle="handleDeepThinkingToggle"
          @images-update="handleImagesUpdate"
        />
      </div>
    </div>

    <!-- 底部固定输入框 -->
    <div v-else class="chat-input">
      <div class="input-card input-card--bottom">
        <InputArea 
          v-model="inputValue"
          :is-loading="isLoading"
          :rows="2"
          placeholder="输入您的问题...（支持粘贴图片）"
          @send="handleSend"
          @knowledge-search-toggle="handleKnowledgeSearchToggle"
          @deep-thinking-toggle="handleDeepThinkingToggle"
          @images-update="handleImagesUpdate"
        />
      </div>
      <div class="input-tips">
        <span>按 Enter 发送，Shift + Enter 换行，支持粘贴图片</span>
        <span v-if="isComposing" class="composing-indicator">正在输入中...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import InputArea from './InputArea.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  isHeroMode: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'send', 'knowledge-search-toggle', 'deep-thinking-toggle', 'images-update'])

const inputValue = ref(props.modelValue)
const isComposing = ref(false)
const images = ref([])

watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

watch(inputValue, (newVal) => {
  emit('update:modelValue', newVal)
})

const handleDeepThinkingToggle = (isActive) => {
  emit('deep-thinking-toggle', isActive)
}

const handleKnowledgeSearchToggle = (isActive) => {
  emit('knowledge-search-toggle', isActive)
}

const handleImagesUpdate = (newImages) => {
  images.value = newImages
  emit('images-update', newImages)
}

const handleSend = (message, isKnowledgeSearch, imageList) => {
  if ((!message && (!imageList || imageList.length === 0)) || props.isLoading) return
  emit('send', message, isKnowledgeSearch, imageList)
  inputValue.value = ''
  images.value = []
}
</script>

<style scoped>
.chat-input-wrapper {
  width: 100%;
}

.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.hero-title {
  color: #e6e6e6;
  font-size: 32px;
  font-weight: 700;
}

.input-card {
  background: #2a2a2a;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.25);
}

.input-card--hero { 
  width: min(1100px, 92%);
  margin: 0 auto; 
}

.input-card--bottom { 
  width: min(1200px, 96%); 
}

.chat-input {
  background: #1f1f1f;
  padding: 20px;
  border-top: 1px solid #2a2a2a;
}

.input-tips {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.composing-indicator {
  color: #007bff;
  font-weight: 500;
}
</style>
