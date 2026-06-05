import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vitejs.dev/config/
//
// Backend proxy: `/api/*` requests from the frontend are tunnelled to the
// backend at http://localhost:3000. Frontend stays same-origin (the SW /
// MSW interception still works for routes the toggle says to mock).
//
// Override the proxy target via env var if your backend runs elsewhere:
//   VITE_BACKEND_PROXY=http://192.168.1.10:3000 pnpm dev
const BACKEND_PROXY_TARGET =
  process.env.VITE_BACKEND_PROXY ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // expose on LAN for mobile testing — per CLAUDE.md mobile-first rule
    proxy: {
      '/api': {
        target: BACKEND_PROXY_TARGET,
        changeOrigin: true,
        // Cookies: pass through Set-Cookie headers from the backend so the
        // browser stores the httpOnly refresh-token cookie correctly.
        cookieDomainRewrite: 'localhost',
        // Don't crash dev when the backend isn't running — log instead.
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // console.warn is permitted by our ESLint config.
            console.warn(
              `[Vite proxy] backend unreachable (${BACKEND_PROXY_TARGET}): ${err.message}. ` +
                `Set VITE_USE_MSW=true in frontend/.env to use the MSW mock instead.`,
            );
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(502, { 'content-type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'error',
                  message: 'Backend unreachable. Is it running?',
                  code: 'BACKEND_DOWN',
                }),
              );
            }
          });
        },
      },
    },
  },
  preview: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
