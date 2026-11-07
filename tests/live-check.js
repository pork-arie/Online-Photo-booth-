// Checks the LIVE site (GitHub Pages) with the real public connection service: one browser opens a booth,
// another joins from the invite link, and every step is logged. Run: node live-check.js [site-url]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'https://pork-arie.github.io/Online-Photo-booth-/';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const mk = async (name) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera', 'microphone'] });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => log(name, 'PAGE ERROR', e.message));
    p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log(name, 'console.' + m.type(), m.text().slice(0, 300)); });
    p.on('requestfailed', (r) => log(name, 'REQUEST FAILED', r.url().slice(0, 120), r.failure() && r.failure().errorText));
    p.on('websocket', (ws) => { log(name, 'websocket open', ws.url().slice(0, 80)); ws.on('close', () => log(name, 'websocket closed')); ws.on('socketerror', (e) => log(name, 'websocket error', e)); });
    return p;
  };
  const state = (p) => p.evaluate(() => ({ view: document.getElementById('booth').hidden ? 'lobby' : document.getElementById('booth').dataset.view,
    note: (document.getElementById('setupNote') || {}).textContent, invite: (document.getElementById('inviteNote') || {}).textContent,
    status: document.getElementById('status').textContent, pill: document.getElementById('pillText').textContent, peer: typeof Peer }));
  let ok = false;
  try {
    const H = await mk('HOST');
    await H.goto(SITE, { waitUntil: 'networkidle' }); log('HOST loaded', JSON.stringify(await state(H)));
    await H.click('#startBtn'); await H.click('#startCamBtn');
    for (let k = 0; k < 30 && (await state(H)).view !== 'shoot'; k++) await H.waitForTimeout(1000);
    log('HOST after Open my booth', JSON.stringify(await state(H)));
    const code = (await H.textContent('#codeChip')).trim(); log('code', code);
    const G = await mk('GUEST');
    await G.goto(SITE + '?join=' + code, { waitUntil: 'networkidle' }); log('GUEST loaded, invite shown:', await G.isVisible('#invite'));
    await G.click('#inviteJoin');
    for (let k = 0; k < 40; k++) {
      await G.waitForTimeout(1000); const s = await state(G);
      if (k % 3 === 0 || s.view === 'shoot') log('GUEST', k + 's', JSON.stringify(s));
      if (s.view === 'shoot') break;
    }
    await G.waitForTimeout(4000);
    const vids = async (p) => p.evaluate(() => ['vidA', 'vidB'].map((id) => document.getElementById(id).videoWidth));
    log('HOST', JSON.stringify(await state(H)), 'videos', JSON.stringify(await vids(H)));
    log('GUEST', JSON.stringify(await state(G)), 'videos', JSON.stringify(await vids(G)));
    ok = (await state(G)).view === 'shoot' && (await state(H)).pill === 'Connected';
  } catch (e) { log('ERROR', e.message); }
  log(ok ? 'RESULT: CONNECTED' : 'RESULT: FAILED TO CONNECT');
  await b.close(); process.exit(ok ? 0 : 1);
})();
