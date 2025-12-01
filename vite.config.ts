import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { URL } from 'url'; // Use the standard URL API

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        watch: {
          ignored: ['**/functions/**'],
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // Use URL to resolve the path, avoiding Node.js 'path' module
          '@': new URL('.', import.meta.url).pathname,
        }
      }
    };
});
