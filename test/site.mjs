// Checks a site built with ONETAG_KEY set (as GitHub Pages builds it), served on a non-local
// domain: the built-in key must be used, without the key screen. Calls are mocked.
//   ONETAG_KEY=ot_site_test sh scripts/build-site.sh <dir> && serve <dir> && node test/site.mjs
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_DIR ? process.env.PW_DIR + '/' : import.meta.url);
const { chromium } = require('playwright-core');
const BASE = process.env.URL || 'http://demo.example:5182/';
const out = [];
const ok = (n, p, d) => out.push((p ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' | ' + JSON.stringify(d).slice(0, 200) : ''));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--host-resolver-rules=MAP demo.example 127.0.0.1'] });
const ctx = await browser.newContext();
const auths = [];
await ctx.route(/onetagai\.com\/v1\//, (r) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
  auths.push(r.request().headers()['authorization']);
  return r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', ...cors }, body: 'data: {"choices":[{"delta":{"content":"site ok"}}]}\n\ndata: [DONE]\n\n' });
});
for (const path of ['', 'upstream/demo.html']) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(4000); page.setDefaultNavigationTimeout(30000);
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const box = page.locator('textarea.ant-sender-input');
  ok(`/${path} shows the chat, not the key screen`, (await box.count()) === 1);
  if (await box.count()) {
    await box.fill('hi'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => /site ok/.test(document.body.textContent || ''));
    ok(`/${path} sends the built-in key`, auths[auths.length - 1] === 'Bearer ' + (process.env.EXPECT_KEY || 'ot_site_test'), auths[auths.length - 1]);
  }
}
console.log(out.join('\n'));
await browser.close();
process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
