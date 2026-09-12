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
- **Testing** — vitest; unit tests in `src/**/*.test.ts`, ESLint-rule tests in `scripts/helpers/eslint-rules/*.test.ts` (a dedicated non-isolated `eslint-rules` project; `tsconfig.eslint-test.json` types the one type-aware rule)
- **CI** — `.github/workflows/ci.yml` runs the full gate (compile, lint, format, spellcheck, markdown lint, test) on push and PR
- **`src/`** — project source code (empty in template)
