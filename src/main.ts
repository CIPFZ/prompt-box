import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

// 禁用右键菜单
document.addEventListener('contextmenu', (event) => {
    // 只有在生产环境 (打包后) 才禁用，开发环境保留以便你自己调试
    // 如果你想在开发环境也禁用，去掉这个 if 判断即可
    if (import.meta.env.PROD) {
        event.preventDefault();
    }
});

// 禁用 F12 和 F5 刷新等快捷键，让应用更像原生软件
document.addEventListener('keydown', (event) => {
    if (import.meta.env.PROD) {
        // 禁用 F12 (打开控制台)
        if (event.key === 'F12') {
            event.preventDefault();
        }
        // 禁用 F5 (刷新)
        if (event.key === 'F5') {
            event.preventDefault();
        }
        // 禁用 Ctrl+R (刷新)
        if (event.ctrlKey && (event.key === 'r' || event.key === 'R')) {
            event.preventDefault();
        }
    }
});

createApp(App).mount("#app");
