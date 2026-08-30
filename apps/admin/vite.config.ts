import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Env is selected at build time via VITE_ENV; per-env API/Cognito values come from .env files
// generated from the matching CDK stack outputs (see apps/admin/README.md).
export default defineConfig({
  define: { global: 'globalThis' },
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: false },
});
