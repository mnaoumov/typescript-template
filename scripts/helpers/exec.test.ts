/**
 * @file
 *
 * Tests for the batched `exec` path -- the one a command takes when its argument list is too long for the
 * platform's command line, and the one `lint:fix` takes under nano-staged with a long staged file list.
 *
 * The aggregate that path returns used to be a hard-coded `exitCode: 0` with an empty `stderr`, so a caller
 * that asked for details was told every batch had succeeded however they ended. Nothing caught it because
 * nothing read the code back: with `shouldIgnoreExitCode` left false the run still rejects on the first
 * failing batch, which is what every caller relied on. These tests pin the other half.
 *
 * The child is a REAL `node` process over a real temp script rather than a mocked `spawn`. What is under
 * test is how several children's endings are folded into one answer, and a mock only ever proves the fold
 * was fed whatever the test decided to feed it.
 */

import {
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path/posix';
import process from 'node:process';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

import { exec } from './exec.ts';

/**
 * Mirrors `getMaxCommandLength()`, which is module-private -- including the cmd.exe wrapper it subtracts on
 * Windows. Nothing is asserted on the number itself: every test below also asserts how many batches there
 * were, so a drift between this and the real ceiling fails loudly here instead of quietly testing the
 * unbatched path.
 */
const MAX_COMMAND_LENGTH = process.platform === 'win32'
  ? 8191 - (process.env['ComSpec'] ?? String.raw`C:\Windows\system32\cmd.exe`).length - ' /d /s /c ""'.length
  : 131_072;

/**
 * How far past the ceiling the argument list is built, which decides how many batches there are. A little
 * over one ceiling means two batches -- enough to prove the fold, and two child processes rather than
 * twenty.
 */
const OVERSHOOT_FACTOR = 1.4;

const ARGUMENT_LENGTH = 120;

/**
 * What the temp script writes to each stream, so the aggregate can be asked whether it kept them.
 */
const STDOUT_MARKER = 'probe-stdout';

const STDERR_MARKER = 'probe-stderr';

/**
 * The exit code the failing script uses. Anything but `0` and `1` would do; this one is distinctive enough
 * to be recognized in a failure message.
 */
const PROBE_EXIT_CODE = 7;

const EXPECTED_BATCH_COUNT = 2;

const TEST_TIMEOUT_IN_MILLISECONDS = 60_000;

let temporaryFolder = '';
let failingScriptPath = '';
let succeedingScriptPath = '';

/**
 * Counts how many children contributed to a stream, which is how many batches there were.
 *
 * @param text - The aggregated stream.
 * @param marker - What each child wrote to it exactly once.
 * @returns The number of children that wrote.
 */
function countMarkers(text: string, marker: string): number {
  return text.split(marker).length - 1;
}

/**
 * Builds an argument list long enough that the command line has to be split.
 *
 * @returns The arguments, which the probe script ignores.
 */
function makeOverlongArguments(): string[] {
  const count = Math.ceil((MAX_COMMAND_LENGTH * OVERSHOOT_FACTOR) / (ARGUMENT_LENGTH + 1));
  return Array.from({ length: count }, (_, index) => `${'a'.repeat(ARGUMENT_LENGTH - String(index).length)}${String(index)}`);
}

beforeAll(() => {
  temporaryFolder = mkdtempSync(join(tmpdir(), 'exec-batches-'));

  failingScriptPath = join(temporaryFolder, 'failing-probe.cjs');
  writeFileSync(
    failingScriptPath,
    `process.stdout.write('${STDOUT_MARKER}\\n');\nprocess.stderr.write('${STDERR_MARKER}\\n');\nprocess.exit(${String(PROBE_EXIT_CODE)});\n`
  );

  succeedingScriptPath = join(temporaryFolder, 'succeeding-probe.cjs');
  writeFileSync(succeedingScriptPath, `process.stdout.write('${STDOUT_MARKER}\\n');\n`);
});

afterAll(() => {
  rmSync(temporaryFolder, { force: true, recursive: true });
});

describe('exec over a batched command', () => {
  it('carries the first failing batch out of the aggregate instead of reporting a hard-coded success', async () => {
    const result = await exec(['node', failingScriptPath, { batchedArguments: makeOverlongArguments() }], {
      isQuiet: true,
      shouldIgnoreExitCode: true,
      shouldIncludeDetails: true
    });

    expect(countMarkers(result.stdout, STDOUT_MARKER)).toBe(EXPECTED_BATCH_COUNT);
    expect(result.exitCode).toBe(PROBE_EXIT_CODE);
    expect(result.exitSignal).toBeNull();
    expect(countMarkers(result.stderr, STDERR_MARKER)).toBe(EXPECTED_BATCH_COUNT);
  }, TEST_TIMEOUT_IN_MILLISECONDS);

  it('reports a batched run whose batches all succeeded as a success', async () => {
    const result = await exec(['node', succeedingScriptPath, { batchedArguments: makeOverlongArguments() }], {
      isQuiet: true,
      shouldIgnoreExitCode: true,
      shouldIncludeDetails: true
    });

    expect(countMarkers(result.stdout, STDOUT_MARKER)).toBe(EXPECTED_BATCH_COUNT);
    expect(result.exitCode).toBe(0);
    expect(result.exitSignal).toBeNull();
    expect(result.stderr).toBe('');
  }, TEST_TIMEOUT_IN_MILLISECONDS);

  it('still rejects on the first failing batch when exit codes are not being ignored', async () => {
    await expect(exec(['node', failingScriptPath, { batchedArguments: makeOverlongArguments() }], { isQuiet: true }))
      .rejects
      .toThrow(`Command failed with exit code ${String(PROBE_EXIT_CODE)}`);
  }, TEST_TIMEOUT_IN_MILLISECONDS);

  it('still returns the concatenated stdout when no details were asked for', async () => {
    const stdout = await exec(['node', succeedingScriptPath, { batchedArguments: makeOverlongArguments() }], { isQuiet: true });

    expect(countMarkers(stdout, STDOUT_MARKER)).toBe(EXPECTED_BATCH_COUNT);
  }, TEST_TIMEOUT_IN_MILLISECONDS);
});
