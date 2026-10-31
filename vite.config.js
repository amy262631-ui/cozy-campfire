import { defineConfig } from 'vite';

export default defineConfig({
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
    chunkSizeWarningLimit: 1000,
  },
});
