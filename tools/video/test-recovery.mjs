import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runWorkflow, validateWorkflow } from '@parcha/agentrun-dsl';
import { fileStore, openRecovery, withRecovery } from '@parcha/agentrun-dsl/recovery';
import { readFilmFile } from 'openfilm/film-doc';

const workflow = JSON.parse(await readFile(new URL('./export-workflow.json', import.meta.url)));
const input = {master:'/fixture/master.mp4',sourceIdentity:'a'.repeat(64)};

test('the exact local workflow validates and a committed effect runs once', async () => {
  assert.deepEqual(validateWorkflow(workflow), {ok:true});
  const dir = await mkdtemp(join(tmpdir(),'gapmedia-export-'));
  let calls = 0;
  try {
    for (let i=0;i<2;i++) {
      const driver = await openRecovery(fileStore(dir),workflow,{key:'fixture'});
      try {
        const result = await runWorkflow(workflow,input,withRecovery(driver,{
          async runEffect({node,input:args}) {
            assert.equal(node.tool,'openfilm_export');
            assert.equal(args.master,input.master);
            calls++;
            return {film:'/fixture/film.html'};
          },
        }));
        assert.equal(result.status,'complete');
      } finally { await driver.close(); }
    }
    assert.equal(calls,1);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('OpenFilm reads native vertical cuts and a continuous audio track', () => {
  const cuts = Array.from({length:9},(_,i)=>`<video src="assets/master.mp4#t=${i*5},${i*5+5}" at="${i*5}" muted></video>`).join('');
  const result = readFilmFile(`<meta name="viewport" content="width=1080, height=1920"><section>${cuts}</section><section><audio src="assets/master.mp4#t=0,45"></audio></section>`);
  assert.equal(result.problems.length,0);
  assert.ok(result.doc);
});
