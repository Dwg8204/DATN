import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const dockerDev = process.env.DOCKER_DEV === 'true';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    open: false,
    ...(dockerDev ? {
      // Docker Desktop on Windows may not forward filesystem change events.
      watch: { usePolling: true, interval: 300 },
      hmr: { clientPort: 5173 },
      proxy: {
        '/api': {
          target: 'http://backend:3000',
          ws: true,
          timeout: 180000,
          proxyTimeout: 180000,
        },
      },
    } : {}),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts')) return 'charts';
          if (id.includes('@google/generative-ai')) return 'ai-sdk';
          if (id.includes('@dnd-kit')) return 'drag-and-drop';
          return undefined;
        },
      },
    },
  },
});
