// Tries free public relay (TURN) servers: two connections that may ONLY use the relay, so success means the relay works.
const { chromium } = require('playwright');
const CANDIDATES = [
  { name: 'peerjs eu-0', urls: 'turn:eu-0.turn.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' },
  { name: 'peerjs us-0', urls: 'turn:us-0.turn.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' },
  { name: 'peerjs eu-0 tcp', urls: 'turn:eu-0.turn.peerjs.com:3478?transport=tcp', username: 'peerjs', credential: 'peerjsp' },
  { name: 'openrelay 80', urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { name: 'openrelay 443', urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { name: 'openrelay 443 tcp', urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  { name: 'freestun 3478', urls: 'turn:freestun.net:3478', username: 'free', credential: 'free' },
  { name: 'freestun 3478 tcp', urls: 'turn:freestun.net:3478?transport=tcp', username: 'free', credential: 'free' },
  { name: 'freestun turns 5350', urls: 'turns:freestun.net:5350', username: 'free', credential: 'free' },
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const c of CANDIDATES) {
    const r = await p.evaluate(async (srv) => {
      const cfg = { iceServers: [{ urls: srv.urls, username: srv.username, credential: srv.credential }], iceTransportPolicy: 'relay' };
      const a = new RTCPeerConnection(cfg), z = new RTCPeerConnection(cfg); let relays = 0;
      a.onicecandidate = (e) => { if (e.candidate) { if (/ relay /.test(e.candidate.candidate)) relays++; z.addIceCandidate(e.candidate).catch(() => {}); } };
      z.onicecandidate = (e) => { if (e.candidate) a.addIceCandidate(e.candidate).catch(() => {}); };
      const ch = a.createDataChannel('t'); const t0 = performance.now();
      const got = new Promise((res) => { z.ondatachannel = (e) => { e.channel.onmessage = (m) => res(m.data); }; ch.onopen = () => ch.send('hello'); setTimeout(() => res(null), 12000); });
      await a.setLocalDescription(await a.createOffer()); await z.setRemoteDescription(a.localDescription);
      await z.setLocalDescription(await z.createAnswer()); await a.setRemoteDescription(z.localDescription);
      const msg = await got; const ms = Math.round(performance.now() - t0); a.close(); z.close();
      return { ok: msg === 'hello', relays, ms };
    }, c);
    console.log(`${r.ok ? 'WORKS ' : 'FAILED'}  ${c.name.padEnd(22)} relay candidates: ${r.relays}  ${r.ok ? r.ms + ' ms' : ''}`);
  }
  await b.close();
})();
