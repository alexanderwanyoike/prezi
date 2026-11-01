import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: { build: { rolldownOptions: { input: resolve('src/main/index.ts') } } },
  preload: {
    build: {
      externalizeDeps: false,
      rolldownOptions: {
        input: resolve('src/preload/index.ts'),
        output: { format: 'cjs', entryFileNames: 'index.cjs' },
      },
    },
  },
  renderer: { root: 'src/renderer', plugins: [react()] },
});
