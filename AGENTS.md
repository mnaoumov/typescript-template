# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Task

### T14 — bring the template up to date with eslint 10 (two deprecation/semantics defects)

<!-- Id T14 is on the user's global T-counter (not repo-local); it is the prerequisite for paperio2's T15. -->

Surfaced 2026-07-12 while applying this template to `F:\dev\@\paperio2\ts` (that project's strict-tooling adoption is **blocked on this task**). Under a fresh install with `eslint ^10.2.0` and the current plugin set, applying the config to a non-empty `src/` trips two issues:

1. **Deprecated `includeIgnoreFile` import.** `scripts/eslint-config.ts` does `import { includeIgnoreFile } from '@eslint/compat';` — deprecated under eslint 10 (flagged by both `import-x/no-deprecated` and `@typescript-eslint/no-deprecated`). It moved to `eslint/config` (also `@eslint/config-helpers`). Fix: import it from `eslint/config` — it can join the existing `import { defineConfig } from 'eslint/config';` line — and drop the now-obsolete `// eslint-disable-next-line import-x/named -- …` comment above the old import. `@stylistic/object-curly-newline` requires a 2+-specifier named import to be multiline, so the merged `defineConfig` + `includeIgnoreFile` import must be a multiline block (dprint/`format` handles that). Confirm whether the template's *currently pinned* versions already flag this; if not, it will once versions bump.

2. **`@packageDocumentation` used as the per-file overview marker.** In `scripts/eslint-config.ts`, `jsdoc/require-file-overview` mandates `@packageDocumentation` on every `src/**` file, and `jsdoc/check-tag-names` `definedTags` lists it. But `@packageDocumentation` is TSDoc for a *single package entry point* (one per package) — semantically wrong as a generic file-overview tag, especially for a multi-file / non-package `src/`. The template's own `scripts/` all use the standard `@file`. This is **latent in the template** because its `src/` is empty (nothing to overview, so its own lint passes); it bit `paperio2` because that `src/` has real files. Fix: change `require-file-overview` to require **`@file`** (standard jsdoc tag; needs no `definedTags` entry), and remove `packageDocumentation` from `check-tag-names` `definedTags` (unless still used elsewhere). No template `src/` files to convert (empty).

**Also:** audit for other eslint-10 / dependency deprecations while here — these only surface against a fresh install, so pinned/installed versions may hide more.

**Propagation:** `scripts/eslint-config.ts` is one of the tooling scripts kept byte-identical across the sibling repos (`obsidian-dev-utils`, `obsidian-test-mocks`, `obsidian-integration-testing`, `obsidian-typings-crawler`, `obsidian-typings`). After fixing it here, propagate the identical change to all of them — and to `obsidian-typings` on `main` plus its latest public and catalyst release branches. Do not leave copies divergent.

**Verify:** `npm run lint` + `lint:fix` clean, `format`/`format:check` clean, `build:compile` green.

Remove this section once done.

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
