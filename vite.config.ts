import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR!== 'true',
      watch: process.env.DISABLE_HMR === 'true'? null : {},
    },
    build: {
      // זה מה שחסר לך להכי הרבה מהירות
      outDir: 'dist',
      assetsInlineLimit: 0, // אל תהפוך תמונות ל-base64
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
          // שמות קבצים עם hash ל-cache טוב יותר
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },
    // אופטימיזציה של תלויות
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  };
});
