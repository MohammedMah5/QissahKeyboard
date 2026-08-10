import { defineConfig } from 'vite';

export default defineConfig({
  base: '/QissahKeyboard/',
  root: '.',
  publicDir: 'Assets',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    open: '/index.html',
    port: 3000,
  },
});