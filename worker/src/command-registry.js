// Owner-only, persistent aliases for existing bot commands. Aliases are data,
// never executable code or arbitrary GitHub/MCP tool definitions.
export const BASE_COMMANDS = [
  {command:'start',description:'شروع گفتگو و راهنما'},
  {command:'help',description:'راهنمای بات'},
  {command:'chat',description:'گفت‌وگوی آزاد و پرسش و پاسخ'},
  {command:'status',description:'وضعیت ساخت ویدیو'},
  {command:'credit',description:'وضعیت تأیید اعتبار'},
  {command:'episode',description:'درخواست قسمت بعدی'},
  {command:'queue',description:'محتوای واقعی در صف تولید'},
  {command:'scenario',description:'سناریوی یک قسمت'},
  {command:'prompt',description:'پرامپت صحنه‌های یک قسمت'},
  {command:'insights',description:'مقایسهٔ آمار ویدیوها'},
  {command:'review',description:'بررسی حساب‌های easydeutsches'},
  {command:'strategy',description:'برنامهٔ بهبود محتوای بعد'},
  {command:'references',description:'نمونه‌های پیدا‌شده برای بررسی'},
  {command:'monitor',description:'وضعیت پایش خودکار'},
  {command:'connect',description:'اتصال رسمی حساب اجتماعی'},
  {command:'disconnect',description:'برداشتن اتصال حساب از بات'},
  {command:'metrics',description:'ثبت آمار JSON با برچسب منبع'},
  {command:'files',description:'فهرست فایل‌های GitHub'},
  {command:'read',description:'خواندن فایل از GitHub'},
  {command:'find',description:'یافتن فایل در مخزن'},
  {command:'search',description:'جست‌وجوی وب'},
  {command:'mcp',description:'ابزارهای MCP متصل'},
  {command:'mcp_search',description:'جست‌وجو با Exa MCP'},
  {command:'mcp_fetch',description:'خواندن صفحه با Exa MCP'},
  {command:'runs',description:'آخرین اجراهای GitHub'},
  {command:'jobs',description:'جزئیات یک اجرا در GitHub'},
  {command:'edit',description:'ویرایش فایل متنی در GitHub'},
  {command:'new',description:'گفتگوی تازه'},
  {command:'commands',description:'همه فرمان‌های شماره‌ای'},
  {command:'addcmd',description:'نصب میان‌بر برای یک دستور موجود'},
  {command:'delcmd',description:'حذف میان‌بر نصب‌شده'},
  {command:'mycmds',description:'فهرست میان‌برهای من'},
  {command:'synccmds',description:'همگام‌سازی منوی دستورها'},
];

const TARGETS = new Set(['help','chat','status','credit','episode','queue','scenario','prompt','files','read','find','search','mcp','mcp_search','mcp_fetch','runs','jobs','new','commands','insights','review','strategy','monitor']);
const RESERVED = new Set([...BASE_COMMANDS.map(item=>item.command),'ls','cat','web','actions','reset','menu','undo','repo_search','edit']);
const ALIAS_KEY = chatId => `command-aliases:${chatId}`;
const MENU_VERSION = BASE_COMMANDS.map(item=>item.command).join(',');
const NAME = /^[a-z][a-z0-9_]{0,31}$/;
const TARGET_WORDS = {وضعیت:'status',اعتبار:'credit',قسمت:'episode',اجراها:'runs',راهنما:'help'};
const guidance = 'نمونه: <code>/addcmd check status</code>؛ سپس <code>/check</code>. حذف: <code>/delcmd check</code>. فهرست: /mycmds.';

export function parseCommandManagement(raw) {
  const text = String(raw || '').trim();
  let match = text.match(/^\/addcmd\s+\/?([^\s=]+)\s*(?:=|->)?\s*\/?([^\s]+)\s*$/i)
    || text.match(/^دستور\s+\/?([a-z][a-z0-9_]*)\s+را\s+برای\s+\/?([a-z_]+|وضعیت|اعتبار|قسمت|اجراها|راهنما)\s+(?:نصب|اضافه)\s+کن$/i);
  if (match) return {action:'add',name:match[1].toLowerCase(),target:(Object.hasOwn(TARGET_WORDS,match[2]) ? TARGET_WORDS[match[2]] : match[2]).toLowerCase()};
  match = text.match(/^\/delcmd\s+\/?([^\s]+)\s*$/i)
    || text.match(/^دستور\s+\/?([a-z][a-z0-9_]*)\s+را\s+حذف\s+کن$/i);
  if (match) return {action:'delete',name:match[1].toLowerCase()};
  if (/^\/(?:mycmds|synccmds)$/i.test(text)) return {action:text.slice(1).toLowerCase()};
  if (/^\/(?:addcmd|delcmd)(?:\s|$)/i.test(text) || /^(?:نصب|حذف)\s+(?:یک\s+)?دستور|^دستور\s+.*(?:نصب|حذف)\s+کن$/i.test(text)) return {action:'help'};
  return null;
}

