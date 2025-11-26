<template>
  <div class="image-uploader">
    <!-- 图片缩略图区域 -->
    <div v-if="images.length > 0" class="images-preview">
      <ImageThumbnail 
        v-for="(img, index) in images" 
        :key="img.id || index"
        :image-item="img"
        @remove="() => handleRemove(index)"
        @preview="handlePreview"
      />
    </div>
    
    <!-- 图片预览弹窗 -->
    <ImagePreviewModal
      :visible="showPreview"
      :image-src="previewImageSrc"
      :image-data="previewImageData"
      :show-delete-button="false"
      @close="closePreview"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { imageService } from '../api/image'
import ImageThumbnail from './ImageThumbnail.vue'
import ImagePreviewModal from './ImagePreviewModal.vue'

const props = defineProps({
  pasteTarget: {
    type: Object, // DOM element reference
    default: null
  }
})

const emit = defineEmits(['images-update'])

const userStore = useUserStore()
// 图片数据结构: { id, preview: base64, status: 'uploading'|'success'|'failed', fileUrl: '', error: '' }
const images = ref([])

// 图片预览相关
const showPreview = ref(false)
const previewImageSrc = ref('')
const previewImageData = ref(null)

// 处理粘贴事件
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
          const result = await imageService.uploadImageFile(blob, userId)
          
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

// 删除图片
const handleRemove = async (index) => {
  const imageItem = images.value[index]
  
  // 如果图片已上传成功，需要调用删除接口
  if (imageItem && imageItem.status === 'success' && imageItem.fileUrl) {
    try {
      await imageService.deleteImage(imageItem.fileUrl)
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

// 图片预览
const handlePreview = (imageData) => {
  previewImageData.value = imageData
  previewImageSrc.value = imageData.src
  showPreview.value = true
}

const closePreview = () => {
  showPreview.value = false
  previewImageSrc.value = ''
  previewImageData.value = null
}

// 清空图片列表
const clearImages = () => {
  images.value = []
  emit('images-update', [])
}

// 获取成功上传的图片
const getSuccessImages = () => {
  return images.value.filter(img => img.status === 'success').map(img => ({
    preview: img.preview,
    fileUrl: img.fileUrl
  }))
}

// 暴露方法给父组件
defineExpose({
  handlePaste,
  clearImages,
  getSuccessImages,
  images
})
</script>

<style scoped>
.image-uploader {
  width: 100%;
}

.images-preview {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}
</style>
