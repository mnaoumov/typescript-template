import { wrapCliTask } from '@mnaoumov/typescript-dev-toolkit/cli-utils';
import process from 'node:process';

import { lint } from './helpers/eslint.ts';

await wrapCliTask(async () => {
  const [, , ...paths] = process.argv;
  await lint({ paths, shouldFix: true });
});
