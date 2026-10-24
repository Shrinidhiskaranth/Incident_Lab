import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      // Needed for hot reload inside Docker on Windows/macOS bind mounts
      usePolling: true,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
});
