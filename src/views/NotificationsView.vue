<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useNotifications } from '../composables/useNotifications';

const {
  notifications,
  isLoading,
  error,
  httpPort,
  unreadCount,
  initialize,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} = useNotifications();

onMounted(async () => {
  await initialize();
});

const count = computed(() => unreadCount());

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const curlCommand = computed(() => {
  if (!httpPort.value) return '';
  return `curl -X POST http://127.0.0.1:${httpPort.value}/notify -H "Content-Type: application/json" -d '{"title":"测试","body":"通知内容"}'`;
});

const cliCommand = computed(() => {
  if (!httpPort.value) return '';
  return `cc-env-manager notify -t "测试" -b "通知内容"`;
});

async function handleCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.error('Copy failed:', e);
  }
}

async function handleMarkAllRead() {
  await markAllAsRead();
}

async function handleClearAll() {
  await clearAllNotifications();
}

async function handleClickNotification(id: number, isRead: number) {
  if (!isRead) {
    await markAsRead(id);
  }
}

async function handleDelete(id: number, event: MouseEvent) {
  event.stopPropagation();
  await deleteNotification(id);
}
</script>

<template>
  <div class="notifications-view">
    <header class="view-header">
      <div class="header-content">
        <div class="header-info">
          <h1>通知管理</h1>
          <p>查看和管理接收到的通知</p>
        </div>
        <div class="header-actions">
          <span v-if="count > 0" class="unread-badge">{{ count }} 条未读</span>
          <button v-if="count > 0" class="btn-action" @click="handleMarkAllRead">
            全部已读
          </button>
          <button v-if="notifications.length > 0" class="btn-action btn-danger" @click="handleClearAll">
            清空全部
          </button>
        </div>
      </div>
    </header>

    <main class="view-main">
      <div v-if="httpPort" class="server-info">
        <div class="info-card">
          <div class="info-label">HTTP 通知接口</div>
          <div class="info-value">
            <code>POST http://127.0.0.1:{{ httpPort }}/notify</code>
            <button class="btn-copy" @click="handleCopy(curlCommand)" title="复制 curl 命令">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="info-card">
          <div class="info-label">CLI 调用方式</div>
          <div class="info-value">
            <code>{{ cliCommand }}</code>
            <button class="btn-copy" @click="handleCopy(cliCommand)" title="复制命令">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2>加载失败</h2>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="notifications.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </div>
        <h2>暂无通知</h2>
        <p>当有新通知时会显示在这里</p>
      </div>

      <div v-else class="notification-list">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="notification-item"
          :class="{ unread: !n.is_read }"
          @click="handleClickNotification(n.id, n.is_read)"
        >
          <div class="notification-dot" v-if="!n.is_read"></div>
          <div class="notification-content">
            <div class="notification-header">
              <span class="notification-title">{{ n.title }}</span>
              <span class="notification-time">{{ formatTime(n.received_at) }}</span>
            </div>
            <p class="notification-body">{{ n.body }}</p>
          </div>
          <button class="btn-delete" @click="handleDelete(n.id, $event)" title="删除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.notifications-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  padding: 24px 32px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-header);
  backdrop-filter: var(--blur-header);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.3px;
}

.header-info p {
  font-size: 13px;
  color: var(--text-muted);
  margin: 2px 0 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.unread-badge {
  font-size: 13px;
  color: var(--accent-primary);
  font-weight: 600;
  padding: 4px 12px;
  background: var(--bg-active);
  border-radius: 20px;
}

.btn-action {
  padding: 8px 16px;
  background: var(--bg-button);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: var(--bg-card);
  border-color: var(--border-secondary);
  color: var(--text-primary);
}

.btn-danger:hover {
  border-color: var(--accent-danger);
  color: var(--accent-danger);
}

.view-main {
  flex: 1;
  padding: 32px;
}

.server-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.info-card {
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
}

.info-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-value code {
  font-size: 13px;
  color: var(--accent-primary);
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  word-break: break-all;
  flex: 1;
}

.btn-copy {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-button);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy:hover {
  color: var(--text-primary);
  border-color: var(--border-secondary);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 16px;
  color: var(--text-muted);
}

.error-state {
  color: var(--accent-danger);
}

.error-icon {
  width: 120px;
  height: 120px;
  background: var(--bg-button);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.error-state h2 {
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  text-align: center;
}

.empty-icon {
  width: 120px;
  height: 120px;
  background: var(--bg-button);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 15px;
  color: var(--text-muted);
  margin: 0;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.notification-item:hover {
  border-color: var(--border-secondary);
  background: var(--bg-button);
}

.notification-item.unread {
  border-left: 3px solid var(--accent-primary);
}

.notification-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-primary);
  flex-shrink: 0;
  margin-top: 7px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-time {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.notification-body {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btn-delete {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.notification-item:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  background: var(--bg-button);
  color: var(--accent-danger);
}
</style>
