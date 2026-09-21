# TypeScript Template

Opinionated TypeScript project template with strict tooling pre-configured.

## What's included

| Tool                                                         | Purpose                                      |
| ------------------------------------------------------------ | -------------------------------------------- |
| [TypeScript](https://www.typescriptlang.org/)                | Type checking (`@tsconfig/strictest`)        |
| [ESLint](https://eslint.org/)                                | Linting (strict type-checked + custom rules) |
| [dprint](https://dprint.dev/)                                | Code formatting                              |
| [cspell](https://cspell.org/)                                | Spell checking                               |
| [markdownlint](https://github.com/DavidAnson/markdownlint)   | Markdown linting                             |
| [commitlint](https://commitlint.js.org/)                     | Conventional commit messages                 |
| [husky](https://typicode.github.io/husky/)                   | Git hooks                                    |
| [nano-staged](https://github.com/usmanyunusov/nano-staged)   | Pre-commit staged file checks                |
| [commitizen](https://commitizen-tools.github.io/commitizen/) | Commit message wizard                        |

All scripts are written in TypeScript and executed via [jiti](https://github.com/unjs/jiti).

## Usage

```bash
npx degit mnaoumov/typescript-template my-project
cd my-project
npm install
```

## Commands

| Command                               | Description                                       |
| ------------------------------------- | ------------------------------------------------- |
| `npm run build:compile`               | TypeScript type check                             |
| `npm run lint`                        | ESLint check                                      |
| `npm run lint:fix`                    | ESLint check + auto-fix                           |
| `npm run format`                      | Format code (dprint)                              |
| `npm run format:check`                | Check formatting                                  |
| `npm run spellcheck`                  | Spell check (cspell)                              |
| `npm run lint:md`                     | Markdown lint                                     |
| `npm run lint:md:fix`                 | Markdown lint + auto-fix                          |
| `npm run check:helpers-sync`          | Assert the shared script helpers match their peer |
| `npm run check:vendored-eslint-rules` | Assert the vendored ESLint rules match upstream   |
| `npm run commit`                      | Commitizen commit wizard                          |

## Project structure

```text
├── src/                           # Project source code (empty in template)
├── scripts/                       # npm script entry points (jiti TS)
│   └── helpers/                   # Shared utilities
│       ├── exec.ts                # Command execution with batching
│       ├── root.ts                # Project root resolution, execFromRoot
│       ├── type-guards.ts         # assertNever, assertNonNullable, ensureNonNullable
│       ├── eslint.ts              # ESLint runner
│       ├── format.ts              # dprint runner
│       ├── markdownlint.ts        # markdownlint runner
│       ├── git-content.ts         # Reads a tracked file out of the git index
│       └── eslint-rules/          # Custom ESLint rules (vendored — see below)
├── eslint.config.mts              # → scripts/eslint-config.ts
├── commitlint.config.ts           # → scripts/commitlint-config.ts
├── .markdownlint-cli2.mjs         # → scripts/markdownlint-cli2-config.ts
├── .nano-staged.mjs               # → scripts/nano-staged-config.ts
├── tsconfig.json                  # Extends @tsconfig/strictest
├── dprint.json                    # Code formatter config
├── cspell.json                    # Spell checker config
└── .husky/                        # Git hooks (pre-commit, commit-msg)
```

Root config files are thin re-exports — actual logic lives in `scripts/`.

## Shared script helpers

Everything under `scripts/helpers/` (apart from `eslint-rules/`, which has its own gate below) is a **peer copy**, shared byte-for-byte with [`obsidian-test-mocks`](https://github.com/mnaoumov/obsidian-test-mocks) and `obsidian-typings-crawler` — most of it descended from [`obsidian-dev-utils`](https://github.com/mnaoumov/obsidian-dev-utils)' `src/script-utils/`. A change to one of these files is a change to all three.

`npm run check:helpers-sync` enforces that: it lists the peer's tree, fetches each shared file, and asserts byte-identity. A file only one side carries is not drift — the comparison is over the intersection, and anything one-sided is reported as information. A deliberate difference is recorded with its reason, and the record **expires**: once the file becomes identical again, the stale claim fails, so the list cannot quietly become a place to park things. It runs from the pre-commit hook and in CI, reads this repo's side out of the git index so it cannot race `lint:fix`, and is turned off for a run with `CHECK_HELPERS_SYNC=0`.

## Custom ESLint rules

Bundled under the `obsidian-dev-utils` plugin namespace and covered by their own unit tests (`scripts/helpers/eslint-rules/*.test.ts`):

- **`obsidian-dev-utils/no-used-underscore-variables`** — flags `_`-prefixed parameters/variables that are actually used in the function body.
- **`obsidian-dev-utils/no-async-callback-to-unsafe-return`** — flags async functions passed as callbacks to parameters with `any`/`unknown` return type (unhandled promise rejections).
- **`obsidian-dev-utils/no-unused-params-members`** — flags members of a `*Params`/`*Options` interface that are never accessed by the function receiving it.
- **`obsidian-dev-utils/readonly-params-options-result-members`** — requires members of `*Params`/`*Options`/`*Result` interfaces to be declared `readonly`.
- **`obsidian-dev-utils/params-options-name-match`** — requires a parameter-bag type to be named after its owner, with `Params` for a sole required bag and `Options` otherwise.
- **`obsidian-dev-utils/require-method-template`** — requires a `@typeParam`/`@template` JSDoc tag for each of a generic *method*'s type parameters, which `eslint-plugin-jsdoc`'s `require-template` does not reach.

These sources are **vendored copies** of [`obsidian-dev-utils`](https://github.com/mnaoumov/obsidian-dev-utils)' `src/script-utils/linters/eslint-rules/`, not local code: this repo depends on nothing from that package, so the rules are hand-copied rather than imported. Take an upstream change whole rather than hand-editing one.

`npm run check:vendored-eslint-rules` enforces that. It lists upstream's directory, fetches each source, applies the handful of recorded deltas as *transform arms*, and asserts byte-identity — so accepting a new divergence is a code change that every later run then enforces, rather than a comment nothing reads. It runs from the pre-commit hook and in CI, reads this repo's side out of the git index so it cannot race `lint:fix`, and is turned off for a run with `CHECK_VENDORED_ESLINT_RULES=0`.

## TypeScript strictness

Extends [`@tsconfig/strictest`](https://github.com/tsconfig/bases/blob/main/bases/strictest.json) with:

- `skipLibCheck: false` — checks all declaration files including `node_modules`
- [`@total-typescript/ts-reset`](https://github.com/total-typescript/ts-reset) — fixes built-in type definitions
- [`better-typescript-lib`](https://github.com/uhyo/better-typescript-lib) — improved standard library types
- `verbatimModuleSyntax: true` — enforces explicit `import type`

## Pre-commit hooks

On every commit, staged files are automatically:

- **`*.{ts,tsx,mts}`** — linted (`eslint --fix`) and formatted (`dprint fmt`)
- **`*.md`** — markdown-linted (`markdownlint-cli2 --fix`)
- **All files** — spell-checked (`cspell`)
- **Commit message** — validated against [Conventional Commits](https://www.conventionalcommits.org/)

## License

[MIT](LICENSE)
