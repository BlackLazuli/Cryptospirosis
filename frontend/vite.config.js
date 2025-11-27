import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
  ],
  define: {
    // Make Buffer available globally
    global: 'globalThis',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  build: {
    // Ensure WASM files are handled correctly
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    // Ensure these are pre-bundled
    include: ['buffer'],
    // Exclude WASM files from optimization
    exclude: ['@emurgo/cardano-serialization-lib-browser'],
  },
  worker: {
    // Enable WASM in workers
    plugins: [wasm()],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
});

