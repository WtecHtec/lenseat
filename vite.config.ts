import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = (env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:3000')
    .trim()
    .replace(/\/+$/, '');

  let proxyTarget = apiBase;
  let subpath = '';
  try {
    const url = new URL(apiBase);
    if (url.pathname && url.pathname !== '/') {
      subpath = url.pathname.replace(/\/+$/, '');
      proxyTarget = url.origin;
    }
  } catch {
    // Keep fallback
  }

  return {
    plugins: [react(), tailwindcss()],
    base: "./",
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => (subpath ? `${subpath}${p}` : p),
        },
      },
    },
  };
});
