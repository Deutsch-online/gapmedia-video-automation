import {readFileSync, writeFileSync, existsSync, renameSync} from 'node:fs';
import {createHash, randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export const CREDIT_FILE = '.cinematic-credit-request.json';
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const planHash = plan => createHash('sha256').update(canonical(plan)).digest('hex');
const read = path => existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
function save(request) {
  writeFileSync(CREDIT_FILE + '.tmp', JSON.stringify(request, null, 2) + '\n');
  renameSync(CREDIT_FILE + '.tmp', CREDIT_FILE);
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  const git = (...args) => execFileSync('git', args, {stdio: ['ignore', 'ignore', 'pipe']});
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', 'github-actions[bot]@users.noreply.github.com');
  git('add', '-f', CREDIT_FILE);
  try { git('diff', '--cached', '--quiet'); return; } catch {}
  git('commit', '-m', 'Checkpoint scoped Telegram credit decision');
  git('pull', '--rebase', '--autostash', 'origin', 'main');
  git('push', 'origin', 'HEAD:main');
}
async function api(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) throw new Error('Telegram credit operation failed: ' + method);
  return data.result;
}
export async function requestCredit(tg, pending) {
  let previous = read(CREDIT_FILE);
  if (previous && ['pending', 'approved'].includes(previous.status) && Date.parse(previous.expires_at) <= Date.now()) {
    previous.status = 'expired'; save(previous);
  }
  const hash = planHash(pending.plan);
  if (previous?.plan_sha === hash && ['sending', 'pending', 'approved', 'running', 'rejected'].includes(previous.status)) {
    if (previous.message_id) return {message_id: previous.message_id};
    throw new Error('Unconfirmed credit prompt; reconcile before resending');
  }
  const first = pending.credit_from_scene;
  if (!Number.isInteger(first) || first < 0 || first >= pending.plan.scenes.length) throw new Error('Credit scope missing');
  const request = {id: randomBytes(12).toString('hex'), status: 'sending', plan_sha: hash,
    kind: pending.kind === 'preview' ? 'preview' : 'episode', episode: pending.plan.episode, scenes: pending.plan.scenes.map((_, i) => i).filter(i => i >= first),
    chat_id: String(tg.reviewChatId), expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()};
  save(request);
  const message = await api(tg.token, 'sendMessage', {chat_id: request.chat_id,
    text: `برای ${request.kind === 'preview' ? 'نمونهٔ کمدی «اولین خرید»' : 'تکمیل قسمت ' + request.episode} (${request.scenes.length * 5} ثانیه) از اعتبار استفاده شود؟\nتأیید فقط برای یک تلاش روی همین صحنه‌هاست؛ هزینهٔ نهایی تابع زمان GPU است.\nبدون تأیید، اعتبار مصرف نمی‌شود.`,
    reply_markup: {inline_keyboard: [[
      {text: '✅ تأیید مصرف اعتبار', callback_data: `cc:y:${request.id}`},
      {text: '❌ رد', callback_data: `cc:n:${request.id}`},
    ]]}});
  request.message_id = message.message_id; request.status = 'pending'; save(request);
  // Start the existing single Telegram consumer immediately; no competing getUpdates loop.
  if (process.env.GH_TOKEN && process.env.GITHUB_REPOSITORY) {
    try {
      const webhook = await api(tg.token, 'getWebhookInfo', {});
      if (webhook.url) return {message_id: message.message_id};
      const dispatch = await fetch('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + '/actions/workflows/telegram.yml/dispatches', {
        method: 'POST', headers: {Authorization: 'Bearer ' + process.env.GH_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json'},
        body: JSON.stringify({ref: 'main', inputs: {credit_wait: 'true'}}),
      });
      if (!dispatch.ok) console.error('Credit reply listener dispatch failed with status ' + dispatch.status);
    } catch { console.error('Credit reply listener dispatch failed; scheduled polling remains enabled'); }
  }
  return {message_id: message.message_id};
}
export function decideCredit(request, query, plan, now = Date.now()) {
  const match = /^cc:([yn]):([a-f0-9]{24})$/.exec(query?.data || '');
  if (!match || !request || request.status !== 'pending' || match[2] !== request.id) return null;
  if (query.message?.chat?.type !== 'private' || String(query.message.chat.id) !== request.chat_id ||
      String(query.from?.id) !== request.chat_id || query.message.message_id !== request.message_id) return null;
  if (!(Date.parse(request.expires_at) > now) || !plan || request.plan_sha !== planHash(plan)) return null;
  return {...request, status: match[1] === 'y' ? 'approved' : 'rejected', decided_at: new Date(now).toISOString()};
}
export async function handleCreditCallback(query, tg) {
  if (!query?.data?.startsWith('cc:')) return false;
  const current = read(CREDIT_FILE);
  const state = read('.cinematic-series-state.json');
  const plan = current?.kind === 'preview' ? read('ai-cast/newcomer-preview-plan.json') : state?.pending?.plan;
  const decision = decideCredit(current, query, plan);
  if (!decision || String(tg.reviewChatId) !== current.chat_id) {
    await api(tg.token, 'answerCallbackQuery', {callback_query_id: query.id, text: 'این درخواست معتبر یا فعال نیست.'}).catch(() => {});
    return true;
  }
  save(decision); // Persist before acknowledging the update or allowing a render.
  await api(tg.token, 'answerCallbackQuery', {callback_query_id: query.id, text: decision.status === 'approved' ? 'تأیید ثبت شد.' : 'رد شد؛ اعتبار مصرف نمی‌شود.'}).catch(() => {});
  await api(tg.token, 'editMessageReplyMarkup', {chat_id: current.chat_id, message_id: current.message_id, reply_markup: {inline_keyboard: []}}).catch(() => {});
  await api(tg.token, 'sendMessage', {chat_id: current.chat_id, text: decision.status === 'approved'
    ? '✅ تأیید ثبت شد؛ ادامهٔ همین قسمت در نوبت اجرا انجام می‌شود.'
    : '❌ مصرف اعتبار رد شد؛ ادامه فقط با سهمیه خواهد بود.'}).catch(() => {});
  if (decision.status === 'approved') {
    console.log('CREDIT_APPROVED=true');
    console.log('CREDIT_WORKFLOW=' + (decision.kind === 'preview' ? 'newcomer-preview.yml' : 'cinematic-series.yml'));
  }
  return true;
}
