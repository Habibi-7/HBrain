import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/habits-api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/habits-api/, '/api'),
      },
      '/api': {
        target: 'http://localhost:5600',
        changeOrigin: true,
      },
    },
  },
});
