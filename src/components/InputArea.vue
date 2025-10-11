<template>
  <div class="input-area-wrapper">
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
        :disabled="isLoading"
      />
    </div>
    <div class="input-footer">
      <div class="left-actions">
        <el-button class="pill pill-primary" round>深度思考</el-button>
        <el-button 
          class="pill" 
          :class="{ 'pill-active': isKnowledgeSearch }"
          round
          @click="toggleKnowledgeSearch"
        >
          知识库搜索
        </el-button>
      </div>
      <div class="right-actions">
        <el-button class="pill pill-icon" round>📎</el-button>
        <el-button 
          type="primary" 
          circle 
          class="send-circle" 
          :loading="isLoading" 
          :disabled="!inputValue.trim() || isLoading" 
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

const emit = defineEmits(['update:modelValue', 'send', 'knowledge-search-toggle'])

const inputValue = ref(props.modelValue)
const isComposing = ref(false)
const isKnowledgeSearch = ref(false)

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
  if (!inputValue.value.trim() || props.isLoading) return
  emit('send', inputValue.value.trim(), isKnowledgeSearch.value)
}
</script>

<style scoped>
.input-area-wrapper {
  width: 100%;
}

.card-textarea :deep(textarea) {
  background: transparent;
  color: #e6e6e6;
  border: none;
  min-height: 50px;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
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
  background: #3a3a3a;
  color: #d6d6d6;
  border: 1px solid #4a4a4a;
}

.pill-primary { 
  background: #2a62ff; 
  color: #fff; 
  border: none; 
}

.pill-active {
  background: #2a62ff !important;
  color: #fff !important;
  border: none !important;
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
