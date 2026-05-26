import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      slangmath: resolve('../slang-math.js')
    }
  },
  cacheDir: '/tmp/vite-cache'
});
