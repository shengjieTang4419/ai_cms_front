<template>
  <aside :class="['sidebar', { collapsed: collapsed }]">
    <div class="collapse-toggle" @click="toggleCollapse">{{ collapsed ? '»' : '«' }}</div>
    <div class="sidebar-content" v-if="!collapsed">
      <div class="sidebar-actions">
        <el-button class="btn-new" type="primary" @click="$emit('new-session')" plain>
          <span class="plus">+</span> 新增会话
        </el-button>
      </div>
      <div class="session-groups light">
        <template v-for="group in groupedSessions" :key="group.label">
          <div class="group-label">{{ group.label }}</div>
          <div class="session-list">
            <SessionItem
              v-for="item in group.items"
              :key="item.sessionId"
              :session="item"
              :is-active="item.sessionId === currentSessionId"
              @select="$emit('select-session', $event)"
              @action="handleSessionAction"
            />
          </div>
        </template>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SessionItem from './SessionItem.vue'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  sessions: {
    type: Array,
    default: () => []
  },
  currentSessionId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:collapsed', 'new-session', 'select-session', 'rename-session', 'delete-session'])

const toggleCollapse = () => {
  emit('update:collapsed', !props.collapsed)
}

const handleSessionAction = async (command, session) => {
  if (!session) return
  if (command === 'rename') {
    try {
      const { value: newTitle } = await ElMessageBox.prompt('请输入新的会话名称', '重命名会话', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: session.title || '未命名会话',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return '会话名称不能为空'
          }
          return true
        }
      })
      emit('rename-session', { sessionId: session.sessionId, title: newTitle.trim() })
      ElMessage.success('重命名成功')
    } catch (e) {
      if (e !== 'cancel') {
        console.error(e)
        ElMessage.error('重命名失败')
      }
    }
    return
  }

  if (command === 'share') {
    try {
      const shareUrl = `${window.location.origin}/chat?session=${session.sessionId}`
      await navigator.clipboard.writeText(shareUrl)
      ElMessage.success('分享链接已复制到剪贴板')
    } catch (e) {
      console.error(e)
      ElMessage.error('分享失败')
    }
    return
  }

  if (command === 'delete') {
    try {
      await ElMessageBox.confirm('确定要删除这个会话吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch (action) {
      if (action === 'cancel') return
    }
    emit('delete-session', session.sessionId)
  }
}

const groupedSessions = computed(() => {
  const result = []
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000

  const today = []
  const yesterday = []
  const earlier = []

  for (const s of props.sessions) {
    const t = new Date(s.updatedAt || s.createdAt || Date.now()).getTime()
    if (t >= startOfToday) {
      today.push(s)
    } else if (t >= startOfYesterday) {
      yesterday.push(s)
    } else {
      earlier.push(s)
    }
  }

  if (today.length) result.push({ label: '今天', items: today })
  if (yesterday.length) result.push({ label: '昨天', items: yesterday })
  if (earlier.length) result.push({ label: '更早', items: earlier })
  return result
})
</script>

<style scoped>
.sidebar {
  width: 300px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-primary);
  color: var(--text-primary);
  position: relative;
}

.sidebar.collapsed { 
  width: 40px; 
}

.sidebar .collapse-toggle {
  position: absolute;
  top: var(--spacing-sm);
  right: -12px;
  background: var(--bg-secondary);
  color: #ccc;
  border-radius: var(--radius-md);
  padding: 2px 6px;
  cursor: pointer;
  border: 1px solid var(--border-secondary);
  transition: var(--transition-base);
}

.sidebar .collapse-toggle:hover {
  background: var(--bg-hover);
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-actions {
  padding: var(--spacing-md);
}

.btn-new {
  width: 100%;
  justify-content: center;
}

.plus { 
  font-weight: 800; 
  margin-right: 6px; 
}

.session-groups.light {
  flex: 1;
  overflow: auto;
}

.group-label {
  font-size: 12px;
  color: var(--text-disabled);
  padding: var(--spacing-sm);
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 var(--spacing-xs) var(--spacing-sm) var(--spacing-xs);
}
</style>
