import {createHash} from 'node:crypto';
import {planHash} from './cinematic-credit.mjs';

export function parseCreditText(command) {
  const payload = String(command?.payload || '').trim().replace(/ي/g, 'ی');
  if (command?.action === 'approved-feature') {
    const m = /^(?:تایید|تأیید|approve)\s+(cc-[a-f0-9]{32})$/.exec(payload);
    if (m) return {status:'approved', code:m[1]};
  }
  if (command?.action === 'topic-reject' && /^cc-[a-f0-9]{32}$/.test(payload)) return {status:'rejected', code:payload};
  return null;
}

export function decideCreditText(current, command, plan, owner, now=Date.now()) {
  const parsed = parseCreditText(command);
  if (!parsed || command.source !== 'telegram-cloud-worker' || current?.status !== 'pending') return null;
  if (String(owner) !== current.chat_id || !plan || planHash(plan) !== current.plan_sha) return null;
  if (!(Date.parse(current.expires_at) > now)) return null;
  const sent = Date.parse(command.requestedAt);
  if (!(sent >= Date.parse(current.created_at) && sent <= now + 60000)) return null;
  const expected = parsed.status === 'approved' ? current.text_approve_sha : current.text_reject_sha;
  if (createHash('sha256').update(parsed.code).digest('hex') !== expected) return null;
  return {...current, status:parsed.status, decided_at:new Date(now).toISOString(), decision_method:'telegram-text', decision_request_id:command.requestId};
}
