// Browser test of the built demo (dist/), served by `npm run preview`.
//   LIVE=1  also send two real calls to onetagai.com with the localhost demo key.
// Without LIVE every OneTag call is answered by a canned response.
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_DIR ? process.env.PW_DIR + '/' : import.meta.url);
const { chromium } = require('playwright-core');

const BASE = process.env.URL || 'http://127.0.0.1:5181/';
const out = [];
const ok = (n, p, d) => out.push((p ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' | ' + JSON.stringify(d).slice(0, 240) : ''));
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--host-resolver-rules=MAP demo.example 127.0.0.1'],
});
const errors = [];
const watch = (page) => {
  page.setDefaultTimeout(4000);
  page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 200)));
};
const ask = async (page, text) => {
  await page.locator('textarea.ant-sender-input').fill(text);
  await page.keyboard.press('Enter');
};
const lastBubble = (page) => page.locator('.ant-bubble').last();

// ---------- mocked ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const posts = [];
  let mode = 'ok';
  await ctx.route(/onetagai\.com\/v1\//, (r) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    posts.push({ url: r.request().url(), body: r.request().postDataJSON(), auth: r.request().headers()['authorization'] || '' });
    const ev = (d) => 'data: ' + (typeof d === 'string' ? d : JSON.stringify(d)) + '\n\n';
    const sse = { 'content-type': 'text/event-stream', ...cors };
    if (mode === '403')
      return r.fulfill({ status: 403, headers: { 'content-type': 'application/json', ...cors }, body: JSON.stringify({ error: { message: 'This key is not allowed on this domain.', type: 'permission', code: 'domain_not_allowed' } }) });
    if (mode === 'mid')
      return r.fulfill({ status: 200, headers: sse, body: ev({ choices: [{ delta: { role: 'assistant', content: '' } }] }) + ev({ choices: [{ delta: { content: 'Half' } }] }) + ev({ error: { message: 'The AI provider returned an error. Please try again.', code: 'upstream' } }) + ev('[DONE]') });
    return r.fulfill({ status: 200, headers: sse, body: ev({ choices: [{ delta: { role: 'assistant', content: '' } }] }) + ev({ choices: [{ delta: { content: '**Tide' } }] }) + ev({ choices: [{ delta: { content: 'pool** answer ' + posts.length } }] }) + ev({ choices: [{ delta: {}, finish_reason: 'stop' }] }) + ev('[DONE]') });
  });
  const page = await ctx.newPage();
  watch(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  ok('chat shown on localhost (demo key)', (await page.locator('textarea.ant-sender-input').count()) === 1);
  await ask(page, 'What is Tidepool?');
  await page.waitForFunction(() => /answer 1/.test(document.querySelector('.ant-bubble-list')?.textContent || ''));
  const p0 = posts[0] || {};
  ok('posts to /v1/chat/completions', p0.url === 'https://onetagai.com/v1/chat/completions', p0.url);
  ok('Bearer key sent', /^Bearer ot_/.test(p0.auth));
  ok('OpenAI body', p0.body?.stream === true && p0.body?.model === 'onetag' && p0.body?.max_tokens === 1000 && p0.body?.messages?.[0]?.content === 'What is Tidepool?', p0.body);
  ok('markdown rendered', (await lastBubble(page).locator('strong').count()) === 1 && /Tidepool answer 1/.test(await lastBubble(page).textContent()), await lastBubble(page).textContent());
  await ask(page, 'And how do I install it?');
  await page.waitForFunction(() => /answer 2/.test(document.querySelector('.ant-bubble-list')?.textContent || ''));
  const p1 = posts[1] || {};
  ok('second call carries the history', JSON.stringify(p1.body?.messages?.map((m) => m.role)) === '["user","assistant","user"]', p1.body?.messages);
  mode = '403';
  await ask(page, 'fail by status');
  await page.waitForFunction(() => /not allowed on this domain/.test(document.querySelector('.ant-bubble-list')?.textContent || ''));
  ok('HTTP error shows the OneTag message', /This key is not allowed on this domain\./.test(await lastBubble(page).textContent()));
  mode = 'mid';
  await ask(page, 'fail mid stream');
  await page.waitForFunction(() => /provider returned an error/.test(document.querySelector('.ant-bubble-list')?.textContent || ''));
  const t = await lastBubble(page).textContent();
  ok('error inside the stream is shown after the partial text', /Half/.test(t) && /The AI provider returned an error/.test(t), t);
  mode = 'ok';
  await ask(page, 'after errors');
  await page.waitForFunction(() => /answer 5/.test(document.querySelector('.ant-bubble-list')?.textContent || ''));
  ok('chat still works after errors', true);
  await page.screenshot({ path: (process.env.SHOT_DIR || '.') + '/mocked.png' });

  // A live domain without a key: the key screen, then a pasted key is used.
  const p2 = await ctx.newPage();
  watch(p2);
  await p2.goto(BASE.replace('127.0.0.1', 'demo.example'), { waitUntil: 'networkidle' });
  ok('key screen on a non-local domain', (await p2.getByText('This page needs a OneTag AI key.').count()) === 1 && (await p2.locator('textarea.ant-sender-input').count()) === 0);
  ok('signup link', (await p2.locator('a[href="https://onetagai.com/#get-key"]').count()) === 1);
  await p2.getByLabel('OneTag AI key').fill('ot_pasted_key');
  await p2.getByRole('button', { name: 'Use key' }).click();
  await ask(p2, 'hello');
  await p2.waitForFunction(() => /answer/.test(document.querySelector('.ant-bubble-list')?.textContent || ''));
  ok('pasted key is used', posts[posts.length - 1].auth === 'Bearer ot_pasted_key');
  await p2.reload({ waitUntil: 'networkidle' });
  ok('pasted key remembered', (await p2.locator('textarea.ant-sender-input').count()) === 1);
  await ctx.close();
}

// ---------- live ----------
if (process.env.LIVE) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const page = await ctx.newPage();
  watch(page);
  const statuses = [];
  page.on('response', (r) => { if (/onetagai\.com/.test(r.url())) statuses.push(r.status() + ' ' + (r.headers()['content-type'] || '')); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await ask(page, 'Reply with exactly the word PONG.');
  await page.waitForFunction(() => document.querySelectorAll('.ant-bubble').length >= 2 && !document.querySelector('.ant-sender .ant-btn-loading, .ant-sender [class*="loading"]') && /\S/.test(document.querySelectorAll('.ant-bubble')[1].textContent) && !/Thinking/.test(document.querySelectorAll('.ant-bubble')[1].textContent), null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const a1 = await lastBubble(page).textContent();
  ok('LIVE first answer streamed', /PONG/i.test(a1), { a1, statuses });
  await ask(page, 'What word did you just reply with? Answer in one word.');
  await page.waitForFunction(() => document.querySelectorAll('.ant-bubble').length >= 4 && !/Thinking/.test(document.querySelectorAll('.ant-bubble')[3].textContent) && /\S/.test(document.querySelectorAll('.ant-bubble')[3].textContent), null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  const a2 = await lastBubble(page).textContent();
  ok('LIVE follow-up uses the history', /PONG/i.test(a2), { a2, statuses });
  await page.screenshot({ path: (process.env.SHOT_DIR || '.') + '/live.png' });
  await ctx.close();
}

ok('no page errors', errors.length === 0, errors);
console.log(out.join('\n').replace(/ot_[A-Za-z0-9_]*/g, (m) => (m === 'ot_pasted_key' ? m : 'ot_XXX')));
await browser.close();
process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
