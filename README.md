# TypeScript Template

Opinionated TypeScript project template with strict tooling pre-configured.

## What's included

| Tool                                                      | Purpose                          |
|-----------------------------------------------------------|----------------------------------|
| [TypeScript](https://www.typescriptlang.org/)             | Type checking (`@tsconfig/strictest`) |
| [ESLint](https://eslint.org/)                             | Linting (strict type-checked + custom rules) |
| [dprint](https://dprint.dev/)                             | Code formatting                  |
| [cspell](https://cspell.org/)                             | Spell checking                   |
| [markdownlint](https://github.com/DavidAnson/markdownlint) | Markdown linting               |
| [commitlint](https://commitlint.js.org/)                 | Conventional commit messages     |
| [husky](https://typicode.github.io/husky/)                | Git hooks                        |
| [nano-staged](https://github.com/usmanyunusov/nano-staged) | Pre-commit staged file checks  |
| [commitizen](https://commitizen-tools.github.io/commitizen/) | Commit message wizard         |

All scripts are written in TypeScript and executed via [jiti](https://github.com/unjs/jiti).

## Usage

```bash
npx degit mnaoumov/typescript-template my-project
cd my-project
npm install
```

## Commands

| Command               | Description               |
|-----------------------|---------------------------|
| `npm run build:compile` | TypeScript type check   |
| `npm run lint`        | ESLint check              |
| `npm run lint:fix`    | ESLint check + auto-fix   |
| `npm run format`      | Format code (dprint)      |
| `npm run format:check` | Check formatting         |
| `npm run spellcheck`  | Spell check (cspell)      |
| `npm run lint:md`     | Markdown lint             |
| `npm run lint:md:fix` | Markdown lint + auto-fix  |
| `npm run commit`      | Commitizen commit wizard  |

## Project structure

```text
├── src/                           # Project source code (empty in template)
├── scripts/                       # npm script entry points (jiti TS)
│   └── helpers/                   # Shared utilities
│       ├── exec.ts                # Command execution with batching
│       ├── root.ts                # Project root resolution, execFromRoot
│       ├── type-guards.ts         # assertNonNullable, ensureNonNullable
│       ├── eslint.ts              # ESLint runner
│       ├── format.ts              # dprint runner
│       ├── markdownlint.ts        # markdownlint runner
│       └── eslint-rules/          # Custom ESLint rules
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

## Custom ESLint rules

- **`custom/no-used-underscore-variables`** — flags `_`-prefixed parameters/variables that are actually used in the function body.
- **`custom/no-async-callback-to-unsafe-return`** — flags async functions passed as callbacks to parameters with `any`/`unknown` return type (unhandled promise rejections).

## TypeScript strictness

Extends [`@tsconfig/strictest`](https://github.com/tsconfig/bases/blob/main/bases/strictest.json) with:

- `skipLibCheck: false` — checks all declaration files including `node_modules`
- [`@total-typescript/ts-reset`](https://github.com/total-typescript/ts-reset) — fixes built-in type definitions
- [`better-typescript-lib`](https://github.com/user/user/better-typescript-lib) — improved standard library types
- `verbatimModuleSyntax: true` — enforces explicit `import type`

## Pre-commit hooks

On every commit, staged files are automatically:

- **`*.{ts,tsx,mts}`** — linted (`eslint --fix`) and formatted (`dprint fmt`)
- **`*.md`** — markdown-linted (`markdownlint-cli2 --fix`)
- **All files** — spell-checked (`cspell`)
- **Commit message** — validated against [Conventional Commits](https://www.conventionalcommits.org/)

## License

[MIT](LICENSE)
