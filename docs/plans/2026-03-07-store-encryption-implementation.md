# Store + 加密实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 使用 Tauri Store + Rust 加密替代 Stronghold，移除密码解锁机制，敏感数据加密存储。

**Architecture:** 在 Rust 端使用 `machine-uid` + `aes-gcm` 进行加解密，前端使用 Tauri Store 存储数据，
敏感字段通过 Rust 命令加解密。

**Tech Stack:** Tauri 2, Vue 3, TypeScript, Rust, aes-gcm, machine-uid, tauri-plugin-store

---

## Task 1: 更新 Rust 依赖

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1: 更新 Cargo.toml**

移除 `tauri-plugin-stronghold`，添加 `tauri-plugin-store`、`machine-uid`、`aes-gcm`、`sha2`。

```toml
[package]
name = "claude-code-settings-env"
version = "0.1.0"
description = "A Tauri App"
authors = ["you"]
edition = "2021"

[lib]
name = "claude_code_settings_env_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
tauri-plugin-store = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
dirs = "5"
machine-uid = "0.5"
aes-gcm = "0.10"
sha2 = "0.10"
base64 = "0.22"
```

**Step 2: 验证依赖**

Run: `cd src-tauri && cargo check`

Expected: 编译通过，无错误

**Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: replace stronghold with store + encryption dependencies"
```

---

## Task 2: 实现加密模块

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: 添加加密模块和命令**

完全重写 `src-tauri/src/lib.rs`：

```rust
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use sha2::{Digest, Sha256};

const APP_SALT: &[u8] = b"claude-code-settings-encryption-salt";

fn get_encryption_key() -> Result<[u8; 32], String> {
    let machine_id = machine_uid::get().map_err(|e| format!("Failed to get machine ID: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(machine_id.as_bytes());
    hasher.update(APP_SALT);
    let result = hasher.finalize();
    let key: [u8; 32] = result.into();
    Ok(key)
}

fn encrypt_data(plaintext: &str) -> Result<String, String> {
    let key = get_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    // Generate a random nonce
    let nonce_bytes: [u8; 12] = rand::random();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce to ciphertext and encode as base64
    let mut combined = nonce_bytes.to_vec();
    combined.extend(ciphertext);
    Ok(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &combined))
}

fn decrypt_data(ciphertext_b64: &str) -> Result<String, String> {
    let key = get_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let combined = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, ciphertext_b64)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    if combined.len() < 12 {
        return Err("Invalid ciphertext length".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes.try_into().unwrap());

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
}

#[tauri::command]
fn get_settings_path() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let path = home.join(".claude").join("settings.json");
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn read_settings() -> Result<String, String> {
    let path = get_settings_path()?;
    let content = fs::read_to_string(&path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            "Settings file not found".to_string()
        } else {
            format!("Failed to read settings: {}", e)
        }
    })?;
    Ok(content)
}

