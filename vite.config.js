import { defineConfig } from 'vite';

/** 上架其他平台的版本（npm run build:portal）：網頁放在平台上，連回正式伺服器 */
const PORTAL_SERVER = 'https://cozy-campfire-6sf0.onrender.com';

export default defineConfig(({ mode }) => {
  // 平台版：不用 .env.portal 檔（GitHub 網頁上傳會漏掉 . 開頭的檔案），直接寫在這裡
  if (mode === 'portal' && !process.env.VITE_SERVER_URL) process.env.VITE_SERVER_URL = PORTAL_SERVER;
  process.env.VITE_SERVER_URL ??= ''; // 正式網站：同一個網站，不用另外指定
  return {
    base: './',
    server: {
      host: true,
      port: 5173,
      // 開發時把連線轉給 npm run server 啟動的伺服器（埠 3000）
      proxy: {
        '/socket.io': { target: 'http://localhost:3000', ws: true },
        '/api': 'http://localhost:3000',
      },
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1400,
    },
  };
});
