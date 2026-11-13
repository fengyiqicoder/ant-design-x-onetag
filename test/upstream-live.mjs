// Live check of the exact demo file proposed for ant-design/x, two real calls:
//   PLAIN_URL  build without a key: the placeholder key must come back as OneTag's own message
//   KEYED_URL  build with the localhost demo key, served on 127.0.0.1: a real streamed answer
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_DIR ? process.env.PW_DIR + '/' : import.meta.url);
const { chromium } = require('playwright-core');
const out = [];
const ok = (n, p, d) => out.push((p ? 'PASS ' : 'FAIL ') + n + (d !== undefined ? ' | ' + JSON.stringify(d).slice(0, 300) : ''));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const run = async (url, question) => {
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(4000); page.setDefaultNavigationTimeout(30000);
  const statuses = [];
  page.on('response', (r) => { if (/onetagai\.com/.test(r.url())) statuses.push(r.status()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('textarea.ant-sender-input').fill(question);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => { const b = document.querySelectorAll('.ant-bubble'); return b.length >= 2 && !/Please wait/.test(b[1].textContent) && /\S/.test(b[1].textContent); }, null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  return { text: (await page.locator('.ant-bubble').nth(1).textContent()).trim(), statuses };
};
const a = await run(process.env.PLAIN_URL, 'hello');
ok('placeholder key: OneTag reason shown, not just a status', a.statuses[0] >= 400 && !/status \d+/.test(a.text) && a.text.length > 0, a);
const b = await run(process.env.KEYED_URL, 'Reply with exactly the word PONG.');
ok('demo key: real streamed answer', b.statuses[0] === 200 && /PONG/i.test(b.text), b);
console.log(out.join('\n'));
await browser.close();
process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
