<template>
  <el-dropdown 
    trigger="click" 
    placement="bottom-end"
    @command="handleCommand"
  >
    <el-button 
      type="text" 
      size="small" 
      class="more-btn"
      @click.stop
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
</template>

<script setup>
import { MoreFilled, Edit, Share, Delete } from '@element-plus/icons-vue'

const emit = defineEmits(['action'])

const handleCommand = (command) => {
  emit('action', command)
}
</script>

<style scoped>
.more-btn {
  color: var(--text-muted);
  padding: 2px;
  min-height: auto;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--spacing-xs);
  transition: var(--transition-base);
}

.more-btn:hover {
  color: var(--text-primary);
  background: var(--white-transparent-10);
}

:deep(.el-dropdown-menu) {
  background: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  box-shadow: var(--shadow-md);
}

:deep(.el-dropdown-menu__item) {
  color: var(--text-primary);
  padding: var(--spacing-sm) var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  transition: var(--transition-base);
}

:deep(.el-dropdown-menu__item:hover) {
  background: var(--bg-tertiary);
  color: var(--text-white);
}

:deep(.delete-option) {
  color: var(--color-danger) !important;
}

:deep(.delete-option:hover) {
  background: var(--danger-transparent-10) !important;
  color: var(--color-danger) !important;
}

:deep(.delete-option .el-icon) {
  color: var(--color-danger);
}
</style>
