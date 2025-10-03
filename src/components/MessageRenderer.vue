<template>
  <div class="message-renderer">
    <div class="message-text" v-html="formattedContent"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

// 配置marked库
marked.setOptions({
  breaks: false,
  gfm: true,
  pedantic: false,
  smartLists: true,
  smartypants: false
})

const formattedContent = computed(() => {
  if (!props.content) return ''
  
  try {
    // 处理转义字符，将\n转换为真正的换行符
    const processedContent = props.content.replace(/\\n/g, '\n')
    const result = marked(processedContent)    
    return result
  } catch (error) {
    console.error('Markdown渲染错误:', error)
    return props.content.replace(/\\n/g, '<br>')
  }
})
</script>

<style scoped>
.message-renderer {
  width: 100%;
}
</style>

<style>
/* 全局Markdown样式 - 不使用scoped以确保能正确应用到动态生成的HTML */
.message-text {
  color: #e6e6e6;
  line-height: 1.6;
}

.message-text h1,
.message-text h2,
.message-text h3,
.message-text h4,
.message-text h5,
.message-text h6 {
  color: #ffffff;
  margin: 16px 0 8px 0;
  font-weight: 600;
}

.message-text p {
  margin: 8px 0;
}

.message-text ul,
.message-text ol {
  margin: 8px 0;
  padding-left: 24px;
}

.message-text li {
  margin: 4px 0;
}

.message-text table {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
  background: #2a2a2a;
}

.message-text th,
.message-text td {
  border: 1px solid #444;
  padding: 12px;
  text-align: left;
}

.message-text th {
  background: #3a3a3a;
  font-weight: 600;
  color: #ffffff;
}

.message-text td {
  background: #2a2a2a;
}

.message-text code {
  background: #3a3a3a;
  color: #ff6b6b;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.message-text pre {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 12px 0;
}

.message-text pre code {
  background: none;
  color: #e6e6e6;
  padding: 0;
}

.message-text blockquote {
  border-left: 4px solid #4b6bff;
  background: rgba(75, 107, 255, 0.1);
  margin: 12px 0;
  padding: 8px 16px;
  border-radius: 0 4px 4px 0;
}

.message-text a {
  color: #4b6bff;
  text-decoration: none;
}

.message-text a:hover {
  text-decoration: underline;
}

.message-text strong {
  color: #ffffff;
  font-weight: 600;
}

.message-text em {
  color: #cccccc;
  font-style: italic;
}

.message-text hr {
  border: none;
  height: 1px;
  background: #444;
  margin: 16px 0;
}
</style>
