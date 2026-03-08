# 亮暗主题支持实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Claude Code 配置管理器添加亮色/暗色主题切换功能，允许用户根据偏好选择主题，并持久化存储用户选择。

**Architecture:** 使用 CSS 变量系统实现主题切换，通过 Vue composable 管理主题状态，使用 `@tauri-apps/plugin-store` 持久化用户偏好。主题切换通过 `<html>` 元素的 `data-theme` 属性控制，所有组件使用 CSS 变量替代硬编码颜色值。

**Tech Stack:** Vue 3 Composition API, CSS Variables, Tauri Store Plugin

---

## Task 1: 创建主题类型定义

**Files:**
- Create: `src/types/theme.ts`

**Step 1: 创建主题类型文件**

```typescript
// 主题类型定义
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // 背景色
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgHeader: string;
  bgInput: string;
  bgButton: string;
  bgOverlay: string;

  // 文字色
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // 边框色
  borderPrimary: string;
  borderSecondary: string;
  borderFocus: string;

  // 强调色
  accentPrimary: string;
  accentSecondary: string;
  accentSuccess: string;
  accentDanger: string;

  // 渐变背景
  gradientBg: string;
  gradientGlow1: string;
  gradientGlow2: string;
  gradientGlow3: string;
}
```

**Step 2: 验证文件创建成功**

Run: `cat src/types/theme.ts`
Expected: 文件内容显示正确

**Step 3: Commit**

```bash
git add src/types/theme.ts
git commit -m "feat: add theme type definitions"
```

---

## Task 2: 创建 CSS 变量主题系统

**Files:**
- Create: `src/styles/themes.css`

**Step 1: 创建主题 CSS 变量文件**

```css
/* 主题 CSS 变量定义 */

/* 暗色主题 (默认) */
:root,
:root[data-theme="dark"] {
  /* 背景色 */
  --bg-primary: #0f0f1a;
  --bg-secondary: #1a1a2e;
  --bg-card: rgba(255, 255, 255, 0.08);
  --bg-header: rgba(0, 0, 0, 0.2);
  --bg-input: rgba(255, 255, 255, 0.05);
  --bg-button: rgba(255, 255, 255, 0.1);
  --bg-overlay: rgba(0, 0, 0, 0.7);

  /* 文字色 */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.8);
  --text-muted: rgba(255, 255, 255, 0.5);
  --text-inverse: #000000;

  /* 边框色 */
  --border-primary: rgba(255, 255, 255, 0.1);
  --border-secondary: rgba(255, 255, 255, 0.15);
  --border-focus: rgba(52, 211, 153, 0.5);

  /* 强调色 */
  --accent-primary: #34d399;
  --accent-secondary: #10b981;
  --accent-success: #34d399;
  --accent-danger: #ef4444;

  /* 渐变 */
  --gradient-bg: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  --gradient-accent: linear-gradient(135deg, #34d399, #10b981);
  --gradient-card-active: linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(255, 255, 255, 0.05));

  /* 光晕效果 */
  --glow-1: rgba(52, 211, 153, 0.08);
  --glow-2: rgba(99, 102, 241, 0.08);
  --glow-3: rgba(236, 72, 153, 0.05);

  /* 阴影 */
  --shadow-card: 0 20px 40px rgba(0, 0, 0, 0.3);
  --shadow-modal: 0 25px 50px rgba(0, 0, 0, 0.5);
  --shadow-button: 0 8px 24px rgba(52, 211, 153, 0.4);

  /* 模糊效果 */
  --blur-header: blur(10px);
  --blur-modal: blur(8px);
  --blur-card: blur(20px);
}

/* 亮色主题 */
:root[data-theme="light"] {
  /* 背景色 */
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-card: rgba(255, 255, 255, 0.9);
  --bg-header: rgba(255, 255, 255, 0.8);
  --bg-input: rgba(0, 0, 0, 0.05);
  --bg-button: rgba(0, 0, 0, 0.08);
  --bg-overlay: rgba(0, 0, 0, 0.5);

  /* 文字色 */
  --text-primary: #1e293b;
  --text-secondary: rgba(30, 41, 59, 0.8);
  --text-muted: rgba(30, 41, 59, 0.5);
  --text-inverse: #ffffff;

  /* 边框色 */
  --border-primary: rgba(0, 0, 0, 0.1);
  --border-secondary: rgba(0, 0, 0, 0.15);
  --border-focus: rgba(16, 185, 129, 0.5);

  /* 强调色 */
  --accent-primary: #10b981;
  --accent-secondary: #059669;
  --accent-success: #10b981;
  --accent-danger: #ef4444;

  /* 渐变 */
  --gradient-bg: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
  --gradient-accent: linear-gradient(135deg, #10b981, #059669);
  --gradient-card-active: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(255, 255, 255, 0.5));

  /* 光晕效果 - 亮色模式下更柔和 */
  --glow-1: rgba(16, 185, 129, 0.06);
  --glow-2: rgba(99, 102, 241, 0.06);
  --glow-3: rgba(236, 72, 153, 0.04);

  /* 阴影 */
  --shadow-card: 0 10px 40px rgba(0, 0, 0, 0.1);
  --shadow-modal: 0 25px 50px rgba(0, 0, 0, 0.15);
  --shadow-button: 0 4px 12px rgba(16, 185, 129, 0.3);

  /* 模糊效果 */
  --blur-header: blur(10px);
  --blur-modal: blur(8px);
  --blur-card: blur(20px);
}
```

