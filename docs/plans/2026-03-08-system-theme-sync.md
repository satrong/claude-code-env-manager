# 系统主题同步功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现智能主题同步：当用户选择的主题恰好与系统当前主题一致时，应用自动跟随系统主题变化。

**Architecture:** 在现有 useTheme composable 基础上扩展，通过记录"上次系统主题状态"来判断是否应该跟随。当系统主题变化时，检查用户当前选择的主题是否与系统主题同步，如果同步则自动切换。

**Tech Stack:** Vue 3 Composition API, matchMedia API

---

## 需求分析

**用户期望行为：**
1. 用户选择 'dark'，系统也是 'dark' → 系统切换到 'light' 时，应用自动跟随
2. 用户选择 'light'，系统是 'dark' → 系统切换时，应用不跟随（保持 'light'）
3. 用户选择 'system' → 始终跟随系统（现有行为）

**核心逻辑：**
- 如果 `当前用户选择的主题 === 当前系统主题`，则"锁定同步"，跟随系统变化
- 如果 `当前用户选择的主题 !== 当前系统主题`，则"解锁同步"，不跟随系统变化

---

## Task 1: 更新 useTheme.ts 实现智能同步

**Files:**
- Modify: `src/composables/useTheme.ts`

**Step 1: 添加系统主题跟踪变量**

在全局状态部分添加新的 ref 变量来跟踪上次系统主题：

```typescript
// 全局状态
const currentTheme = ref<ThemeMode>('dark');
const isInitialized = ref(false);
const isListenerAdded = ref(false);
const lastSystemTheme = ref<'light' | 'dark'>('dark'); // 新增：记录上次系统主题
```

**Step 2: 更新系统主题变化监听器**

修改 `initializeTheme` 函数中的系统主题监听器：

```typescript
// 监听系统主题变化 (只注册一次)
if (!isListenerAdded.value && typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // 初始化 lastSystemTheme
  lastSystemTheme.value = mediaQuery.matches ? 'dark' : 'light';

  mediaQuery.addEventListener('change', (e) => {
    const newSystemTheme = e.matches ? 'dark' : 'light';

    // 检查是否应该跟随系统
    // 条件：当前用户选择的是 'system' 或者 当前用户选择的主题与原系统主题一致
    const shouldSync =
      currentTheme.value === 'system' ||
      currentTheme.value === lastSystemTheme.value;

    if (shouldSync) {
      // 如果用户选择的是明确的 light/dark（不是 system），则同步更新用户选择
      if (currentTheme.value !== 'system') {
        currentTheme.value = newSystemTheme;
        // 持久化新的主题选择
        try {
          localStorage.setItem(THEME_KEY, newSystemTheme);
        } catch {
          // localStorage may be unavailable
        }
      }
      applyTheme(currentTheme.value);
    }

    // 更新 lastSystemTheme
    lastSystemTheme.value = newSystemTheme;
  });
  isListenerAdded.value = true;
}
```

**Step 3: 完整的更新后文件**

```typescript
import { ref } from 'vue';
import type { ThemeMode } from '../types/theme';

const THEME_KEY = 'app-theme';

// 全局状态
const currentTheme = ref<ThemeMode>('dark');
const isInitialized = ref(false);
const isListenerAdded = ref(false);
const lastSystemTheme = ref<'light' | 'dark'>('dark');

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
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage may be unavailable in private browsing
  }
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
  try {
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      currentTheme.value = savedTheme;
    }
  } catch {
    // localStorage may be unavailable
  }

  applyTheme(currentTheme.value);

  // 监听系统主题变化 (只注册一次)
  if (!isListenerAdded.value && typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 初始化 lastSystemTheme
    lastSystemTheme.value = mediaQuery.matches ? 'dark' : 'light';

    mediaQuery.addEventListener('change', (e) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';

      // 检查是否应该跟随系统
      // 条件：当前用户选择的是 'system' 或者 当前用户选择的主题与原系统主题一致
      const shouldSync =
        currentTheme.value === 'system' ||
        currentTheme.value === lastSystemTheme.value;

      if (shouldSync) {
        // 如果用户选择的是明确的 light/dark（不是 system），则同步更新用户选择
        if (currentTheme.value !== 'system') {
          currentTheme.value = newSystemTheme;
          // 持久化新的主题选择
          try {
            localStorage.setItem(THEME_KEY, newSystemTheme);
          } catch {
            // localStorage may be unavailable
          }
        }
        applyTheme(currentTheme.value);
      }

      // 更新 lastSystemTheme
      lastSystemTheme.value = newSystemTheme;
    });
    isListenerAdded.value = true;
  }

  isInitialized.value = true;
}

// 立即初始化 (Tauri 桌面应用无需 SSR 支持)
initializeTheme();

export function useTheme() {
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

**Step 4: 验证类型检查通过**

Run: `pnpm build`
Expected: 构建成功无错误

**Step 5: Commit**

```bash
git add src/composables/useTheme.ts
git commit -m "feat: implement smart theme sync with system theme

