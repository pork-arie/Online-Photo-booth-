// Like live-check.js, but the booth is opened in WebKit (the engine of Safari on iPad/iPhone) and joined from Chromium.
const { chromium, webkit } = require('playwright');
const SITE = process.argv[2] || 'https://pork-arie.github.io/Online-Photo-booth-/';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const fakeCam = () => { // WebKit has no fake camera: give it a moving canvas and a tone as the "camera" and "mic"
  const md = navigator.mediaDevices || (navigator.mediaDevices = {});
  md.enumerateDevices = async () => [{ kind: 'videoinput', deviceId: 'fake', label: 'Fake', groupId: '' }, { kind: 'audioinput', deviceId: 'fakea', label: 'Fake mic', groupId: '' }];
  md.getUserMedia = async (c) => {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480; const g = cv.getContext('2d'); let t = 0;
    setInterval(() => { t++; g.fillStyle = `hsl(${t * 5 % 360},70%,50%)`; g.fillRect(0, 0, 640, 480); g.fillStyle = '#fff'; g.fillRect(100 + (t * 7) % 400, 200, 80, 80); }, 50);
    const s = cv.captureStream(20);
    if (c && c.audio) { try { const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.connect(d); o.start(); d.stream.getAudioTracks().forEach((tr) => s.addTrack(tr)); } catch (e) {} }
    return s;
  };
};
(async () => {
  const W = await webkit.launch(), C = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const watch = (name, p) => {
    p.on('pageerror', (e) => log(name, 'PAGE ERROR', e.message));
    p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log(name, 'console.' + m.type(), m.text().slice(0, 300)); });
    p.on('websocket', (ws) => { log(name, 'websocket open', ws.url().slice(0, 70)); ws.on('close', () => log(name, 'websocket closed')); });
  };
  const state = (p) => p.evaluate(() => ({ view: document.getElementById('booth').hidden ? 'lobby' : document.getElementById('booth').dataset.view,
    setup: document.getElementById('setupNote').textContent, invite: document.getElementById('inviteNote').textContent,
    status: document.getElementById('status').textContent, pill: document.getElementById('pillText').textContent,
    rtc: typeof RTCPeerConnection, ice: (window.__iceLog || []).slice(-6).join(' ') }));
  const iceSpy = () => { // record every connection's ICE / signalling progress
    window.__iceLog = []; const O = window.RTCPeerConnection; if (!O) return;
    window.RTCPeerConnection = function (...a) { const pc = new O(...a), id = Math.random().toString(36).slice(2, 5);
      pc.addEventListener('iceconnectionstatechange', () => window.__iceLog.push(id + ':ice=' + pc.iceConnectionState));
      pc.addEventListener('signalingstatechange', () => window.__iceLog.push(id + ':sig=' + pc.signalingState));
      pc.addEventListener('icecandidate', (e) => { if (e.candidate) window.__iceLog.push(id + ':cand=' + (e.candidate.candidate.split(' ')[7] || '?')); });
      return pc; };
    window.RTCPeerConnection.prototype = O.prototype; Object.setPrototypeOf(window.RTCPeerConnection, O);
  };
  let ok = false;
  try {
    const hctx = await W.newContext({ viewport: { width: 820, height: 1180 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' });
    await hctx.addInitScript(fakeCam); await hctx.addInitScript(iceSpy);
    const H = await hctx.newPage(); watch('IPAD-HOST', H);
    await H.goto(SITE, { waitUntil: 'networkidle' }); log('IPAD-HOST loaded', JSON.stringify(await state(H)));
    await H.click('#startBtn'); await H.click('#startCamBtn');
    for (let k = 0; k < 30 && (await state(H)).view !== 'shoot'; k++) await H.waitForTimeout(1000);
    log('IPAD-HOST after Open my booth', JSON.stringify(await state(H)));
    const code = (await H.textContent('#codeChip')).trim(); log('code', code);
    const gctx = await C.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['camera', 'microphone'] });
    await gctx.addInitScript(iceSpy);
    const G = await gctx.newPage(); watch('GUEST', G);
    await G.goto(SITE + '?join=' + code, { waitUntil: 'networkidle' }); await G.click('#inviteJoin');
    for (let k = 0; k < 45; k++) {
      await G.waitForTimeout(1000); const s = await state(G);
      if (k % 5 === 0 || s.view === 'shoot') { log('GUEST', k + 's', JSON.stringify(s)); log('IPAD-HOST', JSON.stringify(await state(H))); }
      if (s.view === 'shoot') break;
    }
    await G.waitForTimeout(4000);
    const vids = (p) => p.evaluate(() => ['vidA', 'vidB'].map((id) => document.getElementById(id).videoWidth));
    log('FINAL IPAD-HOST', JSON.stringify(await state(H)), 'videos', JSON.stringify(await vids(H)));
    log('FINAL GUEST', JSON.stringify(await state(G)), 'videos', JSON.stringify(await vids(G)));
    ok = (await state(G)).view === 'shoot' && (await state(H)).pill === 'Connected';
  } catch (e) { log('ERROR', e.message); }
  log(ok ? 'RESULT: CONNECTED' : 'RESULT: FAILED TO CONNECT');
  await W.close(); await C.close(); process.exit(ok ? 0 : 1);
})();
