<template>
  <div :class="['message', message.role]">
    <div class="message-avatar">
      <el-avatar :size="40">
        <el-icon v-if="message.role === 'user'"><User /></el-icon>
        <el-icon v-else><Service /></el-icon>
      </el-avatar>
    </div>
    <div class="message-content">
      <MessageRenderer :content="message.content" />
      <div class="message-footer">
        <div v-if="message.isRagEnhanced" class="rag-badge">
          <el-tag size="small" type="success">RAG增强</el-tag>
        </div>
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { User, Service } from '@element-plus/icons-vue'
import MessageRenderer from './MessageRenderer.vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
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
</style>
