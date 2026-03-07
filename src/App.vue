<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConfigStore } from './composables/useConfigStore';
import type { EnvConfig } from './types/config';
import ConfigCard from './components/ConfigCard.vue';
import ConfigForm from './components/ConfigForm.vue';

const {
  configs,
  isLoading,
  error: storeError,
  initialize,
  addConfig,
  updateConfig,
  deleteConfig,
  activateConfig,
} = useConfigStore();

const showForm = ref(false);
const editingConfig = ref<EnvConfig | undefined>(undefined);
const deleteConfirmId = ref<string | null>(null);
const saveError = ref<string | null>(null);
let deleteTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  await initialize();
});

function openCreateForm() {
  editingConfig.value = undefined;
  saveError.value = null;
  showForm.value = true;
}

function openEditForm(id: string) {
  editingConfig.value = configs.value.find((c) => c.id === id);
  saveError.value = null;
  showForm.value = true;
}

async function handleSave(config: EnvConfig) {
  try {
    saveError.value = null;
    if (editingConfig.value) {
      await updateConfig(config.id, config);
    } else {
      await addConfig(config);
    }
    showForm.value = false;
    editingConfig.value = undefined;
  } catch (e) {
    saveError.value = `保存失败: ${e}`;
  }
}

async function handleDelete(id: string) {
  if (deleteConfirmId.value === id) {
    try {
      await deleteConfig(id);
    } catch (e) {
      console.error('Failed to delete config:', e);
    }
    deleteConfirmId.value = null;
    if (deleteTimeout) {
      clearTimeout(deleteTimeout);
      deleteTimeout = null;
    }
  } else {
    deleteConfirmId.value = id;
    if (deleteTimeout) {
      clearTimeout(deleteTimeout);
    }
    deleteTimeout = setTimeout(() => {
      deleteConfirmId.value = null;
    }, 3000);
  }
}

async function handleActivate(id: string) {
  try {
    await activateConfig(id);
  } catch (e) {
    console.error('Failed to activate config:', e);
  }
}

function closeForm() {
  showForm.value = false;
  editingConfig.value = undefined;
  saveError.value = null;
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="logo-section">
          <div class="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <div class="logo-text">
            <h1>Claude Code Settings</h1>
            <p>环境配置管理器</p>
          </div>
        </div>

        <button class="btn-create" @click="openCreateForm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          新建配置
        </button>
      </div>
    </header>

    <main class="app-main">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="storeError" class="error-state">
        <div class="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h2>加载失败</h2>
        <p>{{ storeError }}</p>
      </div>

      <div v-else-if="configs.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <h2>暂无配置</h2>
        <p>点击上方按钮创建您的第一个配置</p>
      </div>

      <div v-else class="config-grid">
        <ConfigCard
          v-for="config in configs"
          :key="config.id"
          :config="config"
          @edit="openEditForm"
          @delete="handleDelete"
          @activate="handleActivate"
        />
      </div>
    </main>

    <ConfigForm
      :visible="showForm"
      :config="editingConfig"
      @save="handleSave"
      @cancel="closeForm"
    />

    <!-- Delete confirmation toast -->
    <Transition name="toast">
      <div v-if="deleteConfirmId" class="delete-toast">
        <span>再次点击确认删除</span>
      </div>
    </Transition>
  </div>
</template>

<style>
/* Global styles */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  font-weight: 400;
  color: #fff;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  min-height: 100vh;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  background: transparent;
}

/* Animated background */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(52, 211, 153, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.05) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
}

#app {
  min-height: 100vh;
}
</style>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(16, 185, 129, 0.1));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #34d399;
}

.logo-text h1 {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: -0.3px;
}

.logo-text p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 2px 0 0 0;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #34d399, #10b981);
  border: none;
  border-radius: 10px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(52, 211, 153, 0.4);
}

.app-main {
  flex: 1;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  color: rgba(255, 255, 255, 0.5);
}

.error-state {
  color: #ef4444;
}

.error-icon {
  width: 120px;
  height: 120px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.error-state h2 {
  color: rgba(255, 255, 255, 0.8);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #34d399;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.empty-icon {
  width: 120px;
  height: 120px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 24px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.delete-toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(239, 68, 68, 0.9);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

/* Toast transition */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* Responsive */
@media (max-width: 768px) {
  .app-header {
    padding: 16px 20px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .logo-section {
    justify-content: center;
  }

  .btn-create {
    justify-content: center;
  }

  .app-main {
    padding: 20px;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
