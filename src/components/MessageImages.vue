<template>
  <div v-if="images && images.length > 0" class="message-images">
    <img 
      v-for="(img, index) in images" 
      :key="index"
      :src="getImageSrc(img)" 
      alt="图片" 
      class="message-image"
      @click="handleImageClick(img)"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['image-click'])

// 获取图片显示源：优先使用 preview（base64），如果没有则使用 fileUrl
const getImageSrc = (img) => {
  if (typeof img === 'string') {
    return img
  } else if (img && typeof img === 'object') {
    return img.preview || img.fileUrl || ''
  }
  return ''
}

const handleImageClick = (img) => {
  emit('image-click', img)
}
</script>

<style scoped>
.message-images {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: transform var(--transition-base);
  object-fit: cover;
  display: block;
}

.message-image:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}
</style>
