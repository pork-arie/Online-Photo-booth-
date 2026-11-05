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
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(8080, '127.0.0.1');
// Local PeerJS connection server on :9000 instead of the public cloud one.
const signal = PeerServer({ port: 9000, host: '127.0.0.1', path: '/' });

// Builds a short fake-camera video (.y4m) from the test photo, with the face drifting left and right.
async function makeFaceVideo(browser) {
  const file = path.join(OUT, 'face.y4m');
  if (fs.existsSync(file)) return file;
  const W = 480, H = 360, N = 24;
  const p = await browser.newPage();
  const jpg = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'fixtures', 'astronaut.jpg')).toString('base64');
  const frames = await p.evaluate(async ({ jpg, W, H, N }) => {
    const im = new Image(); im.src = jpg; await im.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const out = [];
    for (let k = 0; k < N; k++) {
      g.fillStyle = '#7a7d82'; g.fillRect(0, 0, W, H);
      const dx = Math.round(45 * Math.sin(2 * Math.PI * k / N)), sw = 220 * 1.4, sh = 240 * 1.4;
      g.drawImage(im, 140, 0, 220, 240, (W - sw) / 2 + dx, 20, sw, sh); // zoom in on the face
      const d = g.getImageData(0, 0, W, H).data, y = new Uint8Array(W * H), u = new Uint8Array(W * H / 4), v = new Uint8Array(W * H / 4);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const o = (j * W + i) * 4; y[j * W + i] = Math.max(0, Math.min(255, 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2])); }
      for (let j = 0; j < H / 2; j++) for (let i = 0; i < W / 2; i++) {
        const o = ((j * 2) * W + i * 2) * 4, r = d[o], gg = d[o + 1], bb = d[o + 2];
        u[j * W / 2 + i] = Math.max(0, Math.min(255, 128 - 0.168736 * r - 0.331264 * gg + 0.5 * bb));
        v[j * W / 2 + i] = Math.max(0, Math.min(255, 128 + 0.5 * r - 0.418688 * gg - 0.081312 * bb));
      }
      const all = new Uint8Array(y.length + u.length + v.length); all.set(y); all.set(u, y.length); all.set(v, y.length + u.length);
      let bin = ''; for (let i = 0; i < all.length; i += 0x8000) bin += String.fromCharCode.apply(null, all.subarray(i, i + 0x8000));
      out.push(btoa(bin));
    }
    return out;
  }, { jpg, W, H, N });
  await p.close();
  const parts = [Buffer.from(`YUV4MPEG2 W${W} H${H} F12:1 Ip A1:1 C420jpeg\n`)];
  frames.forEach((f) => { parts.push(Buffer.from('FRAME\n')); parts.push(Buffer.from(f, 'base64')); });
  fs.writeFileSync(file, Buffer.concat(parts));
  return file;
}

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
  const q = '?peerhost=localhost&peerport=9000&peersecure=0&peerpath=/&nosw=1&test=1&lite=0';
  const A = await mk('A', { width: 1280, height: 900 });
  await A.goto('http://localhost:8080/index.html' + q); await A.waitForTimeout(500);
  await A.screenshot({ path: OUT + '/lobby.png' });
  check('Start page hides the connection label', !(await A.isVisible('#pill')));
  await A.click('#startBtn');
  await A.waitForSelector('#booth:not([hidden])', { timeout: 15000 });
  const code = (await A.textContent('#codeChip')).trim();
  check('Host opens a booth with a code', /^[A-Z0-9]{6}$/.test(code), code);
  await A.waitForFunction(() => document.getElementById('vidA').videoWidth > 0, null, { timeout: 10000 }).catch(() => {});
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
  // duo poses: two figures, labelled so each person knows their half
  check('Together starts with Duo poses', (await A.locator('#poseFor [aria-pressed=true]').textContent()).startsWith('Duo') && (await A.locator('#poseRail .rail-card.duo svg.duo').count()) === 4);
  check('Host sees You on the left, Partner on the right', (await A.locator('#poseRail .rail-card').first().locator('.who2 i').allTextContents()).join('|') === 'You|Partner');
  const bt = await B.evaluate(() => { const a = document.getElementById('tileA').getBoundingClientRect(); return Math.round(a.width); });
  check('Phone Together: each camera gets half the screen', bt >= 160, `${bt}px per camera`);
  await B.evaluate(() => window.scrollTo(0, 0)); await B.waitForTimeout(200); await B.screenshot({ path: OUT + '/phone-together.png' });
  check('Partner sees Partner on the left, You on the right', (await B.locator('#poseRail .rail-card').first().locator('.who2 i').allTextContents()).join('|') === 'Partner|You');
  check('Both see the same duo poses', (await A.locator('#poseRail .rail-card b').allTextContents()).join() === (await B.locator('#poseRail .rail-card b').allTextContents()).join());
  await A.locator('#poseRail').screenshot({ path: OUT + '/duo-rail-host.png' });
  await A.click('#tabBtn-poses'); await A.locator('#poseFor .chip', { hasText: 'Solo' }).click(); await A.waitForTimeout(800);
  check('Switching to Solo poses syncs to the partner', (await B.locator('#poseRail .rail-card.duo').count()) === 0 && (await B.locator('#poseRail .rail-card').count()) === 4);
  await A.locator('#poseFor .chip', { hasText: 'Duo' }).click(); await A.click('#tabBtn-look'); await A.waitForTimeout(800);
  check('Back to Duo on both', (await B.locator('#poseRail .rail-card.duo').count()) === 4);

  // synced 4-shot session started by the partner
  await B.click('#shootBtn');
  await A.waitForTimeout(1000);
  const posA = await A.locator('#poseRail [aria-pressed=true] b').textContent().catch(() => ''), posB = await B.locator('#poseRail [aria-pressed=true] b').textContent().catch(() => '-');
  check('Both see the same pose beside the camera', posA === posB && posA !== '', posA);
  check('No pose pop-up covers the camera', (await A.locator('.pose-pop').count()) === 0);
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
  // connection drops: the partner reconnects on their own
  await B.evaluate(() => window.__fbTest.drop());
  await B.waitForFunction(() => document.getElementById('pillText').textContent === 'Reconnecting', null, { timeout: 5000 }).catch(() => {});
  const sawReconnecting = (await B.textContent('#status')).includes('Reconnecting');
  await B.waitForFunction(() => document.getElementById('pillText').textContent === 'Connected', null, { timeout: 25000 }).catch(() => {});
  await A.waitForFunction(() => document.getElementById('pillText').textContent === 'Connected', null, { timeout: 10000 }).catch(() => {});
  check('Dropped connection reconnects by itself', sawReconnecting && (await B.textContent('#pillText')) === 'Connected' && (await A.textContent('#pillText')) === 'Connected', await B.textContent('#status'));
  await A.waitForFunction(() => { const v = document.getElementById('vidB'); return v.srcObject && v.videoWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
  check('Video comes back after reconnecting', await A.evaluate(() => { const v = document.getElementById('vidB'); return !!v.srcObject && v.videoWidth > 0; }));
  // partner leaves
  await B.click('#leaveBtn'); await A.waitForTimeout(1500);
  check('Host is told partner left', (await A.textContent('#pillText')) === 'Partner left');
  check('Phone layout: no sideways scroll', (await B.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await A.close(); await B.close(); // free the test computer for the next sections
  // ---- Use my photos: built into the main page ----
  const S = await mk('Photos', { width: 1200, height: 900 });
  await S.goto('http://localhost:8080/index.html' + q); await S.waitForTimeout(400);
  await S.click('#photosBtn'); await S.waitForSelector('#booth:not([hidden])', { timeout: 5000 });
  check('Use my photos opens in the booth (no camera)', (await S.textContent('#modeTag')) === 'Your photos' && await S.isVisible('#photoPick') && !(await S.isVisible('#vidA')) && (await S.locator('#photoPick .pick-slot').count()) === 4);
  const red = await S.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#e63946'; g.fillRect(0, 0, 800, 600); return c.toDataURL('image/jpeg').split(',')[1]; });
  const [pc] = await Promise.all([S.waitForEvent('filechooser'), S.click('#shootBtn')]);
  await pc.setFiles([{ name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(red, 'base64') }, { name: 'b.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(red, 'base64') }]);
  await S.waitForFunction(() => document.querySelectorAll('#photoPick .pick-slot.filled').length === 2, null, { timeout: 10000 }).catch(() => {});
  check('Add photos fills the slots', (await S.locator('#photoPick .pick-slot.filled').count()) === 2, await S.textContent('#status'));
  const [pc2] = await Promise.all([S.waitForEvent('filechooser'), S.locator('#photoPick .pick-slot').nth(3).click()]);
  await pc2.setFiles(path.join(__dirname, 'fixtures', 'astronaut.jpg'));
  await S.waitForFunction(() => document.querySelectorAll('#photoPick .pick-slot.filled').length === 3, null, { timeout: 10000 }).catch(() => {});
  check('Tapping a slot puts the photo in that slot', await S.locator('#photoPick .pick-slot').nth(3).evaluate((el) => el.classList.contains('filled')));
  // compare photo 4 before and after the sticker (the photo itself, before any film look)
  const pixelsOf = () => S.evaluate(() => new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); res(Array.from(g.getImageData(0, 0, c.width, c.height).data)); }; im.src = document.querySelectorAll('#photoPick .pick-slot img')[2].src; }));
  const px0 = await pixelsOf();
  await S.locator('#fxBar').getByRole('button', { name: 'Puppy', exact: true }).click();
  await S.waitForFunction(() => /Stickers added|No faces/.test(document.getElementById('status').textContent), null, { timeout: 40000 }).catch(() => {});
  await S.waitForTimeout(300);
  const px1 = await pixelsOf(); let changed = 0; for (let i = 0; i < Math.min(px0.length, px1.length); i += 4) if (Math.abs(px0[i] - px1[i]) + Math.abs(px0[i + 1] - px1[i + 1]) + Math.abs(px0[i + 2] - px1[i + 2]) > 60) changed++;
  check('Face stickers go on faces in your photos', (await S.textContent('#status')).includes('Stickers added to 1 face') && changed > 150, `${await S.textContent('#status')} (${changed} pixels changed)`);
  const sdl = S.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await S.click('#saveBtn'); const sd = await sdl;
  check('Photos: Save print downloads a file', !!sd, sd ? sd.suggestedFilename() : '');
  const sg = S.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await S.click('#gifBtn'); const sgd = await sg;
  check('Photos: Save GIF works too', !!sgd && sgd.suggestedFilename().endsWith('.gif'));
  await S.screenshot({ path: OUT + '/photos-mode.png', fullPage: true });
  await S.goto('http://localhost:8080/solo/?nosw=1'); await S.waitForTimeout(1200);
  check('Old /solo/ link opens Use my photos', (await S.textContent('#modeTag').catch(() => '')) === 'Your photos' && await S.isVisible('#photoPick'));
  await S.close();
  const L = await mk('Lobby', { width: 390, height: 844 });
  await L.goto('http://localhost:8080/index.html?nosw=1'); await L.waitForTimeout(300);
  check('Start page offers Just me, Together and Use my photos', await L.isVisible('#soloBtn') && await L.isVisible('#startBtn') && await L.isVisible('#photosBtn'));
  check('Start page fits a phone screen', (await L.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await L.screenshot({ path: OUT + '/lobby-phone.png', fullPage: true });
  await L.close();

  // ---- Just me (live camera, no partner) ----
  const J = await mk('JustMe', { width: 1280, height: 900 });
  await J.goto('http://localhost:8080/index.html' + q); await J.waitForTimeout(400);
  await J.click('#soloBtn'); await J.waitForSelector('#booth:not([hidden])', { timeout: 10000 });
  await J.waitForFunction(() => document.getElementById('vidA').videoWidth > 0, null, { timeout: 10000 }).catch(() => {});
  check('Just me opens the camera without a partner', (await J.textContent('#modeTag')) === 'Just me' && await J.evaluate(() => document.getElementById('stage').classList.contains('solo') && document.getElementById('vidA').videoWidth > 0));
  check('Just me hides code, share and mic', !(await J.isVisible('#codeWrap')) && !(await J.isVisible('#micBtn')) && !(await J.isVisible('#pill')));
  check('Just me: Start is ready right away', !(await J.isDisabled('#shootBtn')));
  check('Just me starts with Solo poses', (await J.locator('#poseFor [aria-pressed=true]').textContent()).startsWith('Solo') && (await J.locator('#poseRail .rail-card.duo').count()) === 0);
  await J.click('#tabBtn-poses');
  await J.locator('#poseFor .chip', { hasText: 'Duo' }).click();
  check('Just me can switch to Duo poses (two people in one camera)', (await J.locator('#poseRail .rail-card.duo').count()) === 4 && (await J.locator('#poseRail .who2 i').first().textContent()) === 'Left');
  await J.locator('#strip').screenshot({ path: OUT + '/duo-print-solo-camera.png' });
  await J.locator('#poseFor .chip', { hasText: 'Solo' }).click();
  check('Poses tab lists the upcoming poses', (await J.locator('#poseList .pose-item').count()) === 4);
  const firstPose = await J.locator('#poseList .pose-item b').first().textContent();
  await J.locator('#poseList .pose-swap').first().click();
  check('↻ swaps a pose', (await J.locator('#poseList .pose-item b').first().textContent()) !== firstPose);
  check('Poses show beside the camera', await J.isVisible('#poseRail') && (await J.locator('#poseRail .rail-card').count()) === 4);
  await J.locator('#poseList .pose-sel').nth(2).click();
  check('Picking a pose in the list shows it beside the camera', (await J.locator('#poseRail .rail-card').nth(2).getAttribute('aria-pressed')) === 'true');
  await J.locator('#poseRail .rail-card').nth(3).click();
  check('Tapping a pose beside the camera picks it', (await J.locator('#poseRail .rail-card').nth(3).getAttribute('aria-pressed')) === 'true' && (await J.locator('#poseList .pose-item.sel b').textContent()) === (await J.locator('#poseRail .rail-card').nth(3).locator('b').textContent()));
  await J.screenshot({ path: OUT + '/pose-rail.png' });
  await J.click('#tabBtn-look');
  await J.click('#shootBtn');
  await J.waitForTimeout(1000);
  check('Countdown keeps the pose beside the camera (no pop-up)', (await J.locator('.pose-pop').count()) === 0 && await J.isVisible('#poseRail'));
  check('Shot 1 pose is highlighted beside the camera', (await J.locator('#poseRail .rail-card').nth(0).getAttribute('aria-pressed')) === 'true');
  await J.waitForTimeout(3000);
  check('The pose is still beside the camera during 3-2-1', await J.isVisible('#poseRail .rail-card[aria-pressed=true]') && (await J.locator('.count').count()) === 1 && (await J.locator('.pose-pop').count()) === 0);
  await J.waitForTimeout(2600);
  check('Shot 2 pose is highlighted beside the camera', (await J.locator('#poseRail .rail-card').nth(1).getAttribute('aria-pressed')) === 'true');
  await J.waitForFunction(() => !document.getElementById('shootBtn').disabled, null, { timeout: 40000 });
  check('Just me takes 4 photos', (await J.evaluate(() => document.querySelectorAll('#thumbs img').length)) === 4);
  const jdl = J.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await J.click('#saveBtn'); const jd = await jdl;
  check('Just me saves the print', !!jd, jd ? jd.suggestedFilename() : '');
  check('Countdown beeps and shutter sounds play', (await J.evaluate(() => window.__fbTest.sounds())) >= 16, String(await J.evaluate(() => window.__fbTest.sounds())));
  check('The print develops like instant film', await J.evaluate(() => document.getElementById('strip').classList.contains('develop')));
  // GIF: a real animated GIF file
  const gdl = J.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await J.click('#gifBtn'); const gd = await gdl;
  let gifOk = false, gifInfo = '';
  if (gd) { const b = fs.readFileSync(await gd.path()); const frames = b.toString('latin1').split('\x21\xF9\x04').length - 1; gifOk = b.slice(0, 6).toString() === 'GIF89a' && frames >= 4; gifInfo = `${gd.suggestedFilename()}, ${frames} frames, ${Math.round(b.length / 1024)} KB`; }
  check('Save GIF makes an animated boomerang GIF', gifOk, gifInfo);
  // Video: an animated reel recorded in the browser
  const vdl = J.waitForEvent('download', { timeout: 40000 }).catch(() => null);
  await J.click('#reelBtn');
  await J.waitForFunction(() => document.getElementById('status').textContent.includes('Making your video'), null, { timeout: 5000 }).catch(() => {});
  const progressShown = (await J.textContent('#status')).includes('%');
  const vd = await vdl; let vidInfo = '', vidOk = false;
  if (vd) { const b = fs.readFileSync(await vd.path()); vidOk = b.length > 30000 && /\.(webm|mp4)$/.test(vd.suggestedFilename()); vidInfo = `${vd.suggestedFilename()}, ${Math.round(b.length / 1024)} KB`; fs.copyFileSync(await vd.path(), OUT + '/reel' + path.extname(vd.suggestedFilename())); }
  check('Save video makes an animated video reel', vidOk && progressShown, vidInfo);
  await J.click('#soundBtn');
  check('Sound button turns sounds off', await J.evaluate(() => document.getElementById('soundBtn').classList.contains('off')));
  await J.click('#soundBtn');
  await J.screenshot({ path: OUT + '/just-me.png', fullPage: true });
  await J.close();

  // ---- phone: picked pose floats on the camera; white even when the phone is in dark mode ----
  const PH = await mk('Phone', { width: 390, height: 844 });
  await PH.emulateMedia({ colorScheme: 'dark' });
  await PH.goto('http://localhost:8080/index.html' + q); await PH.waitForTimeout(300);
  const bgOf = () => PH.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('White by default, even in phone dark mode', (await bgOf()) === 'rgb(243, 244, 242)', await bgOf());
  await PH.click('#themeBtn');
  check('Moon button switches to dark', (await bgOf()) === 'rgb(15, 17, 16)');
  await PH.reload(); await PH.waitForTimeout(300);
  check('Dark choice is remembered', (await bgOf()) === 'rgb(15, 17, 16)');
  await PH.click('#themeBtn'); await PH.reload(); await PH.waitForTimeout(300);
  check('Sun button switches back to white', (await bgOf()) === 'rgb(243, 244, 242)');
  await PH.click('#soloBtn'); await PH.waitForSelector('#booth:not([hidden])', { timeout: 10000 });
  const lay = await PH.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(), r = document.getElementById('poseRail').getBoundingClientRect(), c = document.querySelector('.camera').getBoundingClientRect(); return { full: s.width >= c.width - 1, under: r.top >= s.bottom - 1 && r.top - s.bottom < 30, sw: Math.round(s.width) }; });
  check('Phone: camera uses the full width', lay.full, `${lay.sw}px`);
  check('Phone: poses sit right under the camera', await PH.isVisible('#poseRail') && lay.under);
  await PH.locator('#poseRail .rail-card').nth(3).click(); await PH.waitForTimeout(300);
  check('Phone: tapping a pose picks it and scrolls it into view', (await PH.locator('#poseRail .rail-card').nth(3).getAttribute('aria-pressed')) === 'true' && await PH.evaluate(() => { const r = document.getElementById('poseRail'), c = r.children[3].getBoundingClientRect(), b = r.getBoundingClientRect(); return c.left >= b.left - 1 && c.right <= b.right + 1; }));
  check('Phone: no sideways scroll in the booth', (await PH.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await PH.screenshot({ path: OUT + '/phone-booth-light.png' });
  await PH.close();

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
  await O.waitForTimeout(800);
  check('Offline: Use my photos still opens', await O.isVisible('#photoPick'));
  await O.context().setOffline(false); await O.close();
  // ---- face stickers, with a real face as the fake camera ----
  const y4m = await makeFaceVideo(b);
  const fb = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + y4m, '--autoplay-policy=no-user-gesture-required'] });
  const mkF = async (name) => {
    const ctx = await fb.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['camera', 'microphone'] });
    await ctx.route('https://unpkg.com/**', (r) => r.fulfill({ body: peerjs, contentType: 'application/javascript' }));
    await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(name + ': ' + e.message)); return p;
  };
  // brown puppy-ear pixels in a video element, and where they are
  const ears = (p, id) => p.evaluate((id) => {
    const v = document.getElementById(id); const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    if (!c.width) return { n: 0, x: 0 };
    const g = c.getContext('2d'); g.drawImage(v, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0, sx = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 122) < 22 && Math.abs(d[i + 1] - 74) < 22 && Math.abs(d[i + 2] - 36) < 22) { n++; sx += (i / 4) % c.width; }
    return { n, x: n ? sx / n : 0 };
  }, id);
  const F = await mkF('Faces');
  await F.goto('http://localhost:8080/index.html' + q); await F.click('#soloBtn');
  await F.waitForFunction(() => document.getElementById('vidA').videoWidth > 0, null, { timeout: 15000 });
  check('Face stickers row shows 19 choices', (await F.locator('#fxBar .fx').count()) === 19);
  check('Sticker buttons show the artwork', (await F.locator('#fxBar .fx img.e').count()) === 15);
  const before = await ears(F, 'vidA');
  await F.locator('#fxBar .fx', { hasText: 'Puppy' }).click();
  await F.waitForFunction(() => +(document.getElementById('stage').dataset.faces || 0) > 0, null, { timeout: 30000 }).catch(() => {});
  check('Finds the face in the camera', +(await F.evaluate(() => document.getElementById('stage').dataset.faces || 0)) > 0, await F.textContent('#status'));
  await F.waitForTimeout(800);
  const e1 = await ears(F, 'vidA');
  check('Puppy ears appear on the live camera', e1.n > before.n + 1000, `${before.n} -> ${e1.n} brown pixels`);
  let moved = 0; for (let k = 0; k < 6; k++) { await F.waitForTimeout(450); const e2 = await ears(F, 'vidA'); moved = Math.max(moved, Math.abs(e2.x - e1.x)); }
  check('Stickers follow the face as it moves', moved > 8, `moved ${Math.round(moved)}px`);
  let flicker = 0, extra = 0; for (let k = 0; k < 10; k++) { await F.waitForTimeout(300); const n = (await ears(F, 'vidA')).n; if (n < before.n + 1000) flicker++; if (+(await F.evaluate(() => document.getElementById('stage').dataset.faces)) > 1) extra++; }
  check('Stickers stay on steadily (no flicker, no phantom faces)', flicker <= 1 && extra === 0, `${flicker}/10 missing, ${extra}/10 extra faces`);
  // gold pixels from the Fluent crown above the face
  const gold = () => F.evaluate(() => { const v = document.getElementById('vidA'), c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; const g = c.getContext('2d'); g.drawImage(v, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 220 && d[i + 1] > 140 && d[i + 1] < 200 && d[i + 2] < 90) n++; return n; });
  await F.locator('#fxBar .fx', { hasText: 'Off' }).click(); await F.waitForTimeout(400); const gold0 = await gold();
  await F.locator('#fxBar .fx', { hasText: 'Crown' }).click(); await F.waitForTimeout(1200); const gold1 = await gold();
  check('Fluent 3D crown sits on the head', gold1 > gold0 + 400, `${gold0} -> ${gold1} gold pixels`);
  await F.screenshot({ path: OUT + '/stickers-crown.png' });
  const names = ['Shades', 'Glasses', 'Top hat', 'Cap', 'Grad cap', 'Sun hat', 'Bow', 'Flowers', 'In love', 'Party', 'Dizzy', 'Sparkle', 'On fire', 'Butterflies', 'Kitty', 'Santa hat'];
  for (const name of names) { await F.locator('#fxBar').getByRole('button', { name, exact: true }).click(); await F.waitForTimeout(700); await F.locator('#stage').screenshot({ path: OUT + '/sticker-' + name.toLowerCase().replace(/[^a-z]+/g, '-') + '.png' }); }
  const loaded = await F.evaluate(() => performance.getEntriesByType('resource').filter((r) => r.name.includes('/assets/stickers/')).length);
  check('Sticker artwork loads (Fluent + Noto)', loaded >= 20, `${loaded} files`);
  check('Every sticker draws without errors', !errs.some((x) => x.startsWith('Faces')));
  // lighter mode for slow phones still finds the face and draws stickers
  const LT = await mkF('Lite'); await LT.goto('http://localhost:8080/index.html' + q.replace('lite=0', 'lite=1')); await LT.click('#soloBtn');
  await LT.waitForFunction(() => document.getElementById('vidA').videoWidth > 0, null, { timeout: 15000 });
  await LT.locator('#fxBar .fx', { hasText: 'Puppy' }).click();
  await LT.waitForFunction(() => +(document.getElementById('stage').dataset.faces || 0) > 0, null, { timeout: 30000 }).catch(() => {});
  await LT.waitForTimeout(800);
  check('Lighter mode still tracks the face', (await LT.evaluate(() => document.getElementById('stage').dataset.lite)) === '1' && (await ears(LT, 'vidA')).n > before.n + 1000);
  await LT.close();
  await F.locator('#fxBar .fx', { hasText: 'Santa hat' }).click(); await F.waitForTimeout(600);
  await F.screenshot({ path: OUT + '/stickers-santa.png' });
  await F.locator('#fxBar .fx', { hasText: 'Puppy' }).click(); await F.waitForTimeout(600);
  await F.screenshot({ path: OUT + '/stickers-puppy.png' });
  await F.locator('#layouts .chip', { hasText: 'Instant' }).click();
  await F.click('#shootBtn'); await F.waitForFunction(() => !document.getElementById('shootBtn').disabled, null, { timeout: 20000 });
  const printEars = await F.evaluate(() => { const c = document.getElementById('strip'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 122) < 30 && Math.abs(d[i + 1] - 74) < 30 && Math.abs(d[i + 2] - 36) < 30) n++; return n; });
  check('The photo on the print has the stickers', printEars > 300, `${printEars} brown pixels`);
  await F.locator('#strip').screenshot({ path: OUT + '/stickers-print.png' });
  // partner sees your stickers in Together
  const H = await mkF('FaceHost'); await H.goto('http://localhost:8080/index.html' + q);
  await H.click('#startBtn'); await H.waitForSelector('#booth:not([hidden])', { timeout: 15000 });
  await H.locator('#fxBar .fx', { hasText: 'Puppy' }).click();
  const fcode = (await H.textContent('#codeChip')).trim();
  const G = await mkF('FaceGuest'); await G.goto('http://localhost:8080/index.html' + q + '&join=' + fcode); await G.click('#joinBtn');
  await G.waitForSelector('#booth:not([hidden])', { timeout: 20000 });
  await G.waitForFunction(() => document.getElementById('vidA').videoWidth > 0, null, { timeout: 20000 }).catch(() => {});
  await H.waitForFunction(() => +(document.getElementById('stage').dataset.faces || 0) > 0, null, { timeout: 30000 }).catch(() => {});
  await G.waitForTimeout(2500);
  const own = await ears(G, 'vidB'); let seen = { n: 0 };
  for (let k = 0; k < 5; k++) { const x = await ears(G, 'vidA'); if (x.n > seen.n) seen = x; await G.waitForTimeout(500); } // video over the connection is compressed, so take the clearest frame
  check("Partner sees your stickers live", seen.n > own.n + 700, `${seen.n} brown pixels in your video on their screen vs ${own.n} in theirs (no sticker)`);
  await fb.close();

  check('No JavaScript errors', errs.length === 0, errs.join(' | ').slice(0, 400));
  console.log(results.join('\n')); await b.close();
  web.close(); signal.close && signal.close();
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