async function aliases(env, chatId) {
  if (!env.BOT_STATE) throw new Error('حافظهٔ دائمی بات در دسترس نیست.');
  const value = await env.BOT_STATE.get(ALIAS_KEY(chatId),'json');
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function syncMenu(env, chatId, entries, telegram) {
  const scope = {type:'chat',chat_id:Number(chatId)};
  const commands = [...BASE_COMMANDS, ...Object.entries(entries).sort(([a],[b])=>a.localeCompare(b)).map(([command,target])=>({
    command,description:`میان‌بر /${target}`,
  }))];
  await telegram(env,'setMyCommands',{scope,commands});
  await env.BOT_STATE?.put(`command-menu-version:${chatId}`,MENU_VERSION);
}

export async function manageCommands(env, chatId, raw, telegram) {
  const task = parseCommandManagement(raw);
  if (!task) {
    if (env.BOT_STATE && await env.BOT_STATE.get(`command-menu-version:${chatId}`) !== MENU_VERSION) {
      try { await syncMenu(env,chatId,await aliases(env,chatId),telegram); } catch { /* Menu repair must not block chat. */ }
    }
    return null;
  }
  if (task.action === 'help') return guidance;
  const current = await aliases(env,chatId);
  if (task.action === 'mycmds') {
    const rows = Object.entries(current).sort(([a],[b])=>a.localeCompare(b));
    return rows.length ? `میان‌برهای شما:\n${rows.map(([name,target])=>`/${name} → /${target}`).join('\n')}` : `هنوز میان‌بری نصب نشده است.\n${guidance}`;
  }
  if (task.action === 'synccmds') {
    await syncMenu(env,chatId,current,telegram);
    return '✅ منوی دستورهای شما همگام شد.';
  }
  if (!NAME.test(task.name)) return `نام دستور فقط حروف کوچک انگلیسی، عدد و _ دارد و با حرف شروع می‌شود.\n${guidance}`;
  if (task.action === 'add') {
    if (RESERVED.has(task.name)) return 'این نام به یک دستور اصلی بات تعلق دارد و قابل جایگزینی نیست.';
    if (!TARGETS.has(task.target)) return `این مقصد قابل نصب نیست. دستور باید به یکی از فرمان‌های موجود وصل شود؛ مثل /status، /runs یا /mcp_search.\n${guidance}`;
    if (!current[task.name] && Object.keys(current).length >= 20) return 'حداکثر ۲۰ میان‌بر می‌توانید نصب کنید.';
    current[task.name] = task.target;
    await env.BOT_STATE.put(ALIAS_KEY(chatId),JSON.stringify(current));
    try { await syncMenu(env,chatId,current,telegram); }
    catch { return `✅ /${task.name} → /${task.target} نصب شد؛ منوی تلگرام فعلاً به‌روز نشد. با /synccmds دوباره امتحان کنید.`; }
    return `✅ /${task.name} → /${task.target} نصب شد و در منوی شما نمایش داده می‌شود.`;
  }
  if (!Object.hasOwn(current,task.name)) return RESERVED.has(task.name) ? 'دستور اصلی بات قابل حذف نیست.' : 'این میان‌بر نصب نشده است.';
  delete current[task.name];
  await env.BOT_STATE.put(ALIAS_KEY(chatId),JSON.stringify(current));
  try { await syncMenu(env,chatId,current,telegram); }
  catch { return `✅ /${task.name} حذف شد؛ منوی تلگرام فعلاً به‌روز نشد. با /synccmds دوباره امتحان کنید.`; }
  return `✅ /${task.name} حذف شد.`;
}

export async function resolveAlias(env, chatId, raw) {
  const match = String(raw || '').trim().match(/^\/([a-z][a-z0-9_]*)(?:@[a-z0-9_]+)?(?:\s+([\s\S]+))?$/i);
  if (!match || RESERVED.has(match[1].toLowerCase()) || !env.BOT_STATE) return null;
  const target = (await aliases(env,chatId))[match[1].toLowerCase()];
  return TARGETS.has(target) ? `/${target}${match[2] ? ' '+match[2] : ''}` : null;
}
