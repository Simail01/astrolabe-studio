import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@astrolabe/shared': path.resolve(__dirname, '../../shared/src'),
    },
  },
  test: {
    environment: 'node',
  },
});
