// The repository already uses Exa's public, keyless MCP endpoint in
// scripts/agent-reach-research.mjs. Only its two advertised read-only tools
// are exposed to the Telegram owner; no arbitrary MCP server or paid key.
const ENDPOINT = 'https://mcp.exa.ai/mcp';
const ALLOWED = new Set(['web_search_exa', 'web_fetch_exa']);
const HEADERS = {
  accept: 'application/json, text/event-stream',
  'content-type': 'application/json',
  'mcp-protocol-version': '2025-06-18',
};

async function mcpRequest(method, params = {}) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`اتصال MCP در دسترس نیست (${response.status}).`);
  const body = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('text/event-stream') || body.startsWith('event:') || body.startsWith('data:')) {
    const event = body.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).find(line => line.startsWith('{'));
    if (!event) throw new Error('پاسخ MCP قابل خواندن نیست.');
    data = JSON.parse(event);
  } else data = JSON.parse(body);
  if (data.error) throw new Error(`MCP: ${String(data.error.message || 'خطای نامشخص').slice(0, 130)}`);
  return data.result;
}

export async function mcpTools() {
  const result = await mcpRequest('tools/list');
  return (result?.tools || []).filter(tool => ALLOWED.has(tool.name) && tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint !== true);
}

async function call(name, args) {
  if (!ALLOWED.has(name)) throw new Error('این ابزار MCP مجاز نیست.');
  const listed = await mcpTools();
  if (!listed.some(tool => tool.name === name)) throw new Error('ابزار خواندنی MCP در حال حاضر ارائه نمی‌شود.');
  const result = await mcpRequest('tools/call', {name, arguments:args});
  if (result?.isError) throw new Error('جست‌وجوی MCP ناموفق بود.');
  const text = (result?.content || []).filter(item => item.type === 'text').map(item => item.text).join('\n').trim();
  if (!text) throw new Error('ابزار MCP نتیجه‌ای برنگرداند.');
  return text.slice(0, 9500);
}

export async function mcpExaSearch(query) {
  const term = String(query || '').trim().slice(0, 250);
  if (term.length < 3) throw new Error('موضوع جست‌وجو را دقیق‌تر بنویسید.');
  return call('web_search_exa', {
    query:term,
    objective:`Find reliable, directly relevant sources for: ${term}. Include URLs and publication dates when available.`,
    numResults:4,
  });
}

export async function mcpExaFetch(url) {
  let parsed;
  try { parsed = new URL(String(url || '').trim()); } catch { throw new Error('نشانی صفحه معتبر نیست.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname.includes('.') || /(?:^localhost$|\.localhost$|\.local$|^[\d.]+$)/i.test(parsed.hostname)) throw new Error('فقط نشانی عمومی HTTPS پذیرفته می‌شود.');
  return call('web_fetch_exa', {urls:[parsed.toString()],maxCharacters:4500});
}

export {mcpRequest};
