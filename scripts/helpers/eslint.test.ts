/**
 * @file
 *
 * Tests for the ESLint exit classification, which is what keeps a crashed linter from being reported as a
 * red codebase.
 *
 * The stderr fixtures are transcribed VERBATIM from real ESLint runs rather than invented to suit the
 * extractor. That is the whole point of them: the first version of this classifier read the
 * `Oops! Something went wrong!` banner as the crash marker, which is wrong -- ESLint prints it for a
 * mistyped path too -- and nothing but real output was going to say so.
 *
 * The OS-level death cannot be triggered on demand, so it is pinned by its exit code alone. That is the
 * failure shape npm relays to its own caller as a plain exit `1`, so it is also the one worth pinning.
 */

import {
  describe,
  expect,
  it
} from 'vitest';

import type { ExecResult } from './exec.ts';

import {
  classifyEslintExit,
  describeFailureToLint,
  LINT_PROBLEMS_MESSAGE
} from './eslint.ts';

/**
 * The real stderr of an ESLint rule crash, transcribed from an `npm run lint` that died inside `no-empty`
 * on an unchanged, lint-clean tree.
 */
const RULE_CRASH_STDERR = [
  '',
  'Oops! Something went wrong! :(',
  '',
  'ESLint: 10.7.0',
  '',
  'TypeError: Cannot read properties of undefined (reading \'length\')',
  String.raw`Occurred while linting F:\dev\projects\paperio2\ts\src\entities\bot-ai.ts:347`,
  'Rule: "no-empty"',
  '    at BlockStatement (node_modules/eslint/lib/rules/no-empty.js:60:19)',
  '    at ruleErrorHandler (node_modules/eslint/lib/linter/linter.js:645:33)',
  '    at Linter.verifyAndFix (node_modules/eslint/lib/linter/linter.js:1534:20)'
].join('\n');

/**
 * The real stderr of a mistyped path, transcribed from `npm run lint -- src/no-such-file.ts`. It is here
 * because it carries the SAME `Oops!` banner as the rule crash above -- the banner is not crash-specific,
 * which an earlier version of the classifier got wrong and this fixture pins.
 */
const USAGE_ERROR_STDERR = [
  '',
  'Oops! Something went wrong! :(',
  '',
  'ESLint: 10.7.0',
  '',
  'No files matching the pattern "src/no-such-file.ts" were found.',
  'Please check for typing mistakes in the pattern.'
].join('\n');

/**
 * `0xC0000005`, the access violation the ESLint child raises on Windows with no output of its own.
 */
const ACCESS_VIOLATION_EXIT_CODE = 3_221_225_477;

/**
 * Builds one `ExecResult` over the clean default, so each test names only the field it is about.
 *
 * @param overrides - The fields this case is about.
 * @returns A complete result to classify.
 */
function makeResult(overrides: Partial<ExecResult>): ExecResult {
  return {
    exitCode: 0,
    exitSignal: null,
    stderr: '',
    stdout: '',
    ...overrides
  };
}

describe('classifyEslintExit', () => {
  it('reads exit 0 as a clean lint', () => {
    expect(classifyEslintExit(makeResult({ exitCode: 0 }))).toBe('clean');
  });

  it('reads exit 1 as findings about the source', () => {
    expect(classifyEslintExit(makeResult({ exitCode: 1, stdout: '  3:1  error  Unexpected var  no-var' }))).toBe('lint-problems');
  });

  it('reads a rule crash as did-not-lint, however it exited', () => {
    expect(classifyEslintExit(makeResult({ exitCode: 2, stderr: RULE_CRASH_STDERR }))).toBe('did-not-lint');
    expect(classifyEslintExit(makeResult({ exitCode: 1, stderr: RULE_CRASH_STDERR }))).toBe('did-not-lint');
  });

  it('reads a configuration or command-line failure as did-not-lint', () => {
    expect(classifyEslintExit(makeResult({ exitCode: 2, stderr: USAGE_ERROR_STDERR }))).toBe('did-not-lint');
  });

  it('reads an OS-level death as did-not-lint, not as findings', () => {
    expect(classifyEslintExit(makeResult({ exitCode: ACCESS_VIOLATION_EXIT_CODE }))).toBe('did-not-lint');
  });

  it('reads a killed process as did-not-lint even when its exit code is 0', () => {
    expect(classifyEslintExit(makeResult({ exitCode: 0, exitSignal: 'SIGKILL' }))).toBe('did-not-lint');
  });
});

describe('describeFailureToLint', () => {
  it('names a rule crash and quotes the version, the file and the rule', () => {
    const message = describeFailureToLint(makeResult({ exitCode: 2, stderr: RULE_CRASH_STDERR }));

    expect(message).toContain('ESLint CRASHED');
    expect(message).toContain('ESLint: 10.7.0');
    expect(message).toContain('Occurred while linting');
    expect(message).toContain('Rule: "no-empty"');
    expect(message).toContain('TypeError: Cannot read properties of undefined (reading \'length\')');
  });

  it('never claims a crash is a lint finding', () => {
    const message = describeFailureToLint(makeResult({ exitCode: 2, stderr: RULE_CRASH_STDERR }));

    expect(message).toContain('NOT a lint finding');
  });

  it('cannot be mistaken for the findings message, which is the whole point', () => {
    const message = describeFailureToLint(makeResult({ exitCode: 2, stderr: RULE_CRASH_STDERR }));

    expect(message).not.toContain(LINT_PROBLEMS_MESSAGE);
    expect(LINT_PROBLEMS_MESSAGE).not.toContain('NOT a lint finding');
  });

  it('spells an NT status exit code in hex and says nothing was printed', () => {
    const message = describeFailureToLint(makeResult({ exitCode: ACCESS_VIOLATION_EXIT_CODE }));

    expect(message).toContain('DIED at the OS level');
    expect(message).toContain('3221225477 (0xC0000005)');
    expect(message).toContain('printed no diagnostic at all');
  });

  it('separates a mistyped path from a rule crash, though both carry the banner', () => {
    const message = describeFailureToLint(makeResult({ exitCode: 2, stderr: USAGE_ERROR_STDERR }));

    expect(message).toContain('ESLint ABORTED');
    expect(message).not.toContain('CRASHED');
    expect(message).toContain('No files matching the pattern "src/no-such-file.ts" were found.');
    expect(message).toContain('exit code: 2');
    expect(message).not.toContain('0x');
  });

  it('quotes no stack frames, banner or npm chatter back', () => {
    const message = describeFailureToLint(makeResult({
      exitCode: 2,
      stderr: `npm notice run eslint .\n${RULE_CRASH_STDERR}`
    }));

    expect(message).not.toContain('npm notice');
    expect(message).not.toContain('Oops!');
    expect(message).not.toContain('node_modules/eslint/lib/rules/no-empty.js');
  });

  it('names the signal when the process was terminated', () => {
    const message = describeFailureToLint(makeResult({ exitCode: null, exitSignal: 'SIGTERM' }));

    expect(message).toContain('KILLED');
    expect(message).toContain('terminated by signal: SIGTERM');
    expect(message).toContain('the process was terminated before it could exit');
  });

  it('caps how much of the stderr it quotes back', () => {
    const noisy = Array.from({ length: 50 }, (_, index) => `Rule: "rule-${String(index)}"`).join('\n');
    const message = describeFailureToLint(makeResult({ exitCode: 2, stderr: `Oops! Something went wrong! :(\n${noisy}` }));

    expect(message).toContain('Rule: "rule-0"');
    expect(message).not.toContain('Rule: "rule-6"');
  });
});
