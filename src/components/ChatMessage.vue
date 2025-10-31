<template>
  <div :class="['message', message.role]">
    <div class="message-avatar">
      <el-avatar :size="40">
        <el-icon v-if="message.role === 'user'"><User /></el-icon>
        <el-icon v-else><Service /></el-icon>
      </el-avatar>
    </div>
    <div class="message-content">
      <!-- 显示图片 -->
      <div v-if="message.images && message.images.length > 0" class="message-images">
        <img 
          v-for="(img, index) in message.images" 
          :key="index"
          :src="getImageSrc(img)" 
          alt="图片" 
          class="message-image"
          @click="previewImage(img)"
        />
      </div>
      <!-- 显示文本内容 -->
      <MessageRenderer v-if="message.content" :content="message.content" />
      <div class="message-footer">
        <div v-if="message.isRagEnhanced" class="rag-badge">
          <el-tag size="small" type="success">RAG增强</el-tag>
        </div>
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
    </div>
    <!-- 图片预览弹窗（自定义，支持删除） -->
    <div v-if="showImageViewer" class="image-viewer-overlay" @click.self="closeImageViewer">
      <div class="image-viewer-container">
        <div class="image-viewer-header">
          <span class="image-viewer-title">图片预览</span>
          <div class="image-viewer-actions">
            <!-- 只有用户消息才显示删除按钮 -->
            <el-button 
              v-if="message.role === 'user'"
              type="danger" 
              size="small" 
              :icon="Delete" 
              @click="handleDeleteImage"
              :loading="deleting"
            >
              删除图片
            </el-button>
            <el-button 
              type="info" 
              size="small" 
              :icon="Close" 
              @click="closeImageViewer"
            >
              关闭
            </el-button>
          </div>
        </div>
        <div class="image-viewer-content">
          <img :src="previewImageSrc" alt="预览图片" class="preview-image" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { User, Service, Delete, Close } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MessageRenderer from './MessageRenderer.vue'
import { chatService } from '../api/chat'
import { ref } from 'vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['image-deleted'])

const showImageViewer = ref(false)
const previewImageSrc = ref('')
const previewImageData = ref(null) // 存储完整的图片数据对象
const deleting = ref(false)

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取图片显示源：优先使用 preview（base64），如果没有则使用 fileUrl
const getImageSrc = (img) => {
  if (typeof img === 'string') {
    return img
  } else if (img && typeof img === 'object') {
    return img.preview || img.fileUrl || ''
  }
  return ''
}

// 处理图片预览点击
const previewImage = (img) => {
  // 保存完整的图片数据对象，用于删除操作
  previewImageData.value = typeof img === 'string' ? { fileUrl: img } : img
  
  // 预览显示：优先使用 preview（base64），如果没有则使用 fileUrl
  if (typeof img === 'string') {
    previewImageSrc.value = img
  } else if (img && typeof img === 'object') {
    previewImageSrc.value = img.preview || img.fileUrl || ''
  }
  
  showImageViewer.value = true
}

const closeImageViewer = () => {
  showImageViewer.value = false
  previewImageSrc.value = ''
  previewImageData.value = null
}

const handleDeleteImage = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这张图片吗？删除后将无法恢复。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    deleting.value = true
    
    // 从保存的图片数据中获取 fileUrl
    if (!previewImageData.value) {
      throw new Error('无法获取图片信息')
    }
    
    const targetImageUrl = previewImageData.value.fileUrl || previewImageSrc.value
    
    if (!targetImageUrl || targetImageUrl.startsWith('data:')) {
      throw new Error('无法删除base64图片，请等待上传完成')
    }
    
    await chatService.deleteImage(targetImageUrl)
    
    ElMessage.success('图片删除成功')
    
    // 通知父组件图片已删除
    emit('image-deleted', targetImageUrl)
    
    // 关闭预览窗口
    closeImageViewer()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除图片失败: ' + (error.message || '未知错误'))
    }
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.ai { 
  align-self: flex-start; 
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  background: #2a2a2a;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
}

.message.user .message-content { 
  background: #3b6cff; 
  color: white; 
}

.message.ai .message-content { 
  background: #000; 
  color: #fff; 
  border: 1px solid #333; 
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.message.user .message-time {
  color: rgba(255, 255, 255, 0.7);
}

.rag-badge {
  margin-top: 4px;
}

.rag-badge .el-tag {
  font-size: 11px;
  padding: 2px 6px;
  height: auto;
  line-height: 1.2;
}

.message-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
  object-fit: cover;
  display: block;
}

.message-image:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 图片预览弹窗样式 */
.image-viewer-overlay {
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

.image-viewer-container {
  background: #1f1f1f;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.image-viewer-header {
  padding: 16px 20px;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #2a2a2a;
}

.image-viewer-title {
  color: #e6e6e6;
  font-size: 16px;
  font-weight: 600;
}

.image-viewer-actions {
  display: flex;
  gap: 8px;
}

.image-viewer-content {
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
