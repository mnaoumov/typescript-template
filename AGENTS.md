# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TypeScript project template with strict tooling: ESLint (strict type-checked, plus `unicorn` recommended), dprint formatting, commitlint, cspell, markdownlint. All scripts run via `jiti` from TypeScript.

- **`tsconfig.json` compiles on `lib: ["ES2024"]`, which is HIGHER than the ES2022 floor the sibling configs (`obsidian-dev-utils`, `obsidian-test-mocks`, `obsidian-typings-crawler`) carry.** A large block of their `unicorn` disables exists only because of that floor — `no-array-sort`, `prefer-iterator-helpers`, `prefer-promise-with-resolvers`, `prefer-set-methods` and the rest. None of those reasons hold here, so do not copy the block across: `no-array-sort` is satisfiable and enabled, and the one site that fires uses `toSorted`.

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
- **`scripts/`** — all npm script entry points (`jiti scripts/<name>.ts`). Each one runs inside `wrapCliTask` from `@mnaoumov/typescript-dev-toolkit/cli-utils`, which loads `.env` and skips the script when its upper-snake name is set to an off value (`LINT=0`, `SPELLCHECK=0`, ...).
- **The tooling comes from `@mnaoumov/typescript-dev-toolkit` (a devDependency), not from copies.** Process execution (`exec`, `root`), package-manager detection, `check-project-types`, `env-toggle`, the dprint and markdownlint runners, the markdownlint-cli2 schema type, and the custom ESLint rules (`inHouseEslintPlugin`, registered under `IN_HOUSE_ESLINT_PLUGIN_NAME`, which is still `obsidian-dev-utils` so the rule ids and disable comments are unchanged). **Do not copy a toolkit or `@mnaoumov/typescript-lib` module back into `scripts/helpers/`**: if something the repo needs is missing, get it exported from the package instead. Until 2026-10-15 this repo carried hand-copies of all of it, plus two gates (`check:helpers-sync`, `check:vendored-eslint-rules`) that existed only to keep the copies in step.
- **`scripts/helpers/eslint.ts` is the one helper kept locally, and it is temporary.** The toolkit's `lint()` passes `--max-warnings 0 --no-warn-ignored` but still hands ESLint's exit code straight to `execFromRoot`, so a rule that threw, a broken config or an OS-level death is reported exactly like real findings. This copy classifies the exit (`classifyEslintExit` / `describeFailureToLint`, pinned by `eslint.test.ts`, whose stderr fixtures are transcribed from real runs). It is byte-identical to `obsidian-typings-crawler`'s copy. Once `typescript-dev-toolkit` exports the classification, delete both files and import `lint` from `@mnaoumov/typescript-dev-toolkit/linters/eslint`.
- **`markdownlint-cli2` and `markdownlint-rule-relative-links` are pinned exactly (`0.23.2`, `5.1.2`).** Their next releases hoist `markdown-it` 15, whose bundled types break the rule's `index.d.ts` under this repo's deliberate `skipLibCheck: false` (`build:compile` fails with `TS2749: 'MarkdownIt' refers to a value`). Lift both pins together once the rule types against `markdown-it` 15.
- **`@typescript-eslint/method-signature-style` is `'error'` in `scripts/eslint-config.ts`, its own `property` default, and the rule is in no preset** — deleting the line turns it off. Interface members are `readonly` function properties here, never method shorthand, as in the sibling repos.
- **Testing** — vitest 5, two projects, and which one collects a file is decided entirely by where the file lives:
  - `unit-tests` — `src/**/*.test.ts`, with `scripts/**` excluded outright. Empty in the template, which is why the root config sets `passWithNoTests`.
  - `unit-tests:scripts` — `scripts/**/*.test.ts`, Node environment, default worker settings. Same name and shape as the project `obsidian-test-mocks` and `obsidian-typings-crawler` run their script suites under.
- **Adding a project with a non-default `maxWorkers`: give it its own `sequence.groupOrder`.** Vitest groups specs by `groupOrder` and refuses a group holding two projects with different worker counts — *"Projects ... have different 'maxWorkers' but same 'sequence.groupOrder'"* — and the whole run then collects **nothing**, as one unhandled error rather than a failing test. Measured on vitest 4.1.10.
- **A test file under `scripts/` or `src/` that no project's `include` covers runs NOWHERE, and `npm test` stays green.** `npm test` is a bare `vitest run`, so it reports on the projects that exist rather than on the files on disk. Before trusting a new suite, check that the test count actually moved.
- **CI** — `.github/workflows/ci.yml` runs the full gate (compile, lint, format, spellcheck, markdown lint, test) on push and PR
- **`src/`** — project source code (empty in template)
