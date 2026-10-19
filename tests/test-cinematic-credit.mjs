import test from 'node:test';
import assert from 'node:assert/strict';
import {decideCredit, planHash} from '../lib/cinematic-credit.mjs';
const plan = {episode: 6, scenes: [{de: 'Hallo!', fa: 'سلام'}]};
const request = {id: 'a'.repeat(24), status: 'pending', chat_id: '42', message_id: 7,
  plan_sha: planHash(plan), expires_at: '2030-01-01T00:00:00Z'};
const query = {data: `cc:y:${request.id}`, from: {id: 42}, message: {message_id: 7, chat: {id: 42, type: 'private'}}};
const now = Date.parse('2026-10-19T00:00:00Z');
test('owner can approve or reject a pending request', () => {
  assert.equal(decideCredit(request, query, plan, now).status, 'approved');
  assert.equal(decideCredit(request, {...query, data: `cc:n:${request.id}`}, plan, now).status, 'rejected');
});
test('other users, chats and messages cannot authorize spending', () => {
  for (const q of [{...query, from: {id: 43}}, {...query, message: {...query.message, message_id: 8}},
    {...query, message: {...query.message, chat: {id: 42, type: 'group'}}}]) {
    assert.equal(decideCredit(request, q, plan, now), null);
  }
});
test('expired, replayed, changed-plan and forged buttons fail closed', () => {
  for (const status of ['approved', 'rejected', 'running', 'completed'])
    assert.equal(decideCredit({...request, status}, query, plan, now), null);
  assert.equal(decideCredit(request, query, plan, Date.parse('2031-01-01')), null);
  assert.equal(decideCredit(request, query, {...plan, episode: 7}, now), null);
  assert.equal(decideCredit(request, {...query, data: 'cc:y:' + 'b'.repeat(24)}, plan, now), null);
});
