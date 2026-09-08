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
      '/transcript': 'http://localhost:3000',
      '/templates': 'http://localhost:3000',
      '/versions': 'http://localhost:3000',
      '/jobs': 'http://localhost:3000',
      '/capture': 'http://localhost:3000',
      '/mockup': 'http://localhost:3000',
      '/freeze': 'http://localhost:3000',
      '/reverse': 'http://localhost:3000',
      '/generate': 'http://localhost:3000',
      '/mockups': 'http://localhost:3000',
      '/fixture.html': 'http://localhost:3000',
    },
  },
});
