// Private delivery only. Stdout is a small JSON receipt, never credentials.
import { readFileSync } from 'node:fs';
import { telegramConfig, verifyDelivery, sendVideo } from '../lib/telegram.mjs';
const [action, file] = process.argv.slice(2);
if (!['verify', 'send'].includes(action)) throw new Error('Unknown bot operation');
const tg = telegramConfig(process.env);
if (!tg.enabled) throw new Error('Telegram credentials are not configured');
const verified = await verifyDelivery({ token: tg.token, chatId: tg.reviewChatId, requirePrivate: true });
if (!verified.ok) throw new Error(verified.reason);
if (action === 'verify') {
  console.log(JSON.stringify({ ok: true }));
} else {
  const state = JSON.parse(readFileSync('.cinematic-series-state.json', 'utf8'));
  const p = state.pending;
  if (!p || p.status !== 'dispatching' || p.file !== file) throw new Error('No matching durable delivery intent');
  const qualityPath = file.replace(/[^/]+$/, 'quality.json');
  const qc = JSON.parse(readFileSync(qualityPath, 'utf8'));
  if (qc.duration < 60 || !qc.genuine_motion || !qc.German_audio || !qc.bilingual_subtitles) {
    throw new Error('Video quality gates did not pass');
  }
  const result = await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file, attempts: 1,
    caption: `Marta und Lukas · Folge ${p.plan.episode}\n${p.plan.title_de}\nقسمت ${p.plan.episode} — ${p.plan.title_fa}\n\nآلمانی با زیرنویس فارسی و آلمانی` });
  if (!result?.message_id) throw new Error('Telegram did not confirm delivery');
  console.log(JSON.stringify({ message_id: result.message_id }));
}
