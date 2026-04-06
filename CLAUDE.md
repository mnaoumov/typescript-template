# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TypeScript project template with strict tooling: ESLint (strict type-checked), dprint formatting, commitlint, cspell, markdownlint. All scripts run via `jiti` from TypeScript.

## Commands

| Task              | Command                   |
|-------------------|---------------------------|
| TypeScript check  | `npm run build:compile`   |
| Lint              | `npm run lint`            |
| Lint (fix)        | `npm run lint:fix`        |
| Format            | `npm run format`          |
| Format (check)    | `npm run format:check`    |
| Spellcheck        | `npm run spellcheck`      |
| Markdown lint     | `npm run lint:md`         |
| Markdown lint fix | `npm run lint:md:fix`     |
| Commit (wizard)   | `npm run commit`          |

## Architecture

- **Root config files** are thin re-exports — actual logic lives in `scripts/`:
  - `eslint.config.mts` -> `scripts/eslint-config.ts`
  - `commitlint.config.ts` -> `scripts/commitlint-config.ts`
  - `.markdownlint-cli2.mjs` -> `scripts/markdownlint-cli2-config.ts`
  - `.nano-staged.mjs` -> `scripts/nano-staged-config.ts`
- **`scripts/`** — all npm script entry points (`jiti scripts/<name>.ts`)
- **`scripts/helpers/`** — shared utilities (exec, root, format, eslint, markdownlint, type-guards)
- **`scripts/helpers/eslint-rules/`** — custom ESLint rules (no-used-underscore-variables, no-async-callback-to-unsafe-return)
- **`src/`** — project source code (empty in template)

## Current Task

_(none)_

## Known Issues

_(none)_
