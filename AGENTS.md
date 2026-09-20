# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TypeScript project template with strict tooling: ESLint (strict type-checked), dprint formatting, commitlint, cspell, markdownlint. All scripts run via `jiti` from TypeScript.

## Commands

| Task                  | Command                               |
| --------------------- | ------------------------------------- |
| TypeScript check      | `npm run build:compile`               |
| Lint                  | `npm run lint`                        |
| Lint (fix)            | `npm run lint:fix`                    |
| Format                | `npm run format`                      |
| Format (check)        | `npm run format:check`                |
| Spellcheck            | `npm run spellcheck`                  |
| Markdown lint         | `npm run lint:md`                     |
| Markdown lint fix     | `npm run lint:md:fix`                 |
| Vendored rules check  | `npm run check:vendored-eslint-rules` |
| Test                  | `npm run test`                        |
| Test (coverage)       | `npm run test:coverage`               |
| Test (watch)          | `npm run test:watch`                  |
| Commit (wizard)       | `npm run commit`                      |

## Architecture

- **Root config files** are thin re-exports — actual logic lives in `scripts/`:
  - `eslint.config.mts` -> `scripts/eslint-config.ts`
  - `commitlint.config.ts` -> `scripts/commitlint-config.ts`
  - `.markdownlint-cli2.mjs` -> `scripts/markdownlint-cli2-config.ts`
  - `.nano-staged.mjs` -> `scripts/nano-staged-config.ts`
  - `vitest.config.ts` -> `scripts/vitest-config.ts`
- **`scripts/`** — all npm script entry points (`jiti scripts/<name>.ts`)
- **`scripts/helpers/`** — shared utilities (exec, root, format, eslint, markdownlint, package-manager, type-guards, git-content)
- **`scripts/helpers/eslint-rules/`** — custom ESLint rules under the `obsidian-dev-utils` plugin namespace, each with a `*.test.ts`: `no-async-callback-to-unsafe-return`, `no-unused-params-members`, `no-used-underscore-variables`, `params-options-name-match`, `readonly-params-options-result-members`, `require-method-template`
- **Those rule sources are VENDORED COPIES of `obsidian-dev-utils/src/script-utils/linters/eslint-rules/`, not local code — take an upstream change whole rather than hand-editing one.** The `*.test.ts` files and `rule-tester-helper.ts` are byte-identical to upstream; the sources carry exactly three standing deltas, and anything else is drift to reconcile:
  1. `from '../../../type-guards.ts'` becomes `from '../type-guards.ts'` — the helper sits one level up here, not three.
  2. Inline `// eslint-disable-next-line unicorn/…` comments are stripped. This repo does not install `eslint-plugin-unicorn`, and ESLint fails the **entire** run with *"Definition for rule was not found"* on an unresolvable rule reference — a file-scoped `'unicorn/…': 'off'` override fails the same way, so stripping is the only shape available.
  3. `require-method-template.ts` reads its named groups with the local `ensureNonNullable` instead of upstream's `getMandatoryNamedGroup`, whose module is a 238-line `reg-exp.ts` no sibling vendors. The file says so at the import.
  `require-method-template` is vendored **only** here; `obsidian-test-mocks`, `obsidian-typings-crawler` and `obsidian-integration-testing` carry the other five.
- **`npm run check:vendored-eslint-rules` is what enforces the paragraph above** — it lists upstream's directory, fetches each source from `raw.githubusercontent.com`, applies the three deltas as *transform arms*, and asserts byte-identity. Three things about it are load-bearing:
  1. **A delta is recorded as the transform that reproduces it, not as prose.** Accepting a new divergence means adding an arm, which every later run then enforces. Arm 3 matches upstream's `getMandatoryNamedGroup` lines as literal text, so an upstream rewrite of them no-ops the replacement and the file is reported — which is the right answer, because a moved shape wants a human's eyes.
  2. **It walks for the NAME, not the directory**, so a second vendored tree anywhere in the repo cannot hide from it. A walk that finds nothing at all is reported as a failure rather than passed.
  3. **It reads this repo's side out of the git index** (`scripts/helpers/git-content.ts`), not off disk. It runs from nano-staged beside `lint:fix` and `format`, which rewrite staged files in place; nano-staged runs its per-pattern groups with `Promise.all`, so no key order makes this follow them. Reading the index makes the race irrelevant instead of trying to lose it. An untracked copy has no staged bytes and falls back to disk.
  It also runs in CI, which the hook cannot substitute for: a copy is only staged when somebody is editing it, so upstream moving underneath a tree nobody touches is invisible to a pre-commit gate. `CHECK_VENDORED_ESLINT_RULES=0` turns it off for a run, offline or wherever the fetch is unwelcome.
- **Testing** — vitest, three projects, and which one collects a file is decided entirely by where the file lives:
  - `unit-tests` — `src/**/*.test.ts`, with `scripts/**` excluded outright. Empty in the template, which is why the root config sets `passWithNoTests`.
  - `eslint-rules` — `scripts/helpers/eslint-rules/*.test.ts`. Non-isolated and single-worker, because the rule tester keeps module-level state; `tsconfig.eslint-test.json` types the one type-aware rule.
  - `unit-tests:scripts` — the rest of `scripts/**/*.test.ts`, Node environment, default worker settings. Same name and shape as the project `obsidian-test-mocks` and `obsidian-typings-crawler` run their own copies of these files under.
- **Adding a fourth project: leave `maxWorkers` alone, or give it its own `sequence.groupOrder`.** Vitest groups specs by `groupOrder` and refuses a group holding two projects with different worker counts — *"Projects ... have different 'maxWorkers' but same 'sequence.groupOrder'"* — and the whole run then collects **nothing**, as one unhandled error rather than a failing test. That is why `eslint-rules` carries `sequence: { groupOrder: 1 }`. Measured on vitest 4.1.10; it is not a Vitest 5 concern to defer. It stayed hidden here for as long as it did only because `src/` is empty, so `unit-tests` contributed no specs and `eslint-rules` was alone in its group.
- **A test file under `scripts/` that no project's `include` covers runs NOWHERE, and `npm test` stays green.** `npm test` is a bare `vitest run`, so it reports on the projects that exist rather than on the files on disk. Before trusting a new suite, check that the test count actually moved.
- **CI** — `.github/workflows/ci.yml` runs the full gate (compile, lint, format, spellcheck, markdown lint, vendored-rules check, test) on push and PR
- **`src/`** — project source code (empty in template)
