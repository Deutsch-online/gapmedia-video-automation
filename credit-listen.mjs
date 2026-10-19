// Uses the existing consumer and its durable offset; never starts a second poller.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
process.chdir(root);
const limit = Math.max(0, Math.min(600, Number(process.env.CREDIT_WAIT_SECONDS) || 0));
const deadline = Date.now() + limit * 1000;
let output = '';
while (true) {
  output = execFileSync(process.execPath, ['cloud-listen.mjs'], {encoding:'utf8', env:process.env, maxBuffer:1024*1024});
  if (/^CREDIT_APPROVED=true$/m.test(output) || /^ACTION=(?!none$).+/m.test(output)) break;
  let request;
  try { request = JSON.parse(readFileSync('.cinematic-credit-request.json','utf8')); } catch { break; }
  if (request.status !== 'pending' || !(Date.parse(request.expires_at) > Date.now()) || Date.now() >= deadline) break;
  await new Promise(resolve => setTimeout(resolve, 3000));
}
process.stdout.write(output);
