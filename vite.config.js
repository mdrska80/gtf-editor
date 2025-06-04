import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// Vuetify plugin
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    vue({ 
      template: { transformAssetUrls }
    }),
    // Vuetify plugin
    vuetify({
      autoImport: true, // Automatically import Vuetify components
    }),
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  build: {
    // Increase chunk size warning limit to 1000kB
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries that actually exist
          'vendor-vue': ['vue'],
          'vendor-vuetify': ['vuetify'],
          'vendor-tauri': ['@tauri-apps/api', '@tauri-apps/plugin-dialog', '@tauri-apps/plugin-opener'],
        }
      }
    }
  },
}));
