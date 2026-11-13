import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// base './' so the build works under https://<user>.github.io/<repo>/
// demo.example is the stand-in "live domain" used by test/browser.mjs.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        upstream: resolve(__dirname, 'upstream/demo.html'),
      },
    },
  },
  preview: { allowedHosts: ['demo.example'] },
});
