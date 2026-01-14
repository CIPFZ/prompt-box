import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
    ],
    // Tauri 推荐配置
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: true || "0.0.0.0",
    },
});