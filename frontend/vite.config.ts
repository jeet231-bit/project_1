import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify("https://iohwtyikyyfmslenmhyd.supabase.co"),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify("sb_publishable_8V6qvWQQHlflmtM3pomS9A_Dgzr6Yqk"),
      'import.meta.env.VITE_API_URL': JSON.stringify("http://localhost:8000")
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      }
    }
  };
});
