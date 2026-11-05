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
  let f = file; if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(8080, '127.0.0.1');
// Local PeerJS connection server on :9000 instead of the public cloud one.
const signal = PeerServer({ port: 9000, host: '127.0.0.1', path: '/' });

(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const peerjs = fs.readFileSync(require.resolve('peerjs/dist/peerjs.min.js'));
  const errs = [];
  const mk = async (name, vp, plain) => {
    const ctx = await b.newContext({ viewport: vp, permissions: ['camera', 'microphone'], deviceScaleFactor: 1 });
    if (!plain) { // serve the PeerJS library locally; skipped for the offline check because routing bypasses the offline helper
      await ctx.route('https://unpkg.com/**', (r) => r.fulfill({ body: peerjs, contentType: 'application/javascript' }));
      await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
    }
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(name + ' console: ' + m.text()); });
    return p;
  };
  const q = '?peerhost=localhost&peerport=9000&peersecure=0&peerpath=/&nosw=1';
  const A = await mk('A', { width: 1280, height: 900 });
  await A.goto('http://localhost:8080/index.html' + q); await A.waitForTimeout(500);
  await A.screenshot({ path: OUT + '/lobby.png' });
  check('Start page hides the connection label', !(await A.isVisible('#pill')));
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

  // camera switch: back, then front again
  await A.click('#flipBtn'); await A.waitForTimeout(1200);
  const st1 = await A.textContent('#status');
  check('Switch to back camera', st1.includes('Back camera') && await A.evaluate(() => document.getElementById('vidA').videoWidth > 0), st1);
  check("Partner sees host's back camera unmirrored", (await B.evaluate(() => document.getElementById('vidA').style.transform)) === 'none');
  await A.click('#flipBtn'); await A.waitForTimeout(1200);
  const st2 = await A.textContent('#status');
  check('Switch back to front camera', st2.includes('Front camera') && await A.evaluate(() => document.getElementById('vidA').videoWidth > 0), st2);
  await A.click('#flipBtn'); await A.waitForTimeout(1200); await A.click('#flipBtn'); await A.waitForTimeout(1200);
  check('Switching again and again keeps working', (await A.textContent('#status')).includes('Front camera'));
  check('Partner still gets live video after switching', await B.evaluate(() => { const v = document.getElementById('vidA'); return v.videoWidth > 0 && !v.paused; }));
  check('Connection label shows Connected', (await A.textContent('#pillText')) === 'Connected' && await A.isVisible('#pill'));

  // settings sync
  await B.locator('#seasons .chip', { hasText: 'Pasko' }).click();
  await A.locator('#films .chip', { hasText: 'Silver' }).click();
  await A.click('#tabBtn-caption'); await A.fill('#caption', 'Miss you, love'); await A.click('#tabBtn-look'); await A.waitForTimeout(900);
  check('Season syncs partner -> host', (await A.locator('#seasons [aria-pressed=true]').textContent()).includes('Pasko'));
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
  // ---- solo booth ----
  const S = await mk('Solo', { width: 1200, height: 900 });
  await S.goto('http://localhost:8080/solo/index.html?nosw=1'); await S.waitForTimeout(800);
  check('Solo: home page shows', await S.isVisible('#homeView'));
  check('Solo: links to the live booth', (await S.getAttribute('.nav-links a.quiet', 'href')) === '../');
  await S.click('#enterBtn'); await S.waitForTimeout(400);
  check('Solo: Step inside opens the booth', await S.isVisible('#boothView'));
  const photo = await S.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#e63946'; g.fillRect(0, 0, 800, 600); return c.toDataURL('image/jpeg').split(',')[1]; });
  await S.setInputFiles('#chooseInput', { name: 'me.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(photo, 'base64') }); await S.waitForTimeout(600);
  check('Solo: adding a photo works', (await S.locator('#slots .slot.filled').count()) === 1);
  const sdl = S.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await S.click('#saveBtn'); const sd = await sdl;
  check('Solo: Save print downloads a file', !!sd, sd ? sd.suggestedFilename() : '');
  await S.locator('.switch').click(); await S.waitForTimeout(300);
  check('Solo: Duo points to the live booth', (await S.textContent('#togetherNote')).includes('live booth for two'));
  await S.screenshot({ path: OUT + '/solo-booth.png', fullPage: true });
  const L = await mk('Lobby', { width: 390, height: 844 });
  await L.goto('http://localhost:8080/index.html?nosw=1'); await L.waitForTimeout(300);
  check('Start page offers Just me, Together and Use my photos', await L.isVisible('#soloBtn') && await L.isVisible('#startBtn') && (await L.getAttribute('a[href="solo/"]', 'href')) === 'solo/');
  check('Start page fits a phone screen', (await L.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await L.screenshot({ path: OUT + '/lobby-phone.png', fullPage: true });

  // ---- Just me (live camera, no partner) ----
  const J = await mk('JustMe', { width: 1280, height: 900 });
  await J.goto('http://localhost:8080/index.html' + q); await J.waitForTimeout(400);
  await J.click('#soloBtn'); await J.waitForSelector('#booth:not([hidden])', { timeout: 10000 });
  await J.waitForFunction(() => document.getElementById('vidA').videoWidth > 0, null, { timeout: 10000 }).catch(() => {});
  check('Just me opens the camera without a partner', (await J.textContent('#modeTag')) === 'Just me' && await J.evaluate(() => document.getElementById('stage').classList.contains('solo') && document.getElementById('vidA').videoWidth > 0));
  check('Just me hides code, share and mic', !(await J.isVisible('#codeWrap')) && !(await J.isVisible('#micBtn')) && !(await J.isVisible('#pill')));
  check('Just me: Start is ready right away', !(await J.isDisabled('#shootBtn')));
  await J.click('#tabBtn-poses');
  check('Poses tab lists the upcoming poses', (await J.locator('#poseList .pose-item').count()) === 4);
  const firstPose = await J.locator('#poseList .pose-item b').first().textContent();
  await J.locator('#poseList .pose-item').first().click();
  check('Tapping a pose swaps it', (await J.locator('#poseList .pose-item b').first().textContent()) !== firstPose);
  await J.click('#tabBtn-look');
  await J.click('#shootBtn');
  await J.waitForTimeout(1000);
  check('Just me shows the pose card', await J.isVisible('.pose-pop'));
  await J.waitForFunction(() => !document.getElementById('shootBtn').disabled, null, { timeout: 40000 });
  check('Just me takes 4 photos', (await J.evaluate(() => document.querySelectorAll('#thumbs img').length)) === 4);
  const jdl = J.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await J.click('#saveBtn'); const jd = await jdl;
  check('Just me saves the print', !!jd, jd ? jd.suggestedFilename() : '');
  await J.screenshot({ path: OUT + '/just-me.png', fullPage: true });

  // ---- offline: after one visit the booth opens with no internet ----
  const O = await mk('Offline', { width: 1280, height: 900 }, true);
  await O.goto('http://localhost:8080/index.html');
  await O.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 8000))]));
  await O.reload(); await O.waitForTimeout(800);
  await O.goto('http://localhost:8080/solo/'); await O.waitForTimeout(800);
  await O.context().setOffline(true);
  await O.goto('http://localhost:8080/index.html').catch(() => {}); await O.waitForTimeout(800);
  check('Offline: booth still opens', await O.isVisible('#soloBtn'));
  check('Offline: Together is turned off with a note', await O.isDisabled('#startBtn') && (await O.textContent('#togetherNote')).includes("offline"));
  await O.click('#soloBtn'); await O.waitForSelector('#booth:not([hidden])', { timeout: 10000 }).catch(() => {});
  await O.waitForFunction(() => document.getElementById('vidA').videoWidth > 0, null, { timeout: 10000 }).catch(() => {});
  check('Offline: Just me still works', await O.isVisible('#booth') && await O.evaluate(() => document.getElementById('vidA').videoWidth > 0));
  await O.goto('http://localhost:8080/solo/').catch(() => {}); await O.waitForTimeout(600);
  check('Offline: Use my photos still opens', await O.isVisible('#homeView'));
  await O.context().setOffline(false);
  check('No JavaScript errors', errs.length === 0, errs.join(' | ').slice(0, 400));
  console.log(results.join('\n')); await b.close();
  web.close(); signal.close && signal.close();
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
