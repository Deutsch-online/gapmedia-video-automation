// Private delivery only. Stdout is a small JSON receipt, never credentials.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {createHash} from 'node:crypto';
import { telegramConfig, verifyDelivery, sendVideo, sendMessage, sendPhoto } from '../lib/telegram.mjs';
import {requestCredit} from '../lib/cinematic-credit.mjs';
const [action, file, platform] = process.argv.slice(2);
if (!['verify', 'send', 'request-credit', 'preview'].includes(action)) throw new Error('Unknown bot operation');
const tg = telegramConfig(process.env);
if (!tg.enabled) throw new Error('Telegram credentials are not configured');
const verified = await verifyDelivery({ token: tg.token, chatId: tg.reviewChatId, requirePrivate: true });
if (!verified.ok) throw new Error(verified.reason);
if (action === 'verify') {
  console.log(JSON.stringify({ ok: true }));
} else if (action === 'preview') {
  const state=JSON.parse(readFileSync('.cinematic-series-state.json','utf8'));
  const preview=state.pending?.image_preview;
  if(state.pending?.plan?.cast_profile!=='lina-oma-v1'||preview?.status!=='dispatching'||preview.file!==file)
    throw new Error('No matching durable image-preview intent');
  if(createHash('sha256').update(readFileSync(file)).digest('hex')!==preview.sha256)
    throw new Error('Image preview differs from durable intent');
  const result=await sendPhoto({token:tg.token,chatId:tg.reviewChatId,file,caption:'Lina &amp; Oma · Bildvorschau'});
  if(!result?.message_id)throw new Error('Image preview receipt missing');
  console.log(JSON.stringify({message_id:result.message_id}));
} else if (action === 'request-credit') {
  const state = JSON.parse(readFileSync('.cinematic-series-state.json', 'utf8'));
  const p = state.pending;
  if (!p?.credit_approval_required || p.credit_notice_status !== 'dispatching') throw new Error('No durable credit approval request');
  const result = await requestCredit(tg, p);
  if (!result?.message_id) throw new Error('Approval request receipt missing');
  console.log(JSON.stringify({message_id: result.message_id}));
} else {
  const state = JSON.parse(readFileSync('.cinematic-series-state.json', 'utf8'));
  const p = state.pending;
  if (!p || p.status !== 'dispatching' || p.file !== file) throw new Error('No matching durable delivery intent');
  if (platform && (!['tiktok', 'instagram'].includes(platform) ||
      p.platform !== platform || p.platform_files?.[platform] !== file ||
      p.platform_receipts?.[platform])) throw new Error('Invalid or already delivered platform');
  const qualityPath = file.replace(/[^/]+$/, 'quality.json');
  const config = JSON.parse(readFileSync('.cinematic-series.json', 'utf8'));
  const expected = p.plan.duration_seconds;
  const contract = config.duration_exceptions?.includes(p.plan.episode) ? 65
    : p.plan.episode >= (config.duration_from_episode ?? 9) ? config.target_seconds : 60;
  if (![45, 60, 65].includes(expected) || expected !== contract) {
    throw new Error('Delivery duration must match the versioned episode contract');
  }
  // Never shorten speech or lip motion to fit the delivery contract.
  // Validate duration before private delivery.
  execFileSync('python3', ['ai-cast/cinematic-series.py', 'conform', '--file', file, '--seconds', String(expected)], { stdio: ['ignore', 'ignore', 'pipe'] });
  const qc = JSON.parse(readFileSync(qualityPath, 'utf8'));
  if (qc.duration !== expected || !qc.genuine_motion || !qc.German_audio || !qc.bilingual_subtitles || !qc.audio_conditioned_lips || !qc.no_slow_motion || !qc.pause_music || qc.music_during_speech_samples !== 0) {
    throw new Error('Video quality gates did not pass');
  }
  // Metadata stays German; Persian belongs only to the in-video subtitles.
  const germanTitle = /\p{Script=Arabic}/u.test(String(p.plan.title_de || ''))
    ? 'Eine neue Geschichte' : p.plan.title_de;
  const shortTitle = Array.from(String(germanTitle || "Deutsch im Alltag").replace(/\s+/g, " ").trim()).slice(0, 70).join("");
  const caption = `${shortTitle}\n#DeutschLernen ${platform === "instagram" ? "#Alltagsdeutsch" : "#LearnGerman"}`;
  const result = await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file, attempts: 1, caption });
  if (!result?.message_id) throw new Error('Telegram did not confirm delivery');
  console.log(JSON.stringify({ message_id: result.message_id }));
}

