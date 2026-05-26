import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  publicDir: 'static',
  define: {
    'process.argv': '["", ""]'
  },
  resolve: {
    alias: [
      { find: /^slangmath$/, replacement: resolve('src/lib/slangmath-demo.js') }
    ]
  },
  cacheDir: '/tmp/vite-cache'
});
