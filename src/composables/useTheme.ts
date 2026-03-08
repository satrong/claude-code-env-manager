import { ref } from 'vue';
import type { ThemeMode } from '../types/theme';

const THEME_KEY = 'app-theme';

// 全局状态
const currentTheme = ref<ThemeMode>('dark');
const isInitialized = ref(false);
const isListenerAdded = ref(false);

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
    mediaQuery.addEventListener('change', () => {
      if (currentTheme.value === 'system') {
        applyTheme('system');
      }
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
