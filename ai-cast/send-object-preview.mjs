import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {telegramConfig, verifyDelivery, sendVideo} from '../lib/telegram.mjs';
const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const path = '.episode4-object-preview-receipt.json';
const state = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {receipts: {}, status: 'ready'};
if (state.status === 'dispatching') throw new Error('Unconfirmed preview upload; do not resend automatically');
const qc = manifest.quality;
if (!(qc.duration >= 10 && qc.duration <= 10.05 && qc.genuine_motion && qc.German_audio && qc.bilingual_subtitles && qc.audio_conditioned_lips && qc.no_slow_motion)) throw new Error('Preview quality failed');
if (!qc.pause_music || qc.music_during_speech_samples !== 0) throw new Error('Pause-only music gate failed');
const tg = telegramConfig(process.env);
const verified = await verifyDelivery({token: tg.token, chatId: tg.reviewChatId, requirePrivate: true});
if (!verified.ok) throw new Error('Private preview destination could not be verified');
function save() {
  writeFileSync(path, JSON.stringify(state, null, 2) + '\n');
  const git = (...args) => execFileSync('git', args, {stdio: ['ignore', 'ignore', 'pipe']});
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', 'github-actions[bot]@users.noreply.github.com');
  git('add', '-f', path);
  try {git('diff', '--cached', '--quiet'); return;} catch {}
  git('commit', '-m', 'comedy preview: checkpoint private delivery receipt');
  git('pull', '--rebase', '--autostash', 'origin', 'main');
  git('push', 'origin', 'HEAD:main');
}
for (const platform of ['tiktok', 'instagram']) {
  if (state.receipts[platform]) continue;
  state.status = 'dispatching'; state.platform = platform; save();
  const caption = `Marta & Lukas: Alltag in Deutschland · Vorschau\nIm Supermarkt · Einkaufskorb und Tomaten\n${platform === 'tiktok' ? 'TikTok-Version' : 'Instagram-Reels-Version'}\n\n#DeutschLernen #AlltagInDeutschland #Animation #DeutschDialoge ${platform === 'tiktok' ? '#TikTok' : '#Reels'}`;
  const result = await sendVideo({token: tg.token, chatId: tg.reviewChatId, file: manifest.files[platform], attempts: 1, caption});
  if (!result?.message_id) throw new Error('Preview delivery receipt missing');
  state.receipts[platform] = result.message_id; state.status = 'ready'; save();
}
console.log(JSON.stringify(state.receipts));
