// Private delivery only. Stdout is a small JSON receipt, never credentials.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { telegramConfig, verifyDelivery, sendVideo, sendMessage } from '../lib/telegram.mjs';
const [action, file, platform] = process.argv.slice(2);
if (!['verify', 'send', 'request-credit'].includes(action)) throw new Error('Unknown bot operation');
const tg = telegramConfig(process.env);
if (!tg.enabled) throw new Error('Telegram credentials are not configured');
const verified = await verifyDelivery({ token: tg.token, chatId: tg.reviewChatId, requirePrivate: true });
if (!verified.ok) throw new Error(verified.reason);
if (action === 'verify') {
  console.log(JSON.stringify({ ok: true }));
} else if (action === 'request-credit') {
  const state = JSON.parse(readFileSync('.cinematic-series-state.json', 'utf8'));
  const p = state.pending;
  if (!p?.credit_approval_required || p.credit_notice_status !== 'dispatching') throw new Error('No durable credit approval request');
  const result = await sendMessage({token: tg.token, chatId: tg.reviewChatId, text: `ساخت قسمت ${p.plan.episode} به‌دلیل کافی نبودن یا قابل‌بررسی نبودن سهمیه متوقف شد. صحنه‌های آماده محفوظ هستند. برای ادامه از اعتبار استفاده شود؟ بدون اجازهٔ شما مصرف اعتباری فعال نمی‌شود. برای تأیید، در گفتگوی پروژه پاسخ دهید.`});
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
  // A running legacy renderer may still hand over its 65-second master.
  // Preserve its complete story while enforcing the current delivery duration.
  execFileSync('python3', ['ai-cast/cinematic-series.py', 'conform', '--file', file], { stdio: ['ignore', 'ignore', 'pipe'] });
  const qc = JSON.parse(readFileSync(qualityPath, 'utf8'));
  if (qc.duration !== 60 || !qc.genuine_motion || !qc.German_audio || !qc.bilingual_subtitles || !qc.audio_conditioned_lips || !qc.no_slow_motion || !qc.pause_music || qc.music_during_speech_samples !== 0) {
    throw new Error('Video quality gates did not pass');
  }
  // Metadata stays German; Persian belongs only to the in-video subtitles.
  const germanTitle = /\p{Script=Arabic}/u.test(String(p.plan.title_de || ''))
    ? 'Eine neue Geschichte' : p.plan.title_de;
  const caption = `${germanTitle}\n\n#DeutschLernen #DeutschA1 #Alltagsdeutsch #DeutschDialoge`;
  const result = await sendVideo({ token: tg.token, chatId: tg.reviewChatId, file, attempts: 1, caption });
  if (!result?.message_id) throw new Error('Telegram did not confirm delivery');
  console.log(JSON.stringify({ message_id: result.message_id }));
}
