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
| `npm run commit`                      | Commitizen commit wizard                          |

## Project structure

```text
├── src/                           # Project source code (empty in template)
├── scripts/                       # npm script entry points (jiti TS)
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

## Shared tooling

The script helpers (process execution, root resolution, the ESLint, dprint and markdownlint runners, the declaration check, the per-script off switch) and the custom ESLint rules come from [`@mnaoumov/typescript-dev-toolkit`](https://www.npmjs.com/package/@mnaoumov/typescript-dev-toolkit), a dev dependency, rather than from copies in this repo. Every entry point under `scripts/` runs inside its `wrapCliTask`, so setting the script's name to an off value (`LINT=0`, `SPELLCHECK=0`, ...) skips it for a run.

## Custom ESLint rules

Registered under the `typescript-dev-toolkit` plugin namespace by the toolkit's `inHouseEslintPlugin`:

- **`typescript-dev-toolkit/no-used-underscore-variables`** — flags `_`-prefixed parameters/variables that are actually used in the function body.
- **`typescript-dev-toolkit/no-async-callback-to-unsafe-return`** — flags async functions passed as callbacks to parameters with `any`/`unknown` return type (unhandled promise rejections).
- **`typescript-dev-toolkit/no-unused-params-members`** — flags members of a `*Params`/`*Options` interface that are never accessed by the function receiving it.
- **`typescript-dev-toolkit/readonly-interface-members`** — requires every interface property to be declared `readonly`.
- **`typescript-dev-toolkit/no-keyword-identifiers`** — requires a `$` prefix on bare keyword binding names such as `object` or `event` (`$object`, `$event`).
- **`typescript-dev-toolkit/params-options-name-match`** — requires a parameter-bag type to be named after its owner, with `Params` for a sole required bag and `Options` otherwise.
- **`typescript-dev-toolkit/require-method-template`** — requires a `@typeParam`/`@template` JSDoc tag for each of a generic *method*'s type parameters, which `eslint-plugin-jsdoc`'s `require-template` does not reach.

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
