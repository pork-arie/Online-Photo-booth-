const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const { PeerServer } = require('peer');
const fs = require('fs');
const results = []; const check = (n, ok, x = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  (' + x + ')' : ''}`);
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'test-output');
fs.mkdirSync(OUT, { recursive: true });

// Serve the repo root on :8080 (the camera needs localhost or https).
const web = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': file.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(8080, '127.0.0.1');
// Local PeerJS connection server on :9000 instead of the public cloud one.
const signal = PeerServer({ port: 9000, host: '127.0.0.1', path: '/' });

(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const peerjs = fs.readFileSync(require.resolve('peerjs/dist/peerjs.min.js'));
  const errs = [];
  const mk = async (name, vp) => {
    const ctx = await b.newContext({ viewport: vp, permissions: ['camera', 'microphone'], deviceScaleFactor: 1 });
    await ctx.route('https://unpkg.com/**', (r) => r.fulfill({ body: peerjs, contentType: 'application/javascript' }));
    await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
    return p;
  };
  const q = '?peerhost=localhost&peerport=9000&peersecure=0&peerpath=/';
  const A = await mk('A', { width: 1280, height: 900 });
  await A.goto('http://localhost:8080/index.html' + q); await A.waitForTimeout(500);
  await A.screenshot({ path: OUT + '/lobby.png' });
  await A.click('#startBtn');
  await A.waitForSelector('#booth:not([hidden])', { timeout: 15000 });
  const code = (await A.textContent('#codeChip')).trim();
  check('Host opens a booth with a code', /^[A-Z0-9]{6}$/.test(code), code);
  check('Host sees own camera', await A.evaluate(() => document.getElementById('vidA').videoWidth > 0));

  const B = await mk('B', { width: 390, height: 844 });
  await B.goto('http://localhost:8080/index.html' + q + '&join=' + code); await B.waitForTimeout(500);
  check('Invite link pre-fills the code', (await B.inputValue('#joinCode')) === code);
  await B.click('#joinBtn');
  await B.waitForSelector('#booth:not([hidden])', { timeout: 20000 });
  await A.waitForFunction(() => document.getElementById('vidB').videoWidth > 0, null, { timeout: 20000 }).catch(() => {});
  await B.waitForFunction(() => document.getElementById('vidA').videoWidth > 0, null, { timeout: 20000 }).catch(() => {});
  check('Host sees partner live video', await A.evaluate(() => document.getElementById('vidB').videoWidth > 0));
  check('Partner sees host live video', await B.evaluate(() => document.getElementById('vidA').videoWidth > 0));
  check('Both show Connected', (await A.textContent('#pillText')) === 'Connected' && (await B.textContent('#pillText')) === 'Connected');
  check('Partner hears host (audio track present)', await B.evaluate(() => { const s = document.getElementById('vidA').srcObject; return !!s && s.getAudioTracks().length > 0; }));

  // settings sync
  await B.locator('#looks .chip', { hasText: 'Pasko' }).click();
  await A.locator('#films .chip', { hasText: 'Silver' }).click();
  await A.fill('#caption', 'Miss you, love'); await A.waitForTimeout(900);
  check('Season syncs partner -> host', (await A.locator('#looks [aria-pressed=true]').textContent()).includes('Pasko'));
  check('Film + caption sync host -> partner', (await B.locator('#films [aria-pressed=true]').textContent()) === 'Silver' && (await B.inputValue('#caption')) === 'Miss you, love');
  await A.locator('#films .chip', { hasText: 'Natural' }).click(); await A.waitForTimeout(400);

  // synced 4-shot session started by the partner
  await B.click('#shootBtn');
  await A.waitForTimeout(1000);
  check('Host gets the same pose card', (await A.locator('.pose-pop b').textContent().catch(() => '')) === (await B.locator('.pose-pop b').textContent().catch(() => '-')), await A.locator('.pose-pop b').textContent().catch(() => 'none'));
  await A.waitForTimeout(2300);
  await A.screenshot({ path: OUT + '/countdown-host.png' }); await B.screenshot({ path: OUT + '/countdown-partner.png' });
  await A.waitForFunction(() => !document.getElementById('shootBtn').disabled, null, { timeout: 40000 });
  await B.waitForFunction(() => !document.getElementById('shootBtn').disabled, null, { timeout: 40000 });
  await A.waitForTimeout(1500);
  const filled = (p) => p.evaluate(() => document.querySelectorAll('#thumbs img').length);
  check('Host has all 8 photos (4 each side)', (await filled(A)) === 8, String(await filled(A)));
  check('Partner has all 8 photos', (await filled(B)) === 8, String(await filled(B)));
  check('Print saves as PNG', (await A.evaluate(() => new Promise((r) => document.getElementById('strip').toBlob((x) => r(x ? x.size : 0))))) > 0);
  await A.screenshot({ path: OUT + '/booth-host.png', fullPage: true });
  await B.screenshot({ path: OUT + '/booth-partner.png', fullPage: true });
  await A.locator('#strip').screenshot({ path: OUT + '/print.png' });
  const dl = A.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await A.click('#saveBtn'); const d = await dl;
  check('Save print downloads a file', !!d, d ? d.suggestedFilename() : '');
  // partner leaves
  await B.click('#leaveBtn'); await A.waitForTimeout(1500);
  check('Host is told partner left', (await A.textContent('#pillText')) === 'Partner left');
  check('Phone layout: no sideways scroll', (await B.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  check('No JavaScript errors', errs.length === 0, errs.join(' | ').slice(0, 400));
  console.log(results.join('\n')); await b.close();
  web.close(); signal.close && signal.close();
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
