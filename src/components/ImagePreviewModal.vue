<template>
  <div v-if="visible" class="image-viewer-overlay" @click.self="handleClose">
    <div class="image-viewer-container">
      <div class="image-viewer-header">
        <span class="image-viewer-title">图片预览</span>
        <div class="image-viewer-actions">
          <!-- 只有在允许删除且提供了删除处理函数时才显示删除按钮 -->
          <el-button 
            v-if="showDeleteButton"
            type="danger" 
            size="small" 
            :icon="Delete" 
            @click="handleDelete"
            :loading="deleting"
          >
            删除图片
          </el-button>
          <el-button 
            type="info" 
            size="small" 
            :icon="Close" 
            @click="handleClose"
          >
            关闭
          </el-button>
        </div>
      </div>
      <div class="image-viewer-content">
        <img :src="imageSrc" alt="预览图片" class="preview-image" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { Delete, Close } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  imageSrc: {
    type: String,
    default: ''
  },
  imageData: {
    type: Object,
    default: null
  },
  showDeleteButton: {
    type: Boolean,
    default: false
  },
  onDelete: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['close', 'deleted'])

const deleting = ref(false)

const handleClose = () => {
  emit('close')
}

const handleDelete = async () => {
  if (!props.onDelete) {
    ElMessage.warning('未提供删除处理函数')
    return
  }

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
    
    // 调用父组件传入的删除函数
    await props.onDelete(props.imageData, props.imageSrc)
    
    ElMessage.success('图片删除成功')
    
    // 通知父组件图片已删除
    emit('deleted', props.imageData)
    
    // 关闭预览窗口
    handleClose()
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
/* 图片预览弹窗样式 */
.image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn var(--transition-base);
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
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

.image-viewer-header {
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--border-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
}

.image-viewer-title {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.image-viewer-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.image-viewer-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  overflow: auto;
  background: var(--bg-dark);
}

.preview-image {
  max-width: 100%;
  max-height: calc(90vh - 120px);
  object-fit: contain;
  border-radius: var(--radius-sm);
}
</style>
