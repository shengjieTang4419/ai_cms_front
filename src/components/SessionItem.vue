<template>
  <div
    :class="['session-item', { active: isActive }]"
    @click="handleClick"
  >
    <span class="session-title" :title="session.title">
      {{ session.title || '未命名会话' }}
    </span>
    <div class="session-actions" @click.stop>
      <SessionActionMenu @action="handleAction" />
    </div>
  </div>
</template>

<script setup>
import SessionActionMenu from './SessionActionMenu.vue'

const props = defineProps({
  session: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'action'])

const handleClick = () => {
  emit('select', props.session)
}

const handleAction = (command) => {
  emit('action', command, props.session)
}
</script>

<style scoped>
.session-item {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 10px var(--spacing-md);
  cursor: pointer;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  transition: var(--transition-base);
}

.session-item:hover {
  background: var(--bg-hover);
}

.session-item:hover .session-actions {
  opacity: 1;
}

.session-item.active {
  background: var(--bg-tertiary);
  outline: 1px solid var(--border-active);
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
  transition: opacity var(--transition-base);
  margin-left: var(--spacing-sm);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
</style>
