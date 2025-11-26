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
  breaks: true,
  gfm: true,
  pedantic: false,
  smartLists: true,
  smartypants: false
})

const formattedContent = computed(() => {
  if (!props.content) return ''
  
  try {
    // 处理转义字符，将\n转换为真正的换行符
    let processedContent = props.content.replace(/\\n/g, '\n')
    
    // 智能修复 Markdown 标题格式：在 # 后面如果没有空格，自动添加
    // 修复: ###标题 → ### 标题
    processedContent = processedContent.replace(/^(#{1,6})([^\s#])/gm, '$1 $2')
    
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
  color: var(--text-primary);
  line-height: 1.6;
}

.message-text h1,
.message-text h2,
.message-text h3,
.message-text h4,
.message-text h5,
.message-text h6 {
  color: var(--text-white);
  margin: var(--spacing-lg) 0 var(--spacing-sm) 0;
  font-weight: 600;
}

.message-text p {
  margin: var(--spacing-sm) 0;
}

.message-text ul,
.message-text ol {
  margin: var(--spacing-sm) 0;
  padding-left: var(--spacing-2xl);
}

.message-text li {
  margin: var(--spacing-xs) 0;
}

.message-text table {
  border-collapse: collapse;
  width: 100%;
  margin: var(--spacing-md) 0;
  background: var(--bg-secondary);
}

.message-text th,
.message-text td {
  border: 1px solid var(--border-table);
  padding: var(--spacing-md);
  text-align: left;
}

.message-text th {
  background: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-white);
}

.message-text td {
  background: var(--bg-secondary);
}

.message-text code {
  background: var(--bg-tertiary);
  color: var(--color-code);
  padding: 2px 6px;
  border-radius: var(--spacing-xs);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.message-text pre {
  background: var(--bg-dark);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  padding: var(--spacing-lg);
  overflow-x: auto;
  margin: var(--spacing-md) 0;
}

.message-text pre code {
  background: none;
  color: var(--text-primary);
  padding: 0;
}

.message-text blockquote {
  border-left: 4px solid var(--border-active);
  background: rgba(75, 107, 255, 0.1);
  margin: var(--spacing-md) 0;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: 0 var(--spacing-xs) var(--spacing-xs) 0;
}

.message-text a {
  color: var(--color-primary);
  text-decoration: none;
  transition: var(--transition-base);
}

.message-text a:hover {
  text-decoration: underline;
  color: var(--color-primary-light);
}

.message-text strong {
  color: var(--text-white);
  font-weight: 600;
}

.message-text em {
  color: #cccccc;
  font-style: italic;
}

.message-text hr {
  border: none;
  height: 1px;
  background: var(--border-divider);
  margin: var(--spacing-lg) 0;
}
</style>
