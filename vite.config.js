import { defineConfig } from 'vite';

export default defineConfig({
  base: '/QissahKeyboard/',
  root: '.',
  // Static media (images, narrations, keyboard sounds) lives in public/assets/.
  // Vite copies this directory verbatim into dist/ — it MUST match the real folder
  // name ('public'), otherwise no media is shipped to GitHub Pages.
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        privacy: './privacy.html',
        terms: './terms.html',
      },
      output: {
        // Rolldown-Vite rejects leading "./" here — use plain subdirectory patterns
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