import { spawn } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const [verb, project, ...options] = process.argv.slice(2);
if (!['open','look','render'].includes(verb) || !project) {
  throw new Error('Usage: npm run video:open|look|render -- PROJECT_FOLDER [options]');
}
const cwd = await realpath(project);
const cli = fileURLToPath(new URL('./node_modules/openfilm/bin/openfilm.mjs', import.meta.url));
const child = spawn(process.execPath, [cli, verb, ...options], {cwd, stdio:'inherit'});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
