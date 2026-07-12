import { execFromRoot } from './helpers/root.ts';

await execFromRoot(['npx', 'vitest', 'run', '--coverage']);
