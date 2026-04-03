<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useTemplateRef } from 'vue';
import { useSortable, moveArrayElement } from '@vueuse/integrations/useSortable';
import type { SortableEvent } from 'sortablejs';
import { useConfigStore } from '../composables/useConfigStore';
import type { EnvConfig } from '../types/config';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigForm from '../components/ConfigForm.vue';

const {
  configs,
  isLoading,
  error: storeError,
  initialize,
  addConfig,
  updateConfig,
  deleteConfig,
  activateConfig,
  reorderConfigs,
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

const localConfigs = ref<EnvConfig[]>([]);
const sortableEl = useTemplateRef<HTMLDivElement>('sortableEl');

watch(
  () => configs.value,
  (newConfigs) => {
    localConfigs.value = [...newConfigs];
  },
  { immediate: true }
);

useSortable(sortableEl, localConfigs, {
  animation: 200,
  ghostClass: 'ghost-card',
  chosenClass: 'chosen-card',
  dragClass: 'drag-fallback',
  filter: '.card-footer',
  preventOnFilter: false,
  forceFallback: true,
  watchElement: true,
  onUpdate: (e: SortableEvent) => {
    if (e.newIndex !== undefined && e.oldIndex !== undefined && e.newIndex !== e.oldIndex) {
      moveArrayElement(localConfigs, e.oldIndex, e.newIndex, e);
      nextTick(() => {
        onDragEnd({ oldIndex: e.oldIndex!, newIndex: e.newIndex! });
      });
    }
  },
});

async function onDragEnd(e: { oldIndex: number; newIndex: number }) {
  if (e.newIndex !== e.oldIndex) {
    try {
      await reorderConfigs([...localConfigs.value]);
    } catch (err) {
      console.error('Failed to reorder configs:', err);
      localConfigs.value = [...configs.value];
    }
  }
}
</script>

<template>
  <div class="config-view">
    <header class="view-header">
      <div class="header-content">
        <div class="header-info">
          <h1>配置管理</h1>
          <p>环境配置管理器，加密存储您的密钥</p>
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

    <main class="view-main">
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

      <div v-else ref="sortableEl" class="config-grid">
        <div v-for="config in localConfigs" :key="config.id" class="card-wrapper">
          <ConfigCard
            :config="config"
            @edit="openEditForm"
            @delete="handleDelete"
            @activate="handleActivate"
          />
        </div>
      </div>
    </main>

    <ConfigForm
      :visible="showForm"
      :config="editingConfig"
      @save="handleSave"
      @cancel="closeForm"
    />

    <Transition name="toast">
      <div v-if="deleteConfirmId" class="delete-toast">
        <span>再次点击确认删除</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.config-view {
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

.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--gradient-accent);
  border: none;
  border-radius: 10px;
  color: var(--text-inverse);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-button);
}

.view-main {
  flex: 1;
  padding: 32px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
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

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.card-wrapper {
  cursor: grab;
}

.card-wrapper :deep(.card-footer) {
  cursor: default;
}

.card-wrapper:active {
  cursor: grabbing;
}

.ghost-card {
  opacity: 0.3;
  background: var(--accent-primary) !important;
  border: 2px dashed var(--accent-primary) !important;
  border-radius: 16px;
}

.chosen-card {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3) !important;
  cursor: grabbing !important;
  border-radius: 16px;
  overflow: hidden;
}

.drag-fallback {
  opacity: 0.95;
  transform: rotate(2deg) scale(1.03);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
  cursor: grabbing !important;
  border-radius: 16px;
  overflow: hidden;
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
  backdrop-filter: var(--blur-modal);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 768px) {
  .view-header {
    padding: 16px 20px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-info {
    text-align: center;
  }

  .btn-create {
    justify-content: center;
  }

  .view-main {
    padding: 20px;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
