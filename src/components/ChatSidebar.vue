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
            <div
              v-for="item in group.items"
              :key="item.sessionId"
              :class="['session-item', { active: item.sessionId === currentSessionId }]"
              @click="$emit('select-session', item)"
            >
              <span class="session-title" :title="item.title">{{ item.title || '未命名会话' }}</span>
              <div class="session-actions" @click.stop>
                <el-dropdown 
                  trigger="click" 
                  placement="bottom-end"
                  @command="(command) => $emit('session-action', command, item)"
                >
                  <el-button 
                    type="text" 
                    size="small" 
                    class="more-btn"
                  >
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="rename">
                        <el-icon><Edit /></el-icon>
                        <span>重命名</span>
                      </el-dropdown-item>
                      <el-dropdown-item command="share">
                        <el-icon><Share /></el-icon>
                        <span>分享</span>
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" class="delete-option">
                        <el-icon><Delete /></el-icon>
                        <span>删除</span>
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { MoreFilled, Edit, Share, Delete } from '@element-plus/icons-vue'

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

const emit = defineEmits(['update:collapsed', 'new-session', 'select-session', 'session-action'])

const toggleCollapse = () => {
  emit('update:collapsed', !props.collapsed)
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
  background: #1f1f1f;
  border-right: 1px solid #2a2a2a;
  color: #e6e6e6;
  position: relative;
}

.sidebar.collapsed { 
  width: 40px; 
}

.sidebar .collapse-toggle {
  position: absolute;
  top: 8px;
  right: -12px;
  background: #2a2a2a;
  color: #ccc;
  border-radius: 12px;
  padding: 2px 6px;
  cursor: pointer;
  border: 1px solid #333;
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-actions {
  padding: 12px;
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
  color: #a6a6a6;
  padding: 8px 8px;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 4px 8px 4px;
}

.session-item {
  background: #2a2a2a;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  color: #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
}

.session-item:hover {
  background: #333333;
}

.session-item:hover .session-actions {
  opacity: 1;
}

.session-item.active {
  background: #3a3a3a;
  outline: 1px solid #4b6bff;
}

.session-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  display: flex;
  align-items: center;
  line-height: 1.4;
}

.session-actions {
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.more-btn {
  color: #999;
  padding: 2px;
  min-height: auto;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.more-btn:hover {
  color: #e6e6e6;
  background: rgba(255, 255, 255, 0.1);
}

:deep(.el-dropdown-menu) {
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:deep(.el-dropdown-menu__item) {
  color: #e6e6e6;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-dropdown-menu__item:hover) {
  background: #3a3a3a;
  color: #fff;
}

:deep(.delete-option) {
  color: #ff4757 !important;
}

:deep(.delete-option:hover) {
  background: rgba(255, 71, 87, 0.1) !important;
  color: #ff4757 !important;
}

:deep(.delete-option .el-icon) {
  color: #ff4757;
}
</style>
