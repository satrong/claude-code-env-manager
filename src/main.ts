import { createApp } from "vue";
import App from "./App.vue";

// 生产环境禁用右键菜单
if (import.meta.env.PROD) {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
}

createApp(App).mount("#app");
