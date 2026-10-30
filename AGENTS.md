# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Filing an issue (for AI agents and humans)

Open issues through the [issue forms](https://github.com/mnaoumov/typescript-template/issues/new/choose), not as blank issues.

Filing from the CLI or the API (`gh issue create --body`, or an AI agent filing for you) skips the form, and `gh issue create --template` cannot load an issue form. In that case, open the matching form in [`.github/ISSUE_TEMPLATE/`](https://github.com/mnaoumov/typescript-template/tree/HEAD/.github/ISSUE_TEMPLATE), copy every field as a `### <label>` heading in the form's order, and fill in each one. Always state the version you used and your operating system.

## Overview

TypeScript project template with strict tooling: ESLint (strict type-checked, plus `unicorn` recommended), dprint formatting, commitlint, cspell, markdownlint. All scripts run via `jiti` from TypeScript.

- **`tsconfig.json` compiles on `lib: ["ES2024"]`, which is HIGHER than the ES2022 floor the sibling configs (`obsidian-test-mocks`, `obsidian-typings-crawler`) carry.** A large block of their `unicorn` disables exists only because of that floor — `no-array-sort`, `prefer-iterator-helpers`, `prefer-promise-with-resolvers`, `prefer-set-methods` and the rest. None of those reasons hold here, so do not copy the block across: `no-array-sort` is satisfiable and enabled, and the one site that fires uses `toSorted`.

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
- **The tooling comes from `@mnaoumov/typescript-dev-toolkit` (a devDependency), not from copies.** Process execution (`exec`, `root`), package-manager detection, `check-project-types`, `env-toggle`, the dprint and markdownlint runners, the markdownlint-cli2 schema type, and the custom ESLint rules (`inHouseEslintPlugin`, registered under `IN_HOUSE_ESLINT_PLUGIN_NAME`, which is `typescript-dev-toolkit` since the toolkit's 2.0.0, so every rule id and disable comment is spelled `typescript-dev-toolkit/<rule>`). **Do not copy a toolkit or `@mnaoumov/typescript-lib` module back into `scripts/helpers/`**: if something the repo needs is missing, get it exported from the package instead. Until 2026-10-15 this repo carried hand-copies of all of it, plus two gates (`check:helpers-sync`, `check:vendored-eslint-rules`) that existed only to keep the copies in step.
- **`lint` / `lint:fix` take `lint` from `@mnaoumov/typescript-dev-toolkit/linters/eslint` (1.1.0+), which tells a crashed linter apart from findings.** A rule that threw, a broken config or an OS-level death throws a message saying the source was NOT judged; only ESLint's exit `1` without its abort banner reads as lint problems. Until 2026-10-15 a local `scripts/helpers/eslint.ts` carried that classification while the toolkit lacked it — do not bring it back.
- **`skipLibCheck` is `true`, and `scripts/build-compile.ts` re-checks the project's own files with it off.** markdownlint 0.42, which the toolkit's markdownlint-cli2 0.24 requires, ships a `lib/resolve-module.d.cts` that fails `TS2309`, and no setting of ours can fix a declaration inside `node_modules`. The second pass prints `Ignored N diagnostic(s) outside the validated set.`; once `N` is `0`, flip `skipLibCheck` back to `false`.
- **`@typescript-eslint/method-signature-style` is `'error'` in `scripts/eslint-config.ts`, its own `property` default, and the rule is in no preset** — deleting the line turns it off. Interface members are `readonly` function properties here, never method shorthand, as in the sibling repos.
- **Testing** — vitest 5, two projects, and which one collects a file is decided entirely by where the file lives:
  - `unit-tests` — `src/**/*.test.ts`, with `scripts/**` excluded outright. Empty in the template, which is why the root config sets `passWithNoTests`.
  - `unit-tests:scripts` — `scripts/**/*.test.ts`, Node environment, default worker settings. Same name and shape as the project `obsidian-test-mocks` and `obsidian-typings-crawler` run their script suites under. Also empty since the local ESLint helper and its test went into the toolkit, so `npm test` currently collects nothing at all.
- **Adding a project with a non-default `maxWorkers`: give it its own `sequence.groupOrder`.** Vitest groups specs by `groupOrder` and refuses a group holding two projects with different worker counts — *"Projects ... have different 'maxWorkers' but same 'sequence.groupOrder'"* — and the whole run then collects **nothing**, as one unhandled error rather than a failing test. Measured on vitest 4.1.10.
- **A test file under `scripts/` or `src/` that no project's `include` covers runs NOWHERE, and `npm test` stays green.** `npm test` is a bare `vitest run`, so it reports on the projects that exist rather than on the files on disk. Before trusting a new suite, check that the test count actually moved.
- **`pinned-versions.json`** — every exact pin and every advisory-driven override in `package.json` has an entry here, with a `check`/`expect` pair the dependency sweep re-runs to say when the pin can go. Today: `typescript` 6.0.3 (TypeScript 7 breaks `typescript-eslint`) and `overrides.re2js` (GHSA-gg6h-894w-4m9c, until a markdownlint-cli2 release pins a markdownlint on re2js 2.8.7+) and `overrides.katex` (GHSA-238p-pmpm-9mq7, until markdownlint's `micromark-extension-math` requests katex 0.18.2+). Add an entry with any new pin.
- **CI** — `.github/workflows/ci.yml` runs the full gate (compile, lint, format, spellcheck, markdown lint, test) on push and PR
- **`src/`** — project source code (empty in template)
