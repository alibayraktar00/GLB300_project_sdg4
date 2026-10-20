import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      // `server-only` paketi tarayıcı/test ortamında bilerek hata verir; testlerde etkisiz bir dosyayla değiştirilir.
      'server-only': fromRoot('./src/test/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'e2e'],
    restoreMocks: true,
    unstubEnvs: true,
  },
});
