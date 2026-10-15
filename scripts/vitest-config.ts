import { defineConfig } from 'vitest/config';

const SHARED_EXCLUDE = ['dist', 'node_modules'];
const SCRIPTS_TEST_FILES = 'scripts/**/*.test.ts';

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
        /*
         * The scripts tree, which `unit-tests` excludes outright: without this project a test file under
         * `scripts/` ran nowhere and `npm test` stayed green while proving nothing. Same name and shape as the
         * project `obsidian-test-mocks` and `obsidian-typings-crawler` run their own script suites under.
         */
        test: {
          environment: 'node',
          include: [SCRIPTS_TEST_FILES],
          name: 'unit-tests:scripts'
        }
      }
    ]
  }
});