- Add lastSystemTheme tracking to detect sync state
- Auto-follow system theme when user's choice matches system
- Persist synced theme preference to localStorage"
```

---

## Task 2: 更新 ThemeToggle 组件显示同步状态

**Files:**
- Modify: `src/components/ThemeToggle.vue`

**Step 1: 添加同步状态指示器**

更新组件以显示当前是否与系统同步：

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '../composables/useTheme';

const { toggleTheme, getEffectiveTheme, getSystemTheme, currentTheme } = useTheme();
const effectiveTheme = computed(() => getEffectiveTheme());

// 检查是否与系统同步
const isSyncedWithSystem = computed(() => {
  if (currentTheme.value === 'system') return true;
  return currentTheme.value === getSystemTheme();
});
</script>

<template>
  <button
    class="theme-toggle"
    :class="{ 'synced': isSyncedWithSystem }"
    @click="toggleTheme"
    :aria-label="effectiveTheme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
    :aria-pressed="effectiveTheme === 'dark'"
    :title="isSyncedWithSystem
      ? `${effectiveTheme === 'dark' ? '暗色' : '亮色'}模式（与系统同步）`
      : `${effectiveTheme === 'dark' ? '暗色' : '亮色'}模式（已锁定）`"
  >
    <!-- 太阳图标 (暗色模式时显示) -->
    <svg
      v-if="effectiveTheme === 'dark'"
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
    <!-- 月亮图标 (亮色模式时显示) -->
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
    <!-- 同步指示器 -->
    <span v-if="isSyncedWithSystem" class="sync-indicator" title="与系统同步">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
        <circle cx="4" cy="4" r="3" />
      </svg>
    </span>
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
  position: relative;
}

.theme-toggle:hover {
  background: var(--bg-card);
  color: var(--text-primary);
  border-color: var(--border-secondary);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--border-secondary);
  outline-offset: 2px;
}

.theme-toggle.synced {
  border-color: var(--accent-primary);
}

.sync-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

**Step 2: 验证构建成功**

Run: `pnpm build`
Expected: 构建成功无错误

**Step 3: Commit**

```bash
git add src/components/ThemeToggle.vue
git commit -m "feat: add sync indicator to ThemeToggle component

- Show visual indicator when theme is synced with system
- Update tooltip to show sync status"
```

---

## Task 3: 最终测试与验证

**Files:**
- 无新增文件

**Step 1: 启动开发服务器进行手动测试**

Run: `pnpm tauri dev`
Expected: 应用正常启动

**Step 2: 功能验证清单**

手动测试检查项：

1. **同步跟随测试**
   - [ ] 设置应用主题与系统主题一致（如都是 dark）
   - [ ] 切换系统主题到 light
   - [ ] 验证应用自动跟随切换到 light
   - [ ] 验证同步指示器显示

2. **非同步保持测试**
   - [ ] 设置应用主题与系统主题不一致（如应用 light，系统 dark）
   - [ ] 切换系统主题到 light
   - [ ] 验证应用保持 light 主题不变

3. **持久化测试**
   - [ ] 同步切换后刷新页面
   - [ ] 验证主题设置保持

4. **UI 状态测试**
   - [ ] 同步状态下，按钮边框显示 accent 颜色
   - [ ] 同步状态下，显示小圆点指示器
   - [ ] Hover 提示显示正确的同步状态

**Step 3: 构建生产版本**

Run: `pnpm tauri build`
Expected: 构建成功，无错误

**Step 4: Commit (如有修复)**

```bash
git add -A
git commit -m "fix: resolve theme sync issues"
```

---

## 执行注意事项

1. **同步判断逻辑**: 使用 `lastSystemTheme` 来判断用户选择时是否与系统一致
2. **持久化行为**: 同步切换后，新的主题值会被持久化到 localStorage
3. **向后兼容**: 此更新不影响现有用户，只是增加了智能同步功能
4. **UI 反馈**: 通过边框颜色和小圆点指示器让用户知道当前是否与系统同步

## 文件修改总览

```
src/
├── composables/
│   └── useTheme.ts (修改：添加智能同步逻辑)
└── components/
    └── ThemeToggle.vue (修改：添加同步状态指示)
```
