import { defineConfig } from 'vitest/config';

const SHARED_EXCLUDE = ['dist', 'node_modules'];

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
    exclude: SHARED_EXCLUDE,
    globals: false,
    passWithNoTests: true,
    projects: [
      {
        test: {
          environment: 'node',
          exclude: [...SHARED_EXCLUDE, 'scripts/**'],
          include: ['src/**/*.test.ts'],
          name: 'unit-tests'
        }
      },
      {
        test: {
          environment: 'node',
          include: ['scripts/helpers/eslint-rules/*.test.ts'],
          // The rule tester keeps module-level state, so the rule tests must run serially in a single worker without isolation.
          isolate: false,
          maxWorkers: 1,
          name: 'eslint-rules'
        }
      }
    ]
  }
});