**Step 2: 验证文件创建成功**

Run: `cat src/styles/themes.css`
Expected: 文件内容显示正确

**Step 3: Commit**

```bash
git add src/styles/themes.css
git commit -m "feat: add CSS variables theme system"
```

---

## Task 3: 创建主题管理 Composable

**Files:**
- Create: `src/composables/useTheme.ts`

**Step 1: 创建主题管理 composable**

```typescript
import { ref, watch, onMounted } from 'vue';
import type { ThemeMode } from '../types/theme';

const THEME_KEY = 'app-theme';

// 全局状态
const currentTheme = ref<ThemeMode>('dark');
const isInitialized = ref(false);

export function useTheme() {
  // 获取系统主题偏好
  function getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }

  // 应用主题到 DOM
  function applyTheme(theme: ThemeMode) {
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }

  // 设置主题
  function setTheme(theme: ThemeMode) {
    currentTheme.value = theme;
    applyTheme(theme);
    // 持久化到 localStorage
    localStorage.setItem(THEME_KEY, theme);
  }

  // 切换主题 (light <-> dark)
  function toggleTheme() {
    const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  // 获取当前有效主题
  function getEffectiveTheme(): 'light' | 'dark' {
    if (currentTheme.value === 'system') {
      return getSystemTheme();
    }
    return currentTheme.value;
  }

  // 初始化主题
  function initializeTheme() {
    if (isInitialized.value) return;

    // 从 localStorage 读取保存的主题
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      currentTheme.value = savedTheme;
    }

    applyTheme(currentTheme.value);

    // 监听系统主题变化
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (currentTheme.value === 'system') {
          applyTheme('system');
        }
      });
    }

    isInitialized.value = true;
  }

  // 组件挂载时初始化
  onMounted(() => {
    initializeTheme();
  });

  return {
    currentTheme,
    setTheme,
    toggleTheme,
    getEffectiveTheme,
    getSystemTheme,
    initializeTheme,
  };
}
```

**Step 2: 验证文件创建成功**

Run: `cat src/composables/useTheme.ts`
Expected: 文件内容显示正确

**Step 3: Commit**

```bash
git add src/composables/useTheme.ts
git commit -m "feat: add useTheme composable for theme management"
```

---

## Task 4: 创建主题切换按钮组件

**Files:**
- Create: `src/components/ThemeToggle.vue`

**Step 1: 创建主题切换按钮组件**

```vue
<script setup lang="ts">
import { useTheme } from '../composables/useTheme';

const { currentTheme, toggleTheme, getEffectiveTheme } = useTheme();
</script>

<template>
  <button
    class="theme-toggle"
    @click="toggleTheme"
    :title="getEffectiveTheme() === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
  >
    <!-- 太阳图标 (亮色模式时显示) -->
    <svg
      v-if="getEffectiveTheme() === 'dark'"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
    <!-- 月亮图标 (暗色模式时显示) -->
    <svg
      v-else
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-button);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  background: var(--bg-card);
  color: var(--text-primary);
  border-color: var(--border-secondary);
}

.theme-toggle:active {
  transform: scale(0.95);
}
</style>
```

**Step 2: 验证文件创建成功**

Run: `cat src/components/ThemeToggle.vue`
Expected: 文件内容显示正确

**Step 3: Commit**

```bash
git add src/components/ThemeToggle.vue
git commit -m "feat: add ThemeToggle component"
```

---

## Task 5: 更新 main.ts 引入主题样式

**Files:**
- Modify: `src/main.ts`

**Step 1: 添加主题 CSS 导入**

修改 `src/main.ts`，在文件顶部添加主题样式导入：

```typescript
import { createApp } from "vue";
import App from "./App.vue";
import "./styles/themes.css"; // 添加这行

// 生产环境禁用右键菜单
if (import.meta.env.PROD) {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
}

createApp(App).mount("#app");
```

**Step 2: 验证修改**

Run: `cat src/main.ts`
Expected: 包含 `import "./styles/themes.css";`

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat: import theme styles in main.ts"
```

---

## Task 6: 更新 App.vue 使用主题系统

**Files:**
- Modify: `src/App.vue`

**Step 1: 导入并使用 ThemeToggle 组件和 useTheme**

在 `<script setup>` 部分添加导入：

```typescript
import { ref, onMounted } from 'vue';
import { useConfigStore } from './composables/useConfigStore';
import { useTheme } from './composables/useTheme'; // 添加
import type { EnvConfig } from './types/config';
import ConfigCard from './components/ConfigCard.vue';
import ConfigForm from './components/ConfigForm.vue';
import ThemeToggle from './components/ThemeToggle.vue'; // 添加

