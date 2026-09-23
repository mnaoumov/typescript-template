import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import { spawn } from 'node:child_process';
import process from 'node:process';

export type CommandPart = ExecArgument | string;

export interface ExecArgument {
  readonly batchedArguments: readonly string[];
}

export interface ExecDetailedOptions extends ExecOption {
  readonly shouldIncludeDetails: true;
}

export interface ExecOption {
  readonly cwd?: string;

  /**
   * Extra environment variables for the child, merged over the inherited `process.env`.
   */
  readonly env?: Readonly<Record<string, string>>;
  readonly isQuiet?: boolean;
  readonly shouldIgnoreExitCode?: boolean;
  readonly shouldIncludeDetails?: boolean;
  readonly stdin?: string;
}

export interface ExecResult {
  readonly exitCode: null | number;
  readonly exitSignal: NodeJS.Signals | null;
  readonly stderr: string;
  readonly stdout: string;
}

export interface ExecSimpleOptions extends ExecOption {
  readonly shouldIncludeDetails?: false;
}

export async function exec(command: CommandPart[] | string, options?: ExecSimpleOptions): Promise<string>;
export function exec(command: CommandPart[] | string, options: ExecDetailedOptions): Promise<ExecResult>;
export function exec(command: CommandPart[] | string, options: ExecOption = {}): Promise<ExecResult | string> {
  if (Array.isArray(command)) {
    const batchResult = handleBatchedCommand(command, options);
    if (batchResult) {
      return batchResult;
    }
    const $arguments = command.filter((part): part is string => typeof part === 'string');
    const commandLine = toCommandLine($arguments);

    const maxCommandLength = getMaxCommandLength();
    return commandLine.length > maxCommandLength
      ? Promise.reject(
        new Error(
          `Command line is too long (${String(commandLine.length)} chars, max ${String(maxCommandLength)} on ${process.platform}). Consider using ExecArgument with batchedArguments.`
        )
      )
      : execString(commandLine, options, $arguments);
  }

  const maxCommandLength = getMaxCommandLength();
  return command.length > maxCommandLength
    ? Promise.reject(
      new Error(
        `Command line is too long (${String(command.length)} chars, max ${String(maxCommandLength)} on ${process.platform}). Consider using ExecArgument with batchedArguments.`
      )
    )
    : execString(command, options);
}

