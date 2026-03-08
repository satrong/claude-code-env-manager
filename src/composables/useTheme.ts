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