#[tauri::command]
fn write_settings(content: String) -> Result<(), String> {
    let path = get_settings_path()?;
    let parent = PathBuf::from(&path)
        .parent()
        .ok_or("Invalid path")?
        .to_path_buf();

    if !parent.exists() {
        fs::create_dir_all(&parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    fs::write(&path, content).map_err(|e| format!("Failed to write settings: {}", e))?;
    Ok(())
}

#[tauri::command]
fn encrypt(plaintext: String) -> Result<String, String> {
    encrypt_data(&plaintext)
}

#[tauri::command]
fn decrypt(ciphertext: String) -> Result<String, String> {
    decrypt_data(&ciphertext)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_settings_path,
            read_settings,
            write_settings,
            encrypt,
            decrypt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 2: 验证编译**

Run: `cd src-tauri && cargo build`

Expected: 编译通过，无错误

**Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: implement encryption with machine-uid + aes-gcm"
```

---

## Task 3: 更新权限配置

**Files:**
- Modify: `src-tauri/capabilities/default.json`

**Step 1: 更新权限**

移除 `stronghold:default`，添加 store 权限：

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "store:allow-get",
    "store:allow-set",
    "store:allow-save",
    "store:allow-load",
    "store:allow-delete",
    "store:allow-clear",
    {
      "identifier": "fs:default",
      "allow": [
        { "path": "$APPLOCALDATA/**" },
        { "path": "$APPLOCALDATA" }
      ]
    },
    {
      "identifier": "fs:allow-exists",
      "allow": [
        { "path": "$APPLOCALDATA/**" },
        { "path": "$APPLOCALDATA" }
      ]
    },
    {
      "identifier": "fs:allow-read-text-file",
      "allow": [
        { "path": "$HOME/.claude/**" }
      ]
    },
    {
      "identifier": "fs:allow-write-text-file",
      "allow": [
        { "path": "$HOME/.claude/**" }
      ]
    }
  ]
}
```

**Step 2: Commit**

```bash
git add src-tauri/capabilities/default.json
git commit -m "chore: replace stronghold permissions with store permissions"
```

---

## Task 4: 更新前端依赖

**Files:**
- Modify: `package.json`

**Step 1: 更新 package.json**

移除 `@tauri-apps/plugin-stronghold`，添加 `@tauri-apps/plugin-store`：

```json
{
  "name": "claude-code-settings-env",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-fs": "~2.4.5",
    "@tauri-apps/plugin-opener": "~2",
    "@tauri-apps/plugin-store": "~2",
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@vitejs/plugin-vue": "^5.2.1",
    "typescript": "~5.6.3",
    "vite": "^6.0.3",
    "vue-tsc": "^2.2.0"
  }
}
```

**Step 2: 安装依赖**

Run: `pnpm install`

Expected: 依赖安装成功

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: replace stronghold with store plugin in frontend"
```

---

## Task 5: 删除 LockScreen 组件

**Files:**
- Delete: `src/components/LockScreen.vue`

**Step 1: 删除文件**

Run: `rm src/components/LockScreen.vue`

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: remove LockScreen component - no longer needed"
```

---

## Task 6: 重写 App.vue

**Files:**
- Modify: `src/App.vue`

**Step 1: 重写 App.vue**

移除锁定逻辑，直接初始化 Store：

```vue
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
```

**Step 2: Commit**

```bash
git add src/App.vue
git commit -m "refactor: remove lock screen, direct app initialization"
```

---

## Task 7: 重写 useConfigStore

**Files:**
- Modify: `src/composables/useConfigStore.ts`

**Step 1: 重写 Store composable**

使用 Tauri Store + 加密命令：

```typescript
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import type { EnvConfig, SettingsFile } from '../types/config';

const configs = ref<EnvConfig[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const STORE_PATH = 'config-store.bin';
const CONFIGS_KEY = 'configs';

let storeInstance: Store | null = null;

// 加密字段标记
const ENCRYPTED_PREFIX = 'enc:';

function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

async function encryptValue(value: string): Promise<string> {
  if (!value) return value;
  const encrypted = await invoke<string>('encrypt', { plaintext: value });
  return ENCRYPTED_PREFIX + encrypted;
}

async function decryptValue(value: string): Promise<string> {
  if (!value || !isEncrypted(value)) return value;
  const ciphertext = value.slice(ENCRYPTED_PREFIX.length);
  return await invoke<string>('decrypt', { ciphertext });
}

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = new Store(STORE_PATH);
    await storeInstance.load();
  }
  return storeInstance;
}

async function loadConfigsFromStore(): Promise<EnvConfig[]> {
  const store = await getStore();
  const data = await store.get<EnvConfig[]>(CONFIGS_KEY);
  return data || [];
}

async function saveConfigsToStore(configsData: EnvConfig[]): Promise<void> {
  const store = await getStore();
  await store.set(CONFIGS_KEY, configsData);
  await store.save();
}

async function readSettingsFile(): Promise<SettingsFile | null> {
  try {
    const content = await invoke<string>('read_settings');
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to read settings file:', e);
    return null;
  }
}

async function writeSettingsFile(settings: SettingsFile): Promise<void> {
  const content = JSON.stringify(settings, null, 2);
  await invoke('write_settings', { content });
}

// 解密配置中的敏感字段
async function decryptConfig(config: EnvConfig): Promise<EnvConfig> {
  return {
    ...config,
    env: {
      ...config.env,
      ANTHROPIC_AUTH_TOKEN: await decryptValue(config.env.ANTHROPIC_AUTH_TOKEN),
    },
  };
}

// 加密配置中的敏感字段
async function encryptConfig(config: EnvConfig): Promise<EnvConfig> {
  return {
    ...config,
    env: {
      ...config.env,
      ANTHROPIC_AUTH_TOKEN: await encryptValue(config.env.ANTHROPIC_AUTH_TOKEN),
    },
  };
}

export function useConfigStore() {
  const activeConfig = ref<EnvConfig | undefined>(undefined);

  async function initialize(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      let savedConfigs = await loadConfigsFromStore();

      if (savedConfigs.length > 0) {
        // 解密所有配置
        configs.value = await Promise.all(savedConfigs.map(decryptConfig));
      } else {
        // 尝试从现有的 settings.json 导入
        try {
          const settings = await readSettingsFile();
          if (settings?.env) {
            const importedConfig: EnvConfig = {
              id: crypto.randomUUID(),
              name: '导入的配置',
              isActive: true,
              env: {
                ANTHROPIC_AUTH_TOKEN: String(settings.env.ANTHROPIC_AUTH_TOKEN || ''),
                ANTHROPIC_BASE_URL: String(settings.env.ANTHROPIC_BASE_URL || ''),
                API_TIMEOUT_MS: settings.env.API_TIMEOUT_MS ? String(settings.env.API_TIMEOUT_MS) : undefined,
                CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === 1 ? 1 : settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === 0 ? 0 : undefined,
                CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: settings.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS === 1 ? 1 : settings.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS === 0 ? 0 : undefined,
                ENABLE_TOOL_SEARCH: settings.env.ENABLE_TOOL_SEARCH === 1 ? 1 : settings.env.ENABLE_TOOL_SEARCH === 0 ? 0 : undefined,
                ANTHROPIC_DEFAULT_HAIKU_MODEL: settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ? String(settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL) : undefined,
                ANTHROPIC_DEFAULT_SONNET_MODEL: settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL ? String(settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL) : undefined,
                ANTHROPIC_DEFAULT_OPUS_MODEL: settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL ? String(settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL) : undefined,
              },
            };

            // 加密后保存
            const encryptedConfig = await encryptConfig(importedConfig);
            await saveConfigsToStore([encryptedConfig]);
            configs.value = [importedConfig];
          }
        } catch (importError) {
          console.log('Import from settings.json failed:', importError);
        }
      }

      // 更新 activeConfig
      activeConfig.value = configs.value.find((c) => c.isActive);
    } catch (e) {
      error.value = String(e);
    } finally {
      isLoading.value = false;
    }
  }

  async function addConfig(config: EnvConfig): Promise<void> {
    const encryptedConfig = await encryptConfig(config);
    const newConfigs = [...configs.value, config];
    await saveConfigsToStore([...await loadConfigsFromStore(), encryptedConfig]);
    configs.value = newConfigs;
  }

  async function updateConfig(id: string, updates: Partial<EnvConfig>): Promise<void> {
    const index = configs.value.findIndex((c) => c.id === id);
    if (index === -1) return;

    const updatedConfig = { ...configs.value[index], ...updates };
    const encryptedConfig = await encryptConfig(updatedConfig);

    const savedConfigs = await loadConfigsFromStore();
    const savedIndex = savedConfigs.findIndex((c) => c.id === id);
    if (savedIndex !== -1) {
      savedConfigs[savedIndex] = encryptedConfig;
      await saveConfigsToStore(savedConfigs);
    }

    configs.value[index] = updatedConfig;
  }

  async function deleteConfig(id: string): Promise<void> {
    const savedConfigs = await loadConfigsFromStore();
    const filtered = savedConfigs.filter((c) => c.id !== id);
    await saveConfigsToStore(filtered);
    configs.value = configs.value.filter((c) => c.id !== id);
  }

  async function activateConfig(id: string): Promise<void> {
    const config = configs.value.find((c) => c.id === id);
    if (!config) return;

    // 更新 Store 中的 isActive 状态
    const savedConfigs = await loadConfigsFromStore();
    const newSavedConfigs = savedConfigs.map((c) => ({
      ...c,
      isActive: c.id === id,
    }));
    await saveConfigsToStore(newSavedConfigs);

    // 写入 settings.json（使用解密后的 token）
    const settings: SettingsFile = {
      env: {
        ANTHROPIC_AUTH_TOKEN: config.env.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_BASE_URL: config.env.ANTHROPIC_BASE_URL,
        ...(config.env.API_TIMEOUT_MS && { API_TIMEOUT_MS: config.env.API_TIMEOUT_MS }),
        ...(config.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC !== undefined && {
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: config.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC,
        }),
        ...(config.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS !== undefined && {
          CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: config.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS,
        }),
        ...(config.env.ENABLE_TOOL_SEARCH !== undefined && {
          ENABLE_TOOL_SEARCH: config.env.ENABLE_TOOL_SEARCH,
        }),
        ...(config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL && {
          ANTHROPIC_DEFAULT_HAIKU_MODEL: config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
        }),
        ...(config.env.ANTHROPIC_DEFAULT_SONNET_MODEL && {
          ANTHROPIC_DEFAULT_SONNET_MODEL: config.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
        }),
        ...(config.env.ANTHROPIC_DEFAULT_OPUS_MODEL && {
          ANTHROPIC_DEFAULT_OPUS_MODEL: config.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
        }),
      },
    };

    await writeSettingsFile(settings);

    // 更新本地状态
    configs.value = configs.value.map((c) => ({
      ...c,
      isActive: c.id === id,
    }));
    activeConfig.value = config;
  }

  return {
    configs,
    isLoading,
    error,
    activeConfig,
    initialize,
    addConfig,
    updateConfig,
    deleteConfig,
    activateConfig,
  };
}
```

**Step 2: Commit**

```bash
git add src/composables/useConfigStore.ts
git commit -m "refactor: rewrite store with Tauri Store + encryption"
```

---

## Task 8: 验证和测试

**Step 1: 构建前端**

Run: `pnpm build`

Expected: 构建成功，无 TypeScript 错误

**Step 2: 构建后端**

Run: `cd src-tauri && cargo build`

Expected: 编译成功

**Step 3: 运行开发模式**

Run: `pnpm tauri dev`

Expected: 应用启动，无密码锁定界面，可以直接操作配置

**Step 4: 功能测试清单**

- [ ] 应用启动后直接显示主界面（无密码输入）
- [ ] 可以创建新配置
- [ ] API Token 被加密存储
- [ ] 可以激活配置，settings.json 正确写入
- [ ] 重启应用后配置保留

**Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete migration from Stronghold to Store + encryption"
```

---

## 验证检查点

| 检查项 | 验证方式 |
|--------|----------|
| Rust 编译 | `cd src-tauri && cargo build` |
| 前端编译 | `pnpm build` |
| 应用启动 | `pnpm tauri dev` |
| 加密功能 | 创建配置，检查 store 文件中 token 已加密 |
| 解密功能 | 重启应用，配置正确显示 |
| settings.json 写入 | 激活配置，检查文件内容 |
