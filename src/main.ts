import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles/themes.css";

if (import.meta.env.PROD) {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
}

createApp(App).use(router).mount("#app");
