import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // your build output folder
    assetsDir: 'public', // assets inside dist/assets
    sourcemap: false,    // optional
    emptyOutDir: true,
    rollupOptions: {
      input: './src/main.ts', // 👈 your entry point
      output: {
        format: 'es', // 'es' for modern browsers
        entryFileNames: 'main.js', // 👈 generate main.js
      },
    },
  },
});
