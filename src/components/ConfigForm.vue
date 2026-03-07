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
    },
  }
);

const errors = ref<Record<string, string>>({});

watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      formData.value = JSON.parse(JSON.stringify(newConfig));
    } else {
      formData.value = {
        id: '',
        name: '',
        isActive: false,
        env: {
          ANTHROPIC_AUTH_TOKEN: '',
          ANTHROPIC_BASE_URL: '',
        },
      };
    }
    errors.value = {};
  },
  { immediate: true }
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
      <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
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
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: linear-gradient(135deg, rgba(30, 30, 40, 0.95), rgba(20, 20, 30, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
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
  color: rgba(255, 255, 255, 0.5);
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
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.required {
  color: #ef4444;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.form-input:focus {
  outline: none;
  border-color: rgba(52, 211, 153, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.form-input.error {
  border-color: rgba(239, 68, 68, 0.5);
}

.error-text {
  display: block;
  font-size: 12px;
  color: #ef4444;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.toggle-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.toggle-item.active {
  background: rgba(52, 211, 153, 0.15);
  border-color: rgba(52, 211, 153, 0.4);
}

.toggle-indicator {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toggle-item.active .toggle-indicator {
  background: #34d399;
  border-color: #34d399;
  color: #000;
}

.toggle-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
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
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-primary {
  background: linear-gradient(135deg, #34d399, #10b981);
  color: #000;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 211, 153, 0.4);
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
