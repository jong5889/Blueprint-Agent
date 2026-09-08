import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dashboard SPA (suman slice). Dev proxies API+SSE to the Fastify server on :3000.
export default defineConfig({
  root: 'dashboard',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      '/events': { target: 'http://localhost:3000', ws: true },
      '/projects': 'http://localhost:3000',
      '/meetings': 'http://localhost:3000',
      '/jobs': 'http://localhost:3000',
      '/extract': 'http://localhost:3000',
      '/mockup': 'http://localhost:3000',
      '/coverage': 'http://localhost:3000',
      '/freeze': 'http://localhost:3000',
      '/export': 'http://localhost:3000',
      '/import': 'http://localhost:3000',
      '/mockups': 'http://localhost:3000',
      '/fixture.html': 'http://localhost:3000',
    },
  },
});