function argvQuote(argument: string): string {
  if (argument.length > 0 && !/[\s\t\n\v"]/.test(argument)) {
    return argument;
  }

  const BACKSLASH_ESCAPE_FACTOR = 2;
  let result = '"';
  for (let index = 0; index < argument.length; index++) {
    let numberBackslashes = 0;
    while (index < argument.length && argument[index] === '\\') {
      index++;
      numberBackslashes++;
    }

    if (index === argument.length) {
      result += '\\'.repeat(numberBackslashes * BACKSLASH_ESCAPE_FACTOR);
      break;
    }

    const ch = argument.charAt(index);
    result += ch === '"' ? `${'\\'.repeat(numberBackslashes * BACKSLASH_ESCAPE_FACTOR + 1)}"` : '\\'.repeat(numberBackslashes) + ch;
  }

  result += '"';
  return result;
}

function toCommandLine($arguments: string[]): string {
  return $arguments.map((argument) => argvQuote(argument)).join(' ');
}

const CMD_META_RE = /[()%!^"<>&|]/g;

const CHILD_ENV = {
  DEBUG_COLORS: '1',
  ...process.env
};

function commandEscapeCommandLine(commandLine: string): string {
  return commandLine.replaceAll(CMD_META_RE, '^$&');
}

function execString(command: string, options: ExecOption = {}, rawArguments?: string[]): Promise<ExecResult | string> {
  const {
    cwd = process.cwd(),
    env = {},
    isQuiet: quiet = false,
    shouldIgnoreExitCode: ignoreExitCode = false,
    shouldIncludeDetails = false,
    stdin = ''
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawnViaShell(command, cwd, env, rawArguments);

    let stdout = '';
    let stderr = '';

    // A child that exits before reading its stdin makes this write fail with EPIPE.
    // With no listener that is an unhandled 'error' event, which tears down the whole process instead of settling this promise.
    // Swallow it: the 'close'/'error' handlers below report the command's actual outcome, which is the failure worth surfacing.
    child.stdin.on('error', () => {
      // Deliberately ignored -- see above.
    });
    child.stdin.write(stdin);
    child.stdin.end();

    child.stdout.on('data', (data: Buffer) => {
      if (!quiet) {
        process.stdout.write(data);
      }
      stdout += data.toString('utf-8');
    });

    child.stdout.on('end', () => {
      stdout = trimEnd(stdout, '\n');
    });

    child.stderr.on('data', (data: Buffer) => {
      if (!quiet) {
        process.stderr.write(data);
      }
      stderr += data.toString('utf-8');
    });

    child.stderr.on('end', () => {
      stderr = trimEnd(stderr, '\n');
    });

    child.on('close', (exitCode, exitSignal) => {
      if (exitCode !== 0 && !ignoreExitCode) {
        reject(new Error(`Command failed with exit code ${exitCode ? String(exitCode) : '(null)'}\n${stderr}`));
        return;
      }

      if (!shouldIncludeDetails) {
        resolve(stdout);
        return;
      }
      resolve({
        exitCode,
        exitSignal,
        stderr,
        stdout
      });
    });

    child.on('error', (error) => {
      if (!ignoreExitCode) {
        reject(error);
        return;
      }

      if (!shouldIncludeDetails) {
        resolve(stdout);
        return;
      }

      resolve({
        exitCode: null,
        exitSignal: null,
        stderr,
        stdout
      });
    });
  });
}

/**
 * Runs one over-long command as several, and reports what the batches actually did.
 *
 * Details are forced ON for every batch whatever the caller asked for, because an aggregate cannot carry an
 * exit code it never collected. This used to return a hard-coded `exitCode: 0` with an empty `stderr`, so a
 * caller that asked for details was told every batch had succeeded however they ended. That was latent only
 * while nothing classified exit codes -- with `shouldIgnoreExitCode` left false, {@link execString} still
 * rejects on the first failing batch, so the failure surfaced as a rejection -- and the moment a caller
 * both ignores exit codes and reads them back, as the lint hop now does, it becomes a silent green. The
 * batched path is not hypothetical: it is how `lint:fix` runs under nano-staged with a long staged file
 * list.
 *
 * The FIRST failing batch is the one carried. A later batch's code settles nothing the first has not
 * already settled, and the first is where a reader has to start looking. Both streams are concatenated
 * whole, so nothing any batch said is dropped on the way out.
 *
 * @param baseCommand - The command line every batch shares, already quoted.
 * @param batches - The argument batches, each already known to fit.
 * @param options - What the caller asked for, which decides only what is returned.
 * @returns The aggregate, in whichever of the two shapes the caller asked for.
 */
async function executeBatches(baseCommand: string, batches: string[][], options: ExecOption): Promise<ExecResult | string> {
  const stdoutParts: string[] = [];
  const stderrParts: string[] = [];
  let firstFailure: ExecResult | undefined;

  for (const batch of batches) {
    const batchCommand = `${baseCommand} ${batch.join(' ')}`;
    // Sound because `shouldIncludeDetails` is forced true right here: `execString` returns a bare string only when it is false.
    const result = await execString(batchCommand, { ...options, shouldIncludeDetails: true }) as ExecResult;

    stdoutParts.push(result.stdout);
    stderrParts.push(result.stderr);

    const hasFailed = result.exitCode !== 0 || result.exitSignal !== null;
    firstFailure ??= hasFailed ? result : undefined;
  }

  // A batch that said nothing contributes nothing, rather than a blank line: an aggregate `stderr` of "\n" for a run where every batch was silent reads as output, and a caller testing it for emptiness is right to.
  const stdout = joinStreams(stdoutParts);

  return options.shouldIncludeDetails
    ? {
      // Spelled out rather than `firstFailure?.exitCode ?? 0`, which would report a batch killed by a signal -- whose code is `null` -- as a clean 0.
      exitCode: firstFailure === undefined ? 0 : firstFailure.exitCode,
      exitSignal: firstFailure === undefined ? null : firstFailure.exitSignal,
      stderr: joinStreams(stderrParts),
      stdout
    }
    : stdout;
}

/**
 * How long a command this module may build before it has to be split.
 *
 * On Windows the well-known 8191 is what **cmd.exe** measures ITS OWN command line against, and what cmd is
 * handed is not the command built here: `spawn(..., { shell: true })` wraps it as
 * `<ComSpec> /d /s /c "<command>"`. Budgeting the whole 8191 for the inner command therefore overshoots by
 * the wrapper, and a batch built right up to the ceiling is refused by cmd with `The command line is too
 * long.` and exit 1 -- which is not a failure of the command at all, and which {@link executeBatches} used
 * to swallow into a hard-coded `exitCode: 0`. Measured on this machine, whose `ComSpec` is 27 characters:
 * 8152 runs and 8153 does not, which is exactly `8191 - 27 - 12`.
 *
 * `ComSpec` is read rather than assumed, because it is what `spawn` itself uses and it is not the same
 * length everywhere.
 *
 * Note what this still does NOT account for: {@link commandEscapeCommandLine} inserts a `^` per cmd meta
 * character AFTER this budget has been spent, so a command whose arguments are full of them can still
 * overshoot. Paths holding cmd meta characters are rare enough that the inflation is left out of the budget
 * rather than guessed at.
 *
 * @returns The longest command line this module may hand to {@link spawnViaShell}.
 */
function getMaxCommandLength(): number {
  if (process.platform !== 'win32') {
    const UNIX_MAX_COMMAND_LENGTH = 131_072;
    return UNIX_MAX_COMMAND_LENGTH;
  }

  const CMD_MAX_COMMAND_LENGTH = 8191;
  /**
  The flags, the quotes around the inner command, and the spaces separating them, that `spawn` adds.
  */
  const CMD_SHELL_WRAPPER = ' /d /s /c ""';
  const comSpec = process.env['ComSpec'] ?? String.raw`C:\Windows\system32\cmd.exe`;
  return CMD_MAX_COMMAND_LENGTH - comSpec.length - CMD_SHELL_WRAPPER.length;
}

function handleBatchedCommand(parts: CommandPart[], options: ExecOption): Promise<ExecResult | string> | undefined {
  const execArguments = parts.filter(isExecArgument);
  if (execArguments.length === 0) {
    return undefined;
  }
  if (execArguments.length > 1) {
    return Promise.reject(new Error('Only one ExecArgument with batchedArguments is allowed per command'));
  }

  const execArgument = execArguments[0];
  if (!execArgument) {
    return undefined;
  }

  const staticParts = parts.filter((part): part is string => typeof part === 'string');
  const baseCommand = toCommandLine(staticParts);
  const maxCommandLength = getMaxCommandLength();

  const fullCommand = `${baseCommand} ${execArgument.batchedArguments.join(' ')}`;
  if (fullCommand.length <= maxCommandLength) {
    return execString(fullCommand, options);
  }

  const batches: string[][] = [];
  let currentBatch: string[] = [];

  for (const argument of execArgument.batchedArguments) {
    const tentative = `${baseCommand} ${[...currentBatch, argument].join(' ')}`;
    if (tentative.length > maxCommandLength) {
      if (currentBatch.length === 0) {
        return Promise.reject(
          new Error(
            `Cannot split command into batches: a single argument (${String(argument.length)} chars) plus the base command (${String(baseCommand.length)} chars) exceeds the max command length (${String(maxCommandLength)}).`
          )
        );
      }
      batches.push(currentBatch);
      currentBatch = [argument];
    } else {
      currentBatch.push(argument);
    }
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return executeBatches(baseCommand, batches, options);
}

function isExecArgument(part: CommandPart): part is ExecArgument {
  return typeof part === 'object' && 'batchedArguments' in part;
}

/**
 * Folds one stream's per-batch pieces into the aggregate's.
 *
 * @param parts - What each batch wrote, in order.
 * @returns The pieces that carry anything, newline-separated.
 */
function joinStreams(parts: readonly string[]): string {
  return parts.filter((part) => part !== '').join('\n');
}

function spawnViaShell(
  command: string,
  cwd: string,
  env: Readonly<Record<string, string>>,
  rawArguments?: string[]
): ChildProcessWithoutNullStreams {
  const childEnv = { ...CHILD_ENV, ...env };

  if (process.platform === 'win32' && command.includes('\n')) {
    if (!rawArguments) {
      throw new Error('Commands containing newlines cannot be executed through cmd.exe on Windows. Pass an argument array instead of a string.');
    }
    const [program, ...$arguments] = rawArguments;
    if (!program) {
      throw new Error('Command array must not be empty');
    }
    return spawn(program, $arguments, {
      cwd,
      env: childEnv,
      stdio: 'pipe'
    });
  }

  const shellCommand = process.platform === 'win32' ? commandEscapeCommandLine(command) : command;
  return spawn(shellCommand, [], {
    cwd,
    env: childEnv,
    shell: true,
    stdio: 'pipe'
  });
}

function trimEnd($string: string, suffix: string): string {
  return $string.endsWith(suffix) ? $string.slice(0, -suffix.length) : $string;
}
