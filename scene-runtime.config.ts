import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/scene-runtime',
  base: './',
  plugins: [react()],
  build: {
    outDir: resolve('out/scenes'),
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        index: resolve('src/scene-runtime/index.html'),
        react: resolve('src/scene-runtime/modules/react.ts'),
        'jsx-runtime': resolve('src/scene-runtime/modules/jsx-runtime.ts'),
        remotion: resolve('src/scene-runtime/modules/remotion.ts'),
        prezi: resolve('src/scene-runtime/modules/prezi.ts'),
      },
      preserveEntrySignatures: 'strict',
      output: { entryFileNames: '[name].js' },
    },
  },
});
