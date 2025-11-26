<template>
  <div class="image-thumbnail">
    <!-- Loading状态 -->
    <div v-if="imageItem.status === 'uploading'" class="thumbnail-loading">
      <div class="loading-spinner"></div>
      <span class="loading-text">上传中...</span>
    </div>
    
    <!-- 成功状态 -->
    <div v-else-if="imageItem.status === 'success'" class="thumbnail-success">
      <img :src="displayUrl" alt="图片" class="thumbnail-image" @click.stop="handlePreview" />
      <button class="remove-btn" @click.stop="$emit('remove')">×</button>
      <div class="success-badge">✓</div>
    </div>
    
    <!-- 失败状态 -->
    <div v-else-if="imageItem.status === 'failed'" class="thumbnail-failed">
      <div class="failed-content">
        <span class="failed-icon">⚠</span>
        <span class="failed-text">上传失败</span>
      </div>
      <button class="remove-btn" @click.stop="$emit('remove')">×</button>
    </div>
    
    <!-- 默认状态（预览） -->
    <div v-else class="thumbnail-preview">
      <img :src="imageItem.preview" alt="图片" class="thumbnail-image" @click.stop="handlePreview" />
      <button class="remove-btn" @click.stop="$emit('remove')">×</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  imageItem: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && typeof value === 'object' && 'status' in value
    }
  }
})

const emit = defineEmits(['remove', 'preview'])

// 计算显示的图片URL：优先使用fileUrl，否则使用preview
const displayUrl = computed(() => {
  return props.imageItem.fileUrl || props.imageItem.preview || ''
})

// 处理预览点击
const handlePreview = () => {
  emit('preview', {
    src: props.imageItem.preview || props.imageItem.fileUrl || '',
    fileUrl: props.imageItem.fileUrl,
    preview: props.imageItem.preview
  })
}
</script>

<style scoped>
.image-thumbnail {
  position: relative;
  display: inline-block;
  margin-right: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.thumbnail-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-tertiary);
  cursor: pointer;
  transition: transform var(--transition-base);
}

.thumbnail-image:hover {
  transform: scale(1.05);
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--color-danger);
  color: var(--text-white);
  border: none;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background var(--transition-base);
  z-index: 10;
}

.remove-btn:hover {
  background: #cc0000;
  opacity: var(--opacity-hover);
}

/* Loading状态 */
.thumbnail-loading {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-sm);
  border: 2px dashed var(--border-tertiary);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-tertiary);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 11px;
  color: var(--text-muted);
}

/* 成功状态 */
.thumbnail-success {
  position: relative;
}

.success-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-success);
  color: var(--text-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  border: 2px solid var(--bg-secondary);
}

/* 失败状态 */
.thumbnail-failed {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-danger);
  background: var(--bg-tertiary);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.failed-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.failed-icon {
  font-size: 24px;
  color: var(--color-danger);
}

.failed-text {
  font-size: 11px;
  color: var(--color-danger);
}

/* 预览状态 */
.thumbnail-preview {
  position: relative;
}
</style>





