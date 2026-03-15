import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This file tells Vercel to use modern JavaScript (ESNext)
// which fixes the "import.meta is not available" error.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext'
  },
  server: {
    port: 3000
  }
});
