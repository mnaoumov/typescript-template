# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TypeScript project template with strict tooling: ESLint (strict type-checked), dprint formatting, commitlint, cspell, markdownlint. All scripts run via `jiti` from TypeScript.

## Commands

| Task              | Command                 |
| ----------------- | ----------------------- |
| TypeScript check  | `npm run build:compile` |
| Lint              | `npm run lint`          |
| Lint (fix)        | `npm run lint:fix`      |
| Format            | `npm run format`        |
| Format (check)    | `npm run format:check`  |
| Spellcheck        | `npm run spellcheck`    |
| Markdown lint     | `npm run lint:md`       |
| Markdown lint fix | `npm run lint:md:fix`   |
| Test              | `npm run test`          |
| Test (coverage)   | `npm run test:coverage` |
| Test (watch)      | `npm run test:watch`    |
| Commit (wizard)   | `npm run commit`        |

## Architecture

- **Root config files** are thin re-exports — actual logic lives in `scripts/`:
  - `eslint.config.mts` -> `scripts/eslint-config.ts`
  - `commitlint.config.ts` -> `scripts/commitlint-config.ts`
  - `.markdownlint-cli2.mjs` -> `scripts/markdownlint-cli2-config.ts`
  - `.nano-staged.mjs` -> `scripts/nano-staged-config.ts`
  - `vitest.config.ts` -> `scripts/vitest-config.ts`
- **`scripts/`** — all npm script entry points (`jiti scripts/<name>.ts`)
- **`scripts/helpers/`** — shared utilities (exec, root, format, eslint, markdownlint, package-manager, type-guards)
- **`scripts/helpers/eslint-rules/`** — custom ESLint rules under the `obsidian-dev-utils` plugin namespace, each with a `*.test.ts`: `no-async-callback-to-unsafe-return`, `no-unused-params-members`, `no-used-underscore-variables`, `params-options-name-match`, `readonly-params-options-result-members`, `require-method-template`
- **Testing** — vitest, three projects, and which one collects a file is decided entirely by where the file lives:
  - `unit-tests` — `src/**/*.test.ts`, with `scripts/**` excluded outright. Empty in the template, which is why the root config sets `passWithNoTests`.
  - `eslint-rules` — `scripts/helpers/eslint-rules/*.test.ts`. Non-isolated and single-worker, because the rule tester keeps module-level state; `tsconfig.eslint-test.json` types the one type-aware rule.
  - `unit-tests:scripts` — the rest of `scripts/**/*.test.ts`, Node environment, default worker settings. Same name and shape as the project `obsidian-test-mocks` and `obsidian-typings-crawler` run their own copies of these files under.
- **Adding a fourth project: leave `maxWorkers` alone, or give it its own `sequence.groupOrder`.** Vitest groups specs by `groupOrder` and refuses a group holding two projects with different worker counts — *"Projects ... have different 'maxWorkers' but same 'sequence.groupOrder'"* — and the whole run then collects **nothing**, as one unhandled error rather than a failing test. That is why `eslint-rules` carries `sequence: { groupOrder: 1 }`. Measured on vitest 4.1.10; it is not a Vitest 5 concern to defer. It stayed hidden here for as long as it did only because `src/` is empty, so `unit-tests` contributed no specs and `eslint-rules` was alone in its group.
- **A test file under `scripts/` that no project's `include` covers runs NOWHERE, and `npm test` stays green.** `npm test` is a bare `vitest run`, so it reports on the projects that exist rather than on the files on disk. Before trusting a new suite, check that the test count actually moved.
- **CI** — `.github/workflows/ci.yml` runs the full gate (compile, lint, format, spellcheck, markdown lint, test) on push and PR
- **`src/`** — project source code (empty in template)
