import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { createCoachHandler } from './server/coach-handler';
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'hyperfocus-coaching',
      configureServer(server) {
        server.middlewares.use(
          createCoachHandler({
            env: { ...process.env, ...loadEnv(mode, process.cwd(), 'COACH_') },
          }),
        );
      },
    },
  ],
  server: { port: 5180, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: { include: ['src/**/*.test.ts'] },
}));
