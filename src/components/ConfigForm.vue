<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { EnvConfig } from '../types/config';
import { TOGGLE_FIELDS } from '../types/config';

type ToggleFieldKey = 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC' | 'CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS' | 'ENABLE_TOOL_SEARCH';

const props = defineProps<{
  config?: EnvConfig;
  visible: boolean;
}>();

const emit = defineEmits<{
  save: [config: EnvConfig];
  cancel: [];
}>();

const formData = ref<EnvConfig>(
  props.config || {
    id: '',
    name: '',
    isActive: false,
    env: {
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: '',
      API_TIMEOUT_MS: '3000000',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
      CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: 1,
      ENABLE_TOOL_SEARCH: 0,
    },
  }
);

const errors = ref<Record<string, string>>({});

// 追踪鼠标按下的目标，防止拖拽误触发关闭
const mouseDownTarget = ref<EventTarget | null>(null);

function handleOverlayMouseDown(e: MouseEvent) {
  mouseDownTarget.value = e.target;
}

function handleOverlayClick(e: MouseEvent) {
  // 只有当 mousedown 和 mouseup 都发生在遮罩层本身时才关闭
  if (e.target === e.currentTarget && mouseDownTarget.value === e.currentTarget) {
    handleCancel();
  }
  mouseDownTarget.value = null;
}

function resetForm() {
  if (props.config) {
    formData.value = JSON.parse(JSON.stringify(props.config));
  } else {
    formData.value = {
      id: '',
      name: '',
      isActive: false,
      env: {
        ANTHROPIC_AUTH_TOKEN: '',
        ANTHROPIC_BASE_URL: '',
        API_TIMEOUT_MS: '3000000',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
        CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: 1,
        ENABLE_TOOL_SEARCH: 0,
      },
    };
  }
  errors.value = {};
}

// 当表单打开时重置
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm();
    }
  }
);

const isEdit = computed(() => !!props.config?.id);

function validate(): boolean {
  errors.value = {};

  if (!formData.value.name.trim()) {
    errors.value.name = '配置名称不能为空';
  }

  if (!formData.value.env.ANTHROPIC_AUTH_TOKEN.trim()) {
    errors.value.ANTHROPIC_AUTH_TOKEN = 'Token 不能为空';
  }

  if (!formData.value.env.ANTHROPIC_BASE_URL.trim()) {
    errors.value.ANTHROPIC_BASE_URL = 'Base URL 不能为空';
  }

  return Object.keys(errors.value).length === 0;
}

function handleSave() {
  if (!validate()) return;

  const config: EnvConfig = {
    ...formData.value,
    id: formData.value.id || crypto.randomUUID(),
  };

  emit('save', config);
}

function handleCancel() {
  emit('cancel');
}