// 在 onMounted 之前添加
const { initializeTheme } = useTheme();

// 修改 onMounted
onMounted(async () => {
  initializeTheme(); // 添加这行
  await initialize();
});
```

**Step 2: 在 header 中添加主题切换按钮**

在模板的 `.header-content` 中，`.btn-create` 按钮之前添加 ThemeToggle：

```vue
<div class="header-actions">
  <ThemeToggle />
  <button class="btn-create" @click="openCreateForm">
    <svg>...</svg>
    新建配置
  </button>
</div>
```

**Step 3: 更新全局样式使用 CSS 变量**

将 `<style>` 中的 `:root` 样式替换为使用 CSS 变量：

```css
/* Global styles */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
}

:root {
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  font-weight: 400;
  color: var(--text-primary);
  background: var(--gradient-bg);
  min-height: 100vh;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  background: transparent;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
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
    radial-gradient(ellipse at 20% 20%, var(--glow-1) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, var(--glow-2) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, var(--glow-3) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
}

#app {
  min-height: 100vh;
}
```

**Step 4: 更新 scoped 样式使用 CSS 变量**

更新 `.app-header` 和其他 scoped 样式：

```css
.app-header {
  padding: 24px 32px;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-header);
  backdrop-filter: var(--blur-header);
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.3px;
}

.logo-text p {
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
  color: var(--text-muted);
}

.error-state {
  color: var(--accent-danger);
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
  backdrop-filter: var(--blur-modal);
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

  .header-actions {
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
```

**Step 5: 验证修改**

Run: `pnpm build`
Expected: 构建成功无错误

**Step 6: Commit**

```bash
git add src/App.vue
git commit -m "feat: integrate theme system in App.vue"
```

---

## Task 7: 更新 ConfigCard.vue 使用 CSS 变量

**Files:**
- Modify: `src/components/ConfigCard.vue`

**Step 1: 更新 scoped 样式**

将所有硬编码的颜色值替换为 CSS 变量：

```css
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
  background: linear-gradient(90deg, transparent, var(--border-secondary), transparent);
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
```

**Step 2: 验证修改**

Run: `pnpm build`
Expected: 构建成功无错误

**Step 3: Commit**

```bash
git add src/components/ConfigCard.vue
git commit -m "feat: update ConfigCard to use CSS variables"
```

---

## Task 8: 更新 ConfigForm.vue 使用 CSS 变量

**Files:**
- Modify: `src/components/ConfigForm.vue`

**Step 1: 更新 scoped 样式**

将所有硬编码的颜色值替换为 CSS 变量：

```css
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
  border-color: rgba(239, 68, 68, 0.5);
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
  background: rgba(52, 211, 153, 0.15);
  border-color: rgba(52, 211, 153, 0.4);
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
```

**Step 2: 验证修改**

Run: `pnpm build`
Expected: 构建成功无错误

**Step 3: Commit**

```bash
git add src/components/ConfigForm.vue
git commit -m "feat: update ConfigForm to use CSS variables"
```

---

## Task 9: 最终测试与验证

**Files:**
- 无新增文件

**Step 1: 运行开发服务器进行测试**

Run: `pnpm tauri dev`
Expected: 应用启动，可以切换主题，刷新后主题设置保持

**Step 2: 验证主题切换功能**

手动测试检查项：
1. [ ] 点击主题切换按钮，界面从暗色切换到亮色
2. [ ] 再次点击，切换回暗色
3. [ ] 刷新页面，主题设置保持不变
4. [ ] 所有组件（卡片、表单、按钮）正确应用主题颜色
5. [ ] 动画和过渡效果正常

**Step 3: 构建生产版本验证**

Run: `pnpm tauri build`
Expected: 构建成功，无错误

**Step 4: Commit (如有修复)**

```bash
git add -A
git commit -m "fix: resolve theme switching issues"
```

---

## 执行注意事项

1. **CSS 变量命名规范**: 所有变量使用 `--` 前缀，语义化命名
2. **向后兼容**: 暗色主题作为默认主题，确保现有用户体验不受影响
3. **持久化**: 使用 localStorage 存储用户偏好，无需额外依赖
4. **系统主题**: 预留 `system` 选项支持（可选扩展）

## 文件结构总览

```
src/
├── types/
│   ├── config.ts (已存在)
│   └── theme.ts (新建)
├── styles/
│   └── themes.css (新建)
├── composables/
│   ├── useConfigStore.ts (已存在)
│   └── useTheme.ts (新建)
├── components/
│   ├── ConfigCard.vue (修改)
│   ├── ConfigForm.vue (修改)
│   └── ThemeToggle.vue (新建)
├── App.vue (修改)
└── main.ts (修改)
```
