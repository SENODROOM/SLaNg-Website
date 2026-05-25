import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import fs from 'fs';

const sanitizeSlangmath = {
  name: 'sanitize-slangmath',
  enforce: 'pre',
  load(id) {
    if (id.includes('/slangmath/') && id.endsWith('.js')) {
      let code = fs.readFileSync(id, 'utf-8');
      code = code.replace(/[^\x00-\x7F]/g, ' ');
      return code;
    }
  }
};

export default defineConfig({
  plugins: [sanitizeSlangmath, svelte()],
  cacheDir: '/tmp/vite-cache'
});
