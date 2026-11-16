import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API = process.env.API_PROXY ?? 'http://localhost:8100';

// Dev: /api, /media and /readyz are proxied to the Rust API (API_PROXY). Prod: the API serves dist/ itself.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5180,
    proxy: Object.fromEntries(['/api', '/media', '/readyz'].map((prefix) => [prefix, { target: API, changeOrigin: true }])),
  },
  // Pre-bundle every runtime dependency at start-up: discovering one mid-session makes Vite re-optimise and briefly
  // serve two copies of React (invalid hook call → blank page). Keep this list in sync with package.json.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'motion',
      'motion/react',
      'lenis',
      'recharts',
      'get-nonce',
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tooltip',
    ],
  },
  build: {
    // fonts stay files: the server CSP allows fonts from self only (no data: URIs)
    assetsInlineLimit: (file) => (file.endsWith(".woff2") ? false : undefined),
    target: 'es2022',
    cssMinify: true,
    // The page's own <script> and its static imports are preloaded from index.html as usual. A lazy chunk's dependency list is not
    // written into the first bundle (Vite's __vitePreload map grows with every icon and page: ~2 KB gzip here); App.tsx fetches every
    // lazy chunk once the browser is idle instead, so navigation never waits on a waterfall.
    modulePreload: { polyfill: false, resolveDependencies: (_file, dependencies, context) => (context.hostType === 'html' ? dependencies : []) },
  },
});
