import assert from 'node:assert/strict';
import { safePath, writablePath, encode64, decode64, githubFile, githubEdit, webSearch } from './src/assistant-tools.js';

assert.equal(decode64(encode64('سلام — Straße')), 'سلام — Straße');
assert.throws(() => safePath('../secrets.txt'));
assert.throws(() => safePath('.telegram-bot-chat.json'));
assert.throws(() => writablePath('.github/workflows/daily.yml'));
assert.throws(() => writablePath('worker/src/index.js'));
assert.throws(() => writablePath('PROJECT_RULES.md'));

const saved = globalThis.fetch;
const calls = [];
const content = 'Old headline\nSecond line\n';
globalThis.fetch = async (url, init = {}) => {
  calls.push({url: String(url), init});
  if (String(url).includes('duckduckgo.com')) return new Response('<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fsource&amp;rut=x">Useful result</a>');
  if (String(url).includes('/git/ref/heads/main')) return Response.json({object:{sha:'main-sha'}});
  if (String(url).endsWith('/git/refs')) return Response.json({ref:'new'},{status:201});
  if (init.method === 'PUT') return Response.json({content:{sha:'new-sha'}},{status:200});
  return Response.json({encoding:'base64',size:content.length,sha:'old-sha',content:encode64(content)});
};
const env = {GITHUB_TOKEN:'test',GITHUB_OWNER:'Owner',GITHUB_REPO:'Repo',AI:{run:async()=>({response:JSON.stringify({old:'Old headline',new:'New headline',summary:'improve title'})})}};
assert.equal((await githubFile(env,'README.md')).text,content);
assert.match(await webSearch('German daily life'), /https:\/\/example.org\/source/);
assert.match(await githubEdit(env,'README.md','Change the headline'), /ویرایش شد/);
assert.equal(JSON.parse(calls.find(c=>c.init.method==='PUT').init.body).branch,'main');
calls.length = 0;
assert.match(await githubEdit(env,'src/app.js','Change the headline'), /branch جداگانه/);
assert.ok(calls.some(c=>c.url.endsWith('/git/refs')&&c.init.method==='POST'));
assert.match(JSON.parse(calls.find(c=>c.init.method==='PUT').init.body).branch,/^bot-edit-/);
globalThis.fetch = saved;
console.log('assistant tools, Unicode and isolated code edits hold');
