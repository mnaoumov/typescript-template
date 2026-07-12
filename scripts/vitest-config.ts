import { defineConfig } from 'vitest/config';

export const config = defineConfig({
  test: {
    coverage: {
      exclude: [
        'src/**/@types/**',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/index.ts'
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage'
    },
    environment: 'node',
    exclude: ['dist', 'node_modules'],
    globals: false,
    include: ['src/**/*.test.ts'],
    passWithNoTests: true
  }
});
