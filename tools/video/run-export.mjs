// AgentRun's offline workflow engine only: no model, server, bot or arbitrary shell adapter.
import { readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWorkflow, validateWorkflow } from '@parcha/agentrun-dsl';
import { fileStore, openRecovery, withRecovery } from '@parcha/agentrun-dsl/recovery';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
if (!process.argv[2]) throw new Error('Usage: npm run video:export -- renders/.../master.mp4');
const master = await realpath(resolve(process.argv[2]));
if (!master.startsWith(root + sep)) throw new Error('Master must be inside this project');
const identity = createHash('sha256').update(await readFile(master))
  .update(await readFile(resolve(dirname(master), 'quality.json'))).digest('hex');
const workflow = JSON.parse(await readFile(new URL('./export-workflow.json', import.meta.url), 'utf8'));
const validation = validateWorkflow(workflow);
if (!validation.ok) throw new Error(JSON.stringify(validation));
const driver = await openRecovery(fileStore(resolve(dirname(master), 'openfilm-journal')),
  workflow, { key: `openfilm-${identity}` });
try {
  const result = await runWorkflow(workflow, { master, sourceIdentity: identity }, withRecovery(driver, {
    async runEffect({ node, input, signal }) {
      if (node.tool !== 'openfilm_export' || input.master !== master) throw new Error('Unapproved local effect');
      const { stdout } = await promisify(execFile)('python3',
        [resolve(root, 'ai-cast/cinematic_openfilm.py'), master],
        { cwd: root, signal, timeout: 110000, maxBuffer: 1024 * 1024 });
      return JSON.parse(stdout);
    },
  }));
  if (result.status !== 'complete') throw new Error(`Export stopped: ${result.status}`);
  // A completed journal is not proof that someone has kept its output on disk.
  await readFile(result.output.film);
  console.log(JSON.stringify(result));
} finally {
  await driver.close();
}
