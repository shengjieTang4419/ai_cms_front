<template>
  <div class="input-area-wrapper">
    <!-- 图片缩略图区域 -->
    <div v-if="images.length > 0" class="images-preview">
      <ImageThumbnail 
        v-for="(img, index) in images" 
        :key="img.id || index"
        :image-item="img"
        @remove="() => removeImage(index)"
        @preview="handleImagePreview"
      />
    </div>
    
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
        @paste="handlePaste"
        :disabled="isLoading"
      />
    </div>
    <div class="input-footer">
      <div class="left-actions">
        <el-button class="pill pill-primary" round>深度思考</el-button>
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
        <el-button 
          type="primary" 
          circle 
          class="send-circle" 
          :loading="isLoading" 
          :disabled="(!inputValue.trim() && images.length === 0) || isLoading" 
          @click="handleSend"
        >
          ➤
        </el-button>
      </div>
    </div>
    
    <!-- 图片预览弹窗 -->
    <div v-if="showPreview" class="image-preview-overlay" @click.self="closePreview">
      <div class="image-preview-container">
        <div class="image-preview-header">
          <span class="image-preview-title">图片预览</span>
          <el-button 
            type="info" 
            size="small" 
            @click="closePreview"
          >
            关闭
          </el-button>
        </div>
        <div class="image-preview-content">
          <img :src="previewImageSrc" alt="预览图片" class="preview-image" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { chatService } from '../api/chat'
import ImageThumbnail from './ImageThumbnail.vue'

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

const emit = defineEmits(['update:modelValue', 'send', 'knowledge-search-toggle', 'web-search-toggle', 'images-update'])

const userStore = useUserStore()
const inputValue = ref(props.modelValue)
const isComposing = ref(false)
const isKnowledgeSearch = ref(false)
const isWebSearch = ref(false)
// 图片数据结构: { id, preview: base64, status: 'uploading'|'success'|'failed', fileUrl: '', error: '' }
const images = ref([])

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
  // 只发送成功上传的图片
  const successImages = images.value.filter(img => img.status === 'success')
  if ((!inputValue.value.trim() && successImages.length === 0) || props.isLoading) return
  
  // 传递图片数据，包含 preview（base64）和 fileUrl
  // 对于刚上传的图片，优先使用 preview，避免调用接口
  const imageData = successImages.map(img => ({
    preview: img.preview, // base64 预览数据，用于立即显示
    fileUrl: img.fileUrl  // 服务器URL，用于历史记录和删除操作
  }))
  
  emit('send', inputValue.value.trim(), isKnowledgeSearch.value, isWebSearch.value, imageData)
  // 清空图片
  images.value = []
  emit('images-update', [])
}

const handlePaste = async (event) => {
  const items = event.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault()
      const blob = item.getAsFile()
      
      // 生成唯一ID
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      
      // 创建FileReader读取base64用于预览
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result
        
        // 添加到图片列表，状态为uploading
        const imageItem = {
          id: imageId,
          preview: base64,
          status: 'uploading',
          fileUrl: '',
          error: ''
        }
        images.value.push(imageItem)
        emit('images-update', images.value)
        
        // 立即开始上传
        try {
          const userId = userStore.user?.id || 1
          const result = await chatService.uploadImageFile(blob, userId)
          
          // 上传成功，更新状态
          const index = images.value.findIndex(img => img.id === imageId)
          if (index !== -1) {
            images.value[index].status = 'success'
            images.value[index].fileUrl = result.fileUrl
            emit('images-update', images.value)
            ElMessage.success('图片上传成功')
          }
        } catch (error) {
          // 上传失败，更新状态
          const index = images.value.findIndex(img => img.id === imageId)
          if (index !== -1) {
            images.value[index].status = 'failed'
            images.value[index].error = error.message || '上传失败'
            emit('images-update', images.value)
            ElMessage.error(`图片上传失败: ${error.message || '未知错误'}`)
          }
        }
      }
      reader.readAsDataURL(blob)
    }
  }
}

const removeImage = async (index) => {
  const imageItem = images.value[index]
  
  // 如果图片已上传成功，需要调用删除接口
  if (imageItem && imageItem.status === 'success' && imageItem.fileUrl) {
    try {
      await chatService.deleteImage(imageItem.fileUrl)
      ElMessage.success('图片已删除')
    } catch (error) {
      ElMessage.error('删除图片失败: ' + (error.message || '未知错误'))
      // 即使删除失败，也从列表中移除（因为用户已经点击了删除）
    }
  }
  
  // 从列表中移除
  images.value.splice(index, 1)
  emit('images-update', images.value)
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

// 图片预览相关
const showPreview = ref(false)
const previewImageSrc = ref('')
const previewImageData = ref(null)

const handleImagePreview = (imageData) => {
  previewImageData.value = imageData
  previewImageSrc.value = imageData.src
  showPreview.value = true
}

const closePreview = () => {
  showPreview.value = false
  previewImageSrc.value = ''
  previewImageData.value = null
}
</script>

<style scoped>
.input-area-wrapper {
  width: 100%;
}

.images-preview {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 8px;
  background: #2a2a2a;
  border-radius: 8px;
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

.pill-disabled {
  opacity: 0.5;
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

/* 图片预览弹窗样式 */
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.image-preview-container {
  background: #1f1f1f;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.image-preview-header {
  padding: 16px 20px;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #2a2a2a;
}

.image-preview-title {
  color: #e6e6e6;
  font-size: 16px;
  font-weight: 600;
}

.image-preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
  background: #1a1a1a;
}

.preview-image {
  max-width: 100%;
  max-height: calc(90vh - 120px);
  object-fit: contain;
  border-radius: 8px;
}
</style>
