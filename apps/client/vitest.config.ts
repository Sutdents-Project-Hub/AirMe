import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
  },
  test: {
    exclude: ['dist/**', 'node_modules/**'],
    restoreMocks: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
