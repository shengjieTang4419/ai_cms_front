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
      <MessageImages 
        :images="message.images"
        @image-click="handleImageClick"
      />
      <!-- 显示文本内容 -->
      <div v-if="message.messageType === 'RECOMMENDATIONS'" class="recommendations">
        <span
          v-for="(topic, idx) in (message.topics || [])"
          :key="idx"
          class="recommendation-chip"
          @click="handleTopicClick(topic)"
        >
          {{ topic }}
        </span>
      </div>
      <MessageRenderer v-if="message.content" :content="message.content" />
      <div class="message-footer">
        <div v-if="message.isRagEnhanced" class="rag-badge">
          <el-tag size="small" type="success">RAG增强</el-tag>
        </div>
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
    </div>
    <!-- 图片预览弹窗 -->
    <ImagePreviewModal
      :visible="showImageViewer"
      :image-src="previewImageSrc"
      :image-data="previewImageData"
      :show-delete-button="message.role === 'user'"
      :on-delete="handleDeleteImageRequest"
      @close="closeImageViewer"
      @deleted="handleImageDeleted"
    />
  </div>
</template>

<script setup>
import { User, Service } from '@element-plus/icons-vue'
import { ref } from 'vue'
import MessageRenderer from './MessageRenderer.vue'
import MessageImages from './MessageImages.vue'
import ImagePreviewModal from './ImagePreviewModal.vue'
import { imageService } from '../api/image'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['image-deleted', 'topic-click'])

const showImageViewer = ref(false)
const previewImageSrc = ref('')
const previewImageData = ref(null)

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 处理图片点击事件
const handleImageClick = (img) => {
  // 保存完整的图片数据对象
  previewImageData.value = typeof img === 'string' ? { fileUrl: img } : img
  
  // 设置预览图片源
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

const handleTopicClick = (topic) => {
  if (!topic) return
  emit('topic-click', topic)
}

// 处理删除图片请求（传给 ImagePreviewModal）
const handleDeleteImageRequest = async (imageData, imageSrc) => {
  const targetImageUrl = imageData?.fileUrl || imageSrc
  
  if (!targetImageUrl || targetImageUrl.startsWith('data:')) {
    throw new Error('无法删除base64图片，请等待上传完成')
  }
  
  await imageService.deleteImage(targetImageUrl)
  
  return targetImageUrl
}

// 处理图片删除成功后的回调
const handleImageDeleted = (imageData) => {
  const targetImageUrl = imageData?.fileUrl || previewImageSrc.value
  emit('image-deleted', targetImageUrl)
}
</script>

<style scoped>
.message {
  display: flex;
  gap: var(--spacing-md);
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
  background: var(--bg-secondary);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  position: relative;
}

.message.user .message-content { 
  background: var(--color-primary-light);
  color: var(--text-white);
}

.message.ai .message-content { 
  background: var(--bg-black);
  color: var(--text-white);
  border: 1px solid var(--border-secondary);
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-sm);
}

.message-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: var(--spacing-xs);
}

.message.user .message-time {
  color: var(--white-transparent-70);
}

.rag-badge {
  margin-top: var(--spacing-xs);
}

.rag-badge .el-tag {
  font-size: 11px;
  padding: 2px 6px;
  height: auto;
  line-height: 1.2;
}

.recommendations {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recommendation-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.recommendation-chip:hover {
  background: rgba(255, 255, 255, 0.18);
}
</style>
