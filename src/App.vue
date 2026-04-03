<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTheme } from './composables/useTheme';
import ThemeToggle from './components/ThemeToggle.vue';

useTheme();

const router = useRouter();
const route = useRoute();

const currentRoute = computed(() => route.name as string);

function navigate(name: string) {
  router.push({ name });
}
</script>

<template>
  <div class="app-container">
    <aside class="sidebar">
      <div class="sidebar-top">
        <div class="sidebar-logo">
          <img src="./assets/logo.svg" alt="Logo" width="36" height="36" />
          <span class="logo-title">CC 管理器</span>
        </div>

        <nav class="sidebar-nav">
          <button
            class="nav-item"
            :class="{ active: currentRoute === 'config' }"
            @click="navigate('config')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>配置管理</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: currentRoute === 'notifications' }"
            @click="navigate('notifications')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span>通知管理</span>
          </button>
        </nav>
      </div>

      <div class="sidebar-bottom">
        <ThemeToggle />
      </div>
    </aside>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style>
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
</style>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px 16px;
  border-right: 1px solid var(--border-primary);
  background: var(--bg-header);
  backdrop-filter: var(--blur-header);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.sidebar-top {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
}

.logo-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  background: var(--bg-button);
  color: var(--text-secondary);
}

.nav-item.active {
  background: var(--bg-active);
  color: var(--accent-primary);
  border-color: var(--border-focus);
}

.sidebar-bottom {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-primary);
}

.main-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}
</style>
