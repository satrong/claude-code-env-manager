<script setup lang="ts">
import type { EnvConfig } from '../types/config';

defineProps<{
  config: EnvConfig;
}>();

const emit = defineEmits<{
  edit: [id: string];
  delete: [id: string];
  activate: [id: string];
}>();
</script>

<template>
  <div class="config-card" :class="{ active: config.isActive }">
    <div class="card-header">
      <div class="status-indicator" :class="{ active: config.isActive }"></div>
      <h3 class="config-name">{{ config.name }}</h3>
    </div>

    <div class="card-body">
      <div class="info-row">
        <span class="label">Base URL</span>
        <span class="value truncate">{{ config.env.ANTHROPIC_BASE_URL || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="label">Token</span>
        <span class="value masked">{{ config.env.ANTHROPIC_AUTH_TOKEN ? '••••••••' : '-' }}</span>
      </div>
    </div>

    <div class="card-footer">
      <button
        v-if="!config.isActive"
        class="btn-activate"
        @click="emit('activate', config.id)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        启用
      </button>
      <span v-else class="active-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        已启用
      </span>

      <div class="action-buttons">
        <button class="btn-icon" @click="emit('edit', config.id)" title="编辑">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon btn-danger" @click="emit('delete', config.id)" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-card {
  background: var(--bg-card);
  backdrop-filter: var(--blur-card);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.config-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--border-primary), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.config-card:hover {
  transform: translateY(-4px);
  border-color: var(--border-secondary);
  box-shadow: var(--shadow-card);
}

.config-card:hover::before {
  opacity: 1;
}

.config-card.active {
  border-color: rgba(52, 211, 153, 0.5);
  background: var(--gradient-card-active);
}

.config-card.active::before {
  background: var(--gradient-accent);
  opacity: 1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: all 0.3s;
}

.status-indicator.active {
  background: var(--accent-success);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.6);
}

.config-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.value {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.value.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.value.masked {
  letter-spacing: 2px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-primary);
}

.btn-activate {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--gradient-accent);
  border: none;
  border-radius: 8px;
  color: var(--text-inverse);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-activate:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(52, 211, 153, 0.4);
}

.active-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(52, 211, 153, 0.2);
  border-radius: 8px;
  color: var(--accent-success);
  font-size: 13px;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-button);
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.btn-icon.btn-danger:hover {
  background: rgba(239, 68, 68, 0.3);
  color: var(--accent-danger);
}
</style>
