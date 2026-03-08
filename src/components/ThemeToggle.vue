<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '../composables/useTheme';

const { toggleTheme, getEffectiveTheme } = useTheme();
const effectiveTheme = computed(() => getEffectiveTheme());
</script>

<template>
  <button
    class="theme-toggle"
    @click="toggleTheme"
    :aria-label="effectiveTheme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
    :aria-pressed="effectiveTheme === 'dark'"
    :title="effectiveTheme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
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

.theme-toggle:focus-visible {
  outline: 2px solid var(--border-secondary);
  outline-offset: 2px;
}
</style>