function toggleField(key: ToggleFieldKey) {
  if (key === 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC') {
    formData.value.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = formData.value.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === 1 ? 0 : 1;
  } else if (key === 'CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS') {
    formData.value.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS = formData.value.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS === 1 ? 0 : 1;
  } else if (key === 'ENABLE_TOOL_SEARCH') {
    formData.value.env.ENABLE_TOOL_SEARCH = formData.value.env.ENABLE_TOOL_SEARCH === 1 ? 0 : 1;
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay"
        @mousedown="handleOverlayMouseDown"
        @click="handleOverlayClick"
      >
        <div class="modal-container">
          <div class="modal-header">
            <h2>{{ isEdit ? '编辑配置' : '新建配置' }}</h2>
            <button class="btn-close" @click="handleCancel">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-section">
              <h3 class="section-title">基本信息</h3>

              <div class="form-group">
                <label class="form-label">配置名称 <span class="required">*</span></label>
                <input
                  v-model="formData.name"
                  type="text"
                  class="form-input"
                  :class="{ error: errors.name }"
                  placeholder="例如：生产环境、开发环境"
                />
                <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">必填配置</h3>

              <div class="form-group">
                <label class="form-label">ANTHROPIC_AUTH_TOKEN <span class="required">*</span></label>
                <input
                  v-model="formData.env.ANTHROPIC_AUTH_TOKEN"
                  type="password"
                  class="form-input"
                  :class="{ error: errors.ANTHROPIC_AUTH_TOKEN }"
                  placeholder="输入您的 Anthropic Token"
                />
                <span v-if="errors.ANTHROPIC_AUTH_TOKEN" class="error-text">{{
                  errors.ANTHROPIC_AUTH_TOKEN
                }}</span>
              </div>

              <div class="form-group">
                <label class="form-label">ANTHROPIC_BASE_URL <span class="required">*</span></label>
                <input
                  v-model="formData.env.ANTHROPIC_BASE_URL"
                  type="url"
                  class="form-input"
                  :class="{ error: errors.ANTHROPIC_BASE_URL }"
                  placeholder="https://api.anthropic.com"
                />
                <span v-if="errors.ANTHROPIC_BASE_URL" class="error-text">{{
                  errors.ANTHROPIC_BASE_URL
                }}</span>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">开关选项</h3>

              <div class="toggle-grid">
                <button
                  v-for="field in TOGGLE_FIELDS"
                  :key="field.key"
                  class="toggle-item"
                  :class="{
                    active: formData.env[field.key as ToggleFieldKey] === 1,
                  }"
                  @click="toggleField(field.key as ToggleFieldKey)"
                >
                  <div class="toggle-indicator">
                    <svg
                      v-if="formData.env[field.key as ToggleFieldKey] === 1"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span class="toggle-label">{{ field.label }}</span>
                </button>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">可选配置</h3>

              <div class="form-group">
                <label class="form-label">API_TIMEOUT_MS</label>
                <input
                  v-model="formData.env.API_TIMEOUT_MS"
                  type="text"
                  class="form-input"
                  placeholder="例如：3000000"
                />
              </div>

              <div class="form-group">
                <label class="form-label">ANTHROPIC_DEFAULT_HAIKU_MODEL</label>
                <input
                  v-model="formData.env.ANTHROPIC_DEFAULT_HAIKU_MODEL"
                  type="text"
                  class="form-input"
                  placeholder="例如：claude-3-haiku-20240307"
                />
              </div>

              <div class="form-group">
                <label class="form-label">ANTHROPIC_DEFAULT_SONNET_MODEL</label>
                <input
                  v-model="formData.env.ANTHROPIC_DEFAULT_SONNET_MODEL"
                  type="text"
                  class="form-input"
                  placeholder="例如：claude-3-5-sonnet-20241022"
                />
              </div>

              <div class="form-group">
                <label class="form-label">ANTHROPIC_DEFAULT_OPUS_MODEL</label>
                <input
                  v-model="formData.env.ANTHROPIC_DEFAULT_OPUS_MODEL"
                  type="text"
                  class="form-input"
                  placeholder="例如：claude-3-opus-20240229"
                />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" @click="handleCancel">取消</button>
            <button class="btn btn-primary" @click="handleSave">
              {{ isEdit ? '保存修改' : '创建配置' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  backdrop-filter: var(--blur-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-modal);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid var(--border-primary);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-button);
  border: none;
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}

.form-section {
  margin-bottom: 28px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 16px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.required {
  color: var(--accent-danger);
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-secondary);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-input:focus {
  outline: none;
  border-color: var(--border-focus);
  background: var(--bg-card);
}

.form-input.error {
  border-color: var(--accent-danger);
}

.error-text {
  display: block;
  font-size: 12px;
  color: var(--accent-danger);
  margin-top: 6px;
}

.toggle-grid {
  display: grid;
  gap: 12px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--bg-input);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.toggle-item:hover {
  background: var(--bg-card);
  border-color: var(--border-secondary);
}

.toggle-item.active {
  background: var(--bg-active);
  border-color: var(--accent-primary);
}

.toggle-indicator {
  width: 22px;
  height: 22px;
  border: 2px solid var(--text-muted);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toggle-item.active .toggle-indicator {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: var(--text-inverse);
}

.toggle-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 28px;
  border-top: 1px solid var(--border-primary);
}

.btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: var(--bg-button);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--gradient-accent);
  color: var(--text-inverse);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-button);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}
</style>
