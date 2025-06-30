import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: path.resolve(__dirname, 'node_modules/monaco-editor/min/vs'),
    //       dest: 'monaco-editor',
    //     },
    //   ],
    // }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
  },
});
