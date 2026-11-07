// Flashbulb booth: camera, connection, shooting, print, exports.
(() => {
  const { DESIGNS, DESIGN_FONTS } = window.FB;
  const { LAYOUTS, FILTERS, FRAMES, applyFilter, rng, star, heart, THEMES, seasonNow, paintBackground, CLASSIC, MEME, MEME_DUO, CLASSIC_DUO, FL, FX, ANIM, imgCache, img, NEEDS, sheet, preloadSticker, EMOJI_FONT, emoji, heartPath, BOX, wear, anim, STICKERS, NI } = window.FB;
  const state = {
    photos: [null, null, null, null], photosB: [null, null, null, null], samples: [], usingSamples: false, hideSampleTag: true, noPoses: false,
    layout: "strip", filter: "film", frame: 0, caption: "Miles apart", showDate: true, mirror: true, capHl: true, theme: "none", duo: true, design: "modern",
  };
  let poseMode = "meme", posePrint = true, poseFor = "solo"; // poseFor: one person ("solo") or two side by side ("duo")
  const picks = { classic: [0, 1, 2, 3], meme: [0, 1, 2, 3], classicDuo: [0, 1, 2, 3], memeDuo: [0, 1, 2, 3] };
  const $ = (id) => document.getElementById(id);
  const canvas = $("strip"), ctx = canvas.getContext("2d");
  if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  /* ---------- Geometry ---------- */
  function withPoses() { return !state.noPoses && poseMode !== "off" && posePrint; }
  function spec(layout) {
    if (withPoses()) {
      if (layout === "strip") {
        const m = 36, gap = 18, pw = 528, ph = 396, col = poseFor === "duo" ? 340 : 250, foot = 190, W = m + pw + gap + col + m;
        return { W, H: m + 4 * ph + 3 * gap + foot, footY: m + 4 * ph + 3 * gap, foot, nameSize: 27,
          slots: [0, 1, 2, 3].map((i) => ({ x: m, y: m + i * (ph + gap), w: pw, h: ph, pose: { x: m + pw + gap, y: m + i * (ph + gap), w: col, h: ph } })) };
      }
      if (layout === "grid") {
        const m = 40, gx = 24, gy = 18, pw = 400, ph = 300, inner = 14, col = poseFor === "duo" ? 260 : 190, cell = pw + inner + col, foot = 180, W = m * 2 + cell * 2 + gx;
        return { W, H: m + 2 * ph + gy + foot, footY: m + 2 * ph + gy, foot, nameSize: 22,
          slots: [0, 1, 2, 3].map((i) => { const x = m + (i % 2) * (cell + gx), y = m + Math.floor(i / 2) * (ph + gy); return { x, y, w: pw, h: ph, pose: { x: x + pw + inner, y, w: col, h: ph } }; }) };
      }
      const m = 44, pw = 712, gap = 22, col = poseFor === "duo" ? 380 : 280, foot = 220, W = m + pw + gap + col + m;
      return { W, H: m + pw + foot, footY: m + pw, foot, nameSize: 32, slots: [{ x: m, y: m, w: pw, h: pw, pose: { x: m + pw + gap, y: m, w: col, h: pw } }] };
    }
    if (layout === "strip") {
      const W = 600, m = 36, gap = 18, pw = W - m * 2, ph = Math.round(pw * 3 / 4), foot = 190;
      return { W, H: m + 4 * ph + 3 * gap + foot, slots: [0, 1, 2, 3].map((i) => ({ x: m, y: m + i * (ph + gap), w: pw, h: ph })), footY: m + 4 * ph + 3 * gap, foot };
    }
    if (layout === "grid") {
      const W = 1000, m = 40, gap = 18, pw = (W - m * 2 - gap) / 2, ph = Math.round(pw * 3 / 4), foot = 180;
      return { W, H: m + 2 * ph + gap + foot, slots: [0, 1, 2, 3].map((i) => ({ x: m + (i % 2) * (pw + gap), y: m + Math.floor(i / 2) * (ph + gap), w: pw, h: ph })), footY: m + 2 * ph + gap, foot };
    }
    const W = 800, m = 44, pw = W - m * 2, ph = pw, foot = 220;
    return { W, H: m + ph + foot, slots: [{ x: m, y: m, w: pw, h: ph }], footY: m + ph, foot };
  }


  let mySide = "A";
  const sideArr = (side) => (side === "B" ? state.photosB : state.photos);
  const otherSide = () => (mySide === "A" ? "B" : "A");
  function sourceFor(i, side = "A") {
    const arr = sideArr(side);
    if (arr[i]) return { src: arr[i].canvas, sample: false };
    if (state.usingSamples) return { src: state.samples[side === "B" ? (i + 1) % 4 : i], sample: true };
    return null;
  }
  function halves(rect) {
    const g = Math.round(rect.w * .014) + 4, hw = (rect.w - g) / 2;
    return [["A", { x: rect.x, y: rect.y, w: hw, h: rect.h }], ["B", { x: rect.x + hw + g, y: rect.y, w: hw, h: rect.h }]];
  }
  function cover(g, src, w, h) {
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const s = Math.max(w / sw, h / sh), dw = sw * s, dh = sh * s;
    g.save(); if (state.mirror) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh); g.restore();
  }
  function shotImage(src, w, h) {
    const off = document.createElement("canvas"); off.width = Math.round(w); off.height = Math.round(h);
    const g = off.getContext("2d");
    cover(g, src, off.width, off.height);
    applyFilter(g, off.width, off.height, state.filter);
    const v = g.createRadialGradient(off.width / 2, off.height / 2, off.height * .4, off.width / 2, off.height / 2, off.height * .9);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.16)");
    g.fillStyle = v; g.fillRect(0, 0, off.width, off.height);
    return off;
  }
  function drawShot(src, rect) { ctx.drawImage(shotImage(src, rect.w, rect.h), rect.x, rect.y); }
  function drawEmpty(rect, i, frame, side) {
    ctx.save();
    if (frame.theme) { ctx.fillStyle = frame.bg; ctx.globalAlpha = .92; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
    ctx.fillStyle = frame.ink; ctx.globalAlpha = .06; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = .55; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const label = !state.duo ? `SHOT ${i + 1}` : side === mySide ? `YOUR SHOT ${i + 1}` : `PARTNER ${i + 1}`;
    let size = Math.round(rect.h * .07);
    ctx.font = `500 ${size}px "Urbanist", sans-serif`;
    while (ctx.measureText(label).width > rect.w - 16 && size > 9) { size--; ctx.font = `500 ${size}px "Urbanist", sans-serif`; }
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
  }
  function dateStamp() {
    const d = new Date(), mon = d.toLocaleString("en", { month: "short" }).toUpperCase();
    return `${String(d.getDate()).padStart(2, "0")} ${mon} ${d.getFullYear()}  ·  ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  const design = () => DESIGNS[state.design] || DESIGNS.classic;
  function currentFrame() {
    const d = design();
    if (d.palette) return Object.assign({ name: d.label, design: state.design }, d.palette);
    const t = state.design === "classic" && THEMES[state.theme];
    if (t && t.bg) return { name: t.label, bg: t.bg[0], ink: t.ink, hl: t.hl, theme: state.theme };
    return FRAMES[state.frame];
  }

  const artCache = new Map();
  function poseArt(idx, frame, duo) {
    const f = duo ? MEME_DUO[idx] : MEME[idx], key = f.img;
    let e = artCache.get(key);
    if (!e) {
      const im = new Image(); e = { im, ready: false }; artCache.set(key, e);
      im.onload = () => { e.ready = true; render(); };
      im.src = f.img;
    }
    return e.ready ? e.im : null;
  }
  function drawPose(r, i, frame, nameSize) {
    const key = packKey(), idx = picks[key][i]; if (idx == null) return;
    const duo = poseFor === "duo", item = packList(key)[idx];
    ctx.save();
    if (frame.theme) { ctx.fillStyle = frame.bg; ctx.globalAlpha = .9; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(r.x, r.y, r.w, r.h, 16) : ctx.rect(r.x, r.y, r.w, r.h); ctx.fill(); }
    ctx.fillStyle = frame.ink; ctx.globalAlpha = .05;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(r.x, r.y, r.w, r.h, 16) : ctx.rect(r.x, r.y, r.w, r.h); ctx.fill();
    ctx.globalAlpha = 1;
    const pad = 14, aw = r.w - pad * 2, ah = r.h - pad * 2; // just the pose: no shot number or name on the print
    const cx = r.x + r.w / 2, cy = r.y + pad + ah / 2;
    if (poseMode === "meme") {
      const im = poseArt(idx, frame, duo);
      if (im) { // the meme fills the whole side panel, same height as the photo (cropped to fit, kept toward the top for faces)
        const iw = im.naturalWidth || 100, ih = im.naturalHeight || 100, s = Math.max(r.w / iw, r.h / ih), w = iw * s, h = ih * s;
        const x = r.x + (r.w - w) / 2, y = r.y + (r.h - h) * .3;
        ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(r.x, r.y, r.w, r.h, 16) : ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); ctx.drawImage(im, x, y, w, h); ctx.restore();
      }
    } else {
      const text = duo ? item[0] + item[1] : item[0], size = duo ? Math.min(ah * .55, aw * .38) : Math.min(ah, aw) * .62;
      ctx.font = `${Math.round(size)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, cx, cy);
    }
    ctx.restore();
  }

  let printFile = null, printT = 0; // the saved PNG, made ahead of time (see save / share)
  function render() {
    queuePrintFile();
    const sp = spec(state.layout), frame = currentFrame();
    canvas.width = sp.W; canvas.height = sp.H; canvas.className = state.layout + (withPoses() ? " wp" : "") + (canvas.classList.contains("develop") ? " develop" : "");
    const d = design();
    if (d.background) d.background(ctx, sp, frame); else paintBackground(ctx, sp.W, sp.H, frame, sp.W / 600);
    let anySample = false;
    const place = (src, r, i) => { const draw = () => drawShot(src, r); if (d.shot) d.shot(ctx, r, i, draw, frame); else draw(); };
    sp.slots.forEach((rect, i) => {
      if (state.duo) {
        halves(rect).forEach(([sd, hr]) => { const s = sourceFor(i, sd); if (s) { place(s.src, hr, i); anySample = anySample || s.sample; } else drawEmpty(hr, i, frame, sd); });
      } else {
        const s = sourceFor(i);
        if (s) { place(s.src, rect, i); anySample = anySample || s.sample; } else drawEmpty(rect, i, frame);
      }
      if (d.over) d.over(ctx, rect, i, frame);
      if (rect.pose) drawPose(rect.pose, i, frame, sp.nameSize);
    });
    if (anySample && !state.hideSampleTag) {
      const r = sp.slots[0];
      ctx.save(); ctx.font = `500 16px "Urbanist", sans-serif`;
      const tw = ctx.measureText("SAMPLE").width + 22;
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(r.x + 14, r.y + 14, tw, 28, 14) : ctx.rect(r.x + 14, r.y + 14, tw, 28); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText("SAMPLE", r.x + 25, r.y + 29); ctx.restore();
    }
    const wpOn = withPoses(), cx = sp.W / 2, big = state.layout === "strip" ? (wpOn ? 48 : 42) : state.layout === "grid" ? (wpOn ? 66 : 56) : (wpOn ? 62 : 54);
    if (d.footer) { ctx.save(); d.footer(ctx, sp, frame, state.caption.trim(), state.showDate ? dateStamp() : "", big); ctx.restore(); return; }
    ctx.fillStyle = frame.ink; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    const cap = state.caption.trim(); let size = big;
    const setF = () => { ctx.font = `700 ${size}px "Comfortaa", "Century Gothic", sans-serif`; };
    setF(); while (cap && ctx.measureText(cap).width > sp.W - 80 && size > 22) { size -= 2; setF(); }
    const capY = sp.footY + sp.foot * (state.showDate ? .52 : .62);
    if (cap && state.capHl) {
      const tw = ctx.measureText(cap).width;
      ctx.save(); ctx.translate(cx, capY); ctx.rotate(-0.012);
      ctx.fillStyle = frame.hl; ctx.globalAlpha = .9; ctx.beginPath();
      const hx = -tw / 2 - size * .35, hy = -size * .5, hw = tw + size * .7, hh = size * .62;
      ctx.roundRect ? ctx.roundRect(hx, hy, hw, hh, size * .14) : ctx.rect(hx, hy, hw, hh); ctx.fill();
      ctx.restore(); ctx.fillStyle = frame.ink;
    }
    if (cap) ctx.fillText(cap, cx, capY);
    if (state.showDate) {
      ctx.font = `500 ${state.layout === "strip" ? 15 : 18}px "Urbanist", sans-serif`; ctx.globalAlpha = .6;
      ctx.fillText(dateStamp().split("").join(String.fromCharCode(8202)), cx, cap ? capY + 42 : sp.footY + sp.foot * .5);
      ctx.globalAlpha = 1;
    }
  }

  const packKey = () => poseMode + (poseFor === "duo" ? "Duo" : "");
  const packList = (key = packKey()) => ({ classic: CLASSIC, meme: MEME, classicDuo: CLASSIC_DUO, memeDuo: MEME_DUO })[key] || MEME;

  /* ---------- small helpers ---------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const params = new URLSearchParams(location.search);
  function setStatus(msg, err) { ["status", "resultStatus"].forEach((id) => { const s = $(id); if (s) { s.textContent = msg || ""; s.classList.toggle("err", !!err); } }); }
  function setPill(mode, text) { const p = $("pill"); p.hidden = false; p.className = "pill" + (mode ? " " + mode : ""); $("pillText").textContent = text; }
  function shuffle(n, len) { const a = Array.from({ length: len }, (_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
  picks.classic = shuffle(4, CLASSIC.length); picks.meme = shuffle(4, MEME.length); picks.classicDuo = shuffle(4, CLASSIC_DUO.length); picks.memeDuo = shuffle(4, MEME_DUO.length);

  /* ---------- settings UI ---------- */
  function chip(label, pressed, onClick, swatch) {
    const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.setAttribute("aria-pressed", String(pressed));
    if (swatch) { const s = document.createElement("span"); s.className = "sw"; s.style.background = swatch; b.appendChild(s); }
    b.appendChild(document.createTextNode(label)); b.addEventListener("click", onClick); return b;
  }
  function buildUI() {
    const lay = $("layouts"); lay.innerHTML = "";
    Object.entries(LAYOUTS).forEach(([k, v]) => lay.appendChild(chip(`${v.label} · ${v.n === 1 ? "1 shot" : "4 shots"}`, state.layout === k, () => { state.layout = k; changed(); })));
    const fl = $("films"); fl.innerHTML = "";
    Object.entries(FILTERS).forEach(([k, v]) => fl.appendChild(chip(v, state.filter === k, () => { state.filter = k; changed(); })));
    const lk = $("looks"); lk.innerHTML = "";
    FRAMES.forEach((f, i) => lk.appendChild(chip(f.name, state.theme === "none" && state.frame === i, () => { state.frame = i; state.theme = "none"; changed(); }, f.bg)));
    buildDesigns();
    const pm = $("poseModes"); pm.innerHTML = "";
    [["off", "Off"], ["classic", "Classic"], ["meme", "Meme"]].forEach(([k, l]) => pm.appendChild(chip(l, poseMode === k, () => { poseMode = k; changed(); })));
    const pf = $("poseFor"); pf.innerHTML = "";
    [["solo", "Solo · 1 person"], ["duo", "Duo · 2 people"]].forEach(([k, l]) => pf.appendChild(chip(l, poseFor === k, () => { poseFor = k; selPose = 0; changed(); })));
    $("poseForGroup").hidden = poseMode === "off";
    $("poseListGroup").hidden = poseMode === "off";
    $("browseMemes").hidden = poseMode !== "meme"; $("memeBtn").hidden = poseMode !== "meme"; $("memeBtn").disabled = busy;
    if (!mb.hidden) renderBrowser();
    renderPoseList(); renderRail();
    $("posePrint").checked = posePrint; $("capHl").checked = state.capHl; $("showDate").checked = state.showDate;
    if (document.activeElement !== $("caption")) $("caption").value = state.caption;
    $("capCount").textContent = `${state.caption.length}/28`;
    const n = LAYOUTS[state.layout].n;
    $("shootLabel").textContent = photosMode ? "Add photos" : busy ? "Shooting…" : n === 1 ? "Take the shot" : `Start ${n} shots`;
    if (photosMode) renderPick();
  }
  /* ---------- Meme browser: see every meme and tap one to use it for a shot ---------- */
  const mb = document.createElement("div"); mb.className = "meme-browser"; mb.id = "memeBrowser"; mb.hidden = true;
  mb.setAttribute("role", "dialog"); mb.setAttribute("aria-modal", "true"); mb.setAttribute("aria-label", "Browse memes");
  mb.innerHTML = `<div class="mb-panel"><div class="mb-head"><div><p class="kicker">Meme poses</p><h2 class="mb-title">Pick a meme</h2></div>
    <button class="btn" type="button" id="mbDone">Done</button></div>
    <div class="mb-shots" id="mbShots" role="tablist" aria-label="Which shot"></div>
    <div class="chips mb-filter" id="mbFilter"></div>
    <div class="mb-grid" id="mbGrid"></div></div>`;
  document.body.appendChild(mb);
  let browseShot = 0, browseFilter = "all";
  function openBrowser(i) {
    if (poseMode !== "meme") { poseMode = "meme"; changed(); }
    browseShot = Math.min(i ?? selPose, LAYOUTS[state.layout].n - 1);
    mb.hidden = false; document.body.classList.add("mb-open"); renderBrowser();
    const sel = mb.querySelector('.mtile[aria-pressed="true"]'); if (sel) sel.scrollIntoView({ block: "center" });
  }
  function closeBrowser() { mb.hidden = true; document.body.classList.remove("mb-open"); }
  function renderBrowser() {
    const n = LAYOUTS[state.layout].n, duo = poseFor === "duo", list = duo ? MEME_DUO : MEME, key = packKey(), cur = picks[key];
    if (browseShot >= n) browseShot = 0;
    mb.querySelector(".mb-title").textContent = n === 1 ? "Pick a meme" : `Pick a meme for shot ${browseShot + 1}`;
    const shots = $("mbShots"); shots.innerHTML = ""; shots.hidden = n === 1;
    for (let i = 0; i < n; i++) {
      const b = document.createElement("button"); b.type = "button"; b.className = "mb-shot"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(i === browseShot));
      b.innerHTML = `${memeImg(list[cur[i]], duo)}<small>Shot ${i + 1}</small>`; b.title = list[cur[i]].name;
      b.addEventListener("click", () => { browseShot = i; renderBrowser(); }); shots.appendChild(b);
    }
    const fl = $("mbFilter"); fl.innerHTML = ""; fl.hidden = duo;
    [["all", "All"], ["one", "1 person"], ["two", "2 people"]].forEach(([k, l]) => fl.appendChild(chip(l, browseFilter === k, () => { browseFilter = k; renderBrowser(); })));
    const grid = $("mbGrid"); grid.innerHTML = "";
    list.forEach((m, idx) => {
      const two = duo || m.img.includes("/duo/");
      if (!duo && (browseFilter === "one" && two || browseFilter === "two" && !two)) return;
      const b = document.createElement("button"); b.type = "button"; b.className = "mtile"; b.setAttribute("aria-pressed", String(cur[browseShot] === idx));
      const used = cur.indexOf(idx);
      b.innerHTML = `<img src="${m.img}" alt="" loading="lazy" draggable="false"><span></span>${used >= 0 && used < n ? `<i>Shot ${used + 1}</i>` : ""}`;
      b.querySelector("span").textContent = m.name; b.title = m.tip;
      b.addEventListener("click", () => chooseMeme(idx)); grid.appendChild(b);
    });
  }
  function chooseMeme(idx) {
    const n = LAYOUTS[state.layout].n, list = picks[packKey()], other = list.indexOf(idx), was = browseShot;
    if (other >= 0 && other !== was) list[other] = list[was]; // already on another shot: the two trade places
    list[was] = idx; selPose = was;
    if (was < n - 1) browseShot = was + 1;
    changed();
    setStatus(solo ? `Shot ${was + 1}: ${packList()[idx].name}.` : `Shot ${was + 1}: ${packList()[idx].name}. Your partner sees it too.`);
    if (was === n - 1) closeBrowser(); else renderBrowser();
  }
  $("mbDone").addEventListener("click", closeBrowser);
  mb.addEventListener("click", (e) => { if (e.target === mb) closeBrowser(); });
  $("browseMemes").addEventListener("click", () => openBrowser(selPose));
  $("memeBtn").addEventListener("click", () => openBrowser(selPose));

  function changed(fromRemote) { buildUI(); render(); renderThumbs(); if (!fromRemote) sendSettings(); }
  let selPose = 0; // the pose shown beside the camera
  // inks: in Together your figure is drawn in black, your partner's in green
  const memeImg = (item, duo) => `<img class="meme${duo || item.img.includes("/duo/") ? " duo" : ""}" src="${item.img}" alt="" draggable="false">`;
  function poseInfo(i, colored) {
    const key = packKey(), item = packList(key)[picks[key][i]];
    if (poseFor === "duo") {
      if (poseMode === "meme") return { art: memeImg(item, true), name: item.name, tip: item.tip, duo: true };
      return { art: `<span class="emo duo" aria-hidden="true">${item[0]}${item[1]}</span>`, name: item[2], tip: item[3], duo: true };
    }
    if (poseMode === "meme") return { art: memeImg(item), name: item.name, tip: item.tip };
    return { art: `<span class="emo" aria-hidden="true">${item[0]}</span>`, name: item[1], tip: item[2] };
  }
  function pickPose(i) { selPose = i; renderRail(); renderPoseList(); }
  function swapPose(i) {
    const list = picks[packKey()], len = packList().length;
    for (let k = 1; k <= len; k++) { const c = (list[i] + k) % len; if (!list.includes(c)) { list[i] = c; break; } }
    selPose = i; changed();
  }
  function renderPoseList() {
    const n = LAYOUTS[state.layout].n, box = $("poseList"); box.innerHTML = "";
    if (poseMode === "off") return;
    for (let i = 0; i < n; i++) {
      const { art, name } = poseInfo(i, true);
      const d = document.createElement("div"); d.className = "pose-item" + (i === selPose ? " sel" : "");
      const b = document.createElement("button"); b.type = "button"; b.className = "pose-sel";
      b.innerHTML = `${art}<span><small>Shot ${i + 1}</small><b></b></span>`; b.querySelector("b").textContent = name;
      b.setAttribute("aria-label", `Shot ${i + 1}: ${name}. Show it beside the camera.`); b.setAttribute("aria-pressed", String(i === selPose));
      b.addEventListener("click", () => pickPose(i));
      const w = document.createElement("button"); w.type = "button"; w.className = "pose-swap"; w.textContent = "↻";
      w.title = "Swap this pose"; w.setAttribute("aria-label", `Swap the pose for shot ${i + 1}`);
      w.addEventListener("click", () => swapPose(i));
      d.append(b, w); box.appendChild(d);
    }
  }
  function renderRail() {
    const n = LAYOUTS[state.layout].n, on = poseMode !== "off", rail = $("poseRail");
    $("stageRow").classList.toggle("no-rail", !on); rail.hidden = !on;
    if (!on) return;
    if (selPose >= n) selPose = 0;
    rail.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const { art, name, duo } = poseInfo(i, true);
      const b = document.createElement("button"); b.type = "button"; b.className = "rail-card" + (duo ? " duo" : ""); b.setAttribute("aria-pressed", String(i === selPose));
      const who = !duo ? "" : solo ? `<span class="who2"><i>Left</i><i>Right</i></span>` : `<span class="who2"><i${mySide === "A" ? ' class="me"' : ""}>${mySide === "A" ? "You" : "Partner"}</i><i${mySide === "B" ? ' class="me"' : ""}>${mySide === "B" ? "You" : "Partner"}</i></span>`;
      b.innerHTML = `${art}${who}<small>Shot ${i + 1}</small>`; b.title = name;
      b.setAttribute("aria-label", `Shot ${i + 1}: ${name}`);
      b.addEventListener("click", () => pickPose(i));
      rail.appendChild(b);
    }
    if (getComputedStyle(rail).display === "flex") {
      const card = rail.children[selPose];
      if (card) rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft - (rail.clientWidth - card.offsetWidth) / 2, behavior: busy ? "smooth" : "auto" });
    }
  }
  // light / dark switch (white by default)
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("fb-theme", t); } catch {}
    $("themeColor").setAttribute("content", t === "dark" ? "#0F1110" : "#F3F4F2");
    $("themeBtn").setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
  $("themeBtn").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  // Design tab: one tile per style and per season, each a small preview of your print
  function designTile(label, pressed, onClick, hint) {
    const b = document.createElement("button"); b.type = "button"; b.className = "dtile"; b.setAttribute("aria-pressed", String(pressed));
    const c = document.createElement("canvas"); c.width = 132; c.height = 176; c.setAttribute("aria-hidden", "true");
    const t = document.createElement("span"); t.className = "dname"; t.textContent = label;
    b.append(c, t); if (hint) b.title = hint; b.addEventListener("click", onClick); return { b, c };
  }
  let tilesTodo = [];
  function buildDesigns() {
    const ds = $("designs"), se = $("seasonTiles"); if (!ds) return;
    ds.innerHTML = ""; se.innerHTML = ""; tilesTodo = [];
    Object.entries(DESIGNS).forEach(([k, d]) => {
      const pressed = state.design === k && (k !== "classic" || state.theme === "none");
      const t = designTile(d.label, pressed, () => { state.design = k; if (k === "classic") state.theme = "none"; changed(); }, d.hint);
      ds.appendChild(t.b); tilesTodo.push([t.c, k, "none"]);
    });
    Object.entries(THEMES).forEach(([k, th]) => {
      if (!th.bg) return;
      const t = designTile(th.label + (k === seasonNow() ? " ✦" : ""), state.design === "classic" && state.theme === k, () => { state.design = "classic"; state.theme = k; changed(); });
      se.appendChild(t.b); tilesTodo.push([t.c, "classic", k]);
    });
    if (!$("tab-design").hidden) paintTiles();
  }
  // previews are real renders of your print in each style (only while the Design tab is open)
  function paintTiles() {
    if (!tilesTodo.length) return;
    const keep = [state.design, state.theme], cls = canvas.className;
    tilesTodo.forEach(([c, k, th]) => {
      state.design = k; state.theme = th; render();
      const g = c.getContext("2d"), s = Math.min(c.width / canvas.width, c.height / canvas.height), w = canvas.width * s, h = canvas.height * s;
      g.clearRect(0, 0, c.width, c.height); g.drawImage(canvas, (c.width - w) / 2, (c.height - h) / 2, w, h);
    });
    tilesTodo = []; [state.design, state.theme] = keep; render(); canvas.className = cls;
  }
  // settings tabs (remembered on this device)
  function showTab(name) {
    ["look", "design", "poses", "caption"].forEach((t) => { $("tab-" + t).hidden = t !== name; $("tabBtn-" + t).setAttribute("aria-selected", String(t === name)); });
    if (name === "design") paintTiles();
    try { localStorage.setItem("fb-tab", name); } catch {}
  }
  ["look", "design", "poses", "caption"].forEach((t) => $("tabBtn-" + t).addEventListener("click", () => showTab(t)));
  try { const t = localStorage.getItem("fb-tab"); if (["look", "design", "poses", "caption"].includes(t)) showTab(t); } catch {}
  $("showDate").addEventListener("change", (e) => { state.showDate = e.target.checked; changed(); });
  $("caption").addEventListener("input", (e) => { state.caption = e.target.value; $("capCount").textContent = `${state.caption.length}/28`; render(); sendSettingsSoon(); });
  $("capHl").addEventListener("change", (e) => { state.capHl = e.target.checked; changed(); });
  $("posePrint").addEventListener("change", (e) => { posePrint = e.target.checked; changed(); });
  $("newPoses").addEventListener("click", () => { picks.classic = shuffle(4, CLASSIC.length); picks.meme = shuffle(4, MEME.length); picks.classicDuo = shuffle(4, CLASSIC_DUO.length); picks.memeDuo = shuffle(4, MEME_DUO.length); changed(); setStatus(solo ? "New poses." : "New poses for both of you."); });

  function renderThumbs() {
    const n = LAYOUTS[state.layout].n, box = $("thumbs"); box.innerHTML = "";
    box.classList.toggle("solo", solo);
    for (let i = 0; i < n; i++) {
      const d = document.createElement("div");
      (solo ? ["A"] : ["A", "B"]).forEach((sd) => { const p = sideArr(sd)[i]; if (p) { const im = document.createElement("img"); im.src = p.thumb; im.alt = `Shot ${i + 1}, ${sd === mySide ? "you" : "partner"}`; if (!p.shown) { im.className = "pop"; p.shown = true; } d.appendChild(im); } else d.appendChild(document.createElement("span")); });
      box.appendChild(d);
    }
  }

  /* ---------- Face stickers: live decorations that follow each face ---------- */
  // The camera is drawn onto a canvas with the stickers, and that canvas is what you see, what your partner sees, and what the photos capture.
  let fx = "none";
  try { const v = localStorage.getItem("fb-fx"); if (FX.some((f) => f[0] === v)) fx = v; } catch {}
  let camStream = null, srcVideo = null, fxCanvas = null, fxCtx = null, fxRaf = 0, pipelineOn = false;
  let faces = [], faceLib = "idle", detecting = false;

  function startPipeline(cam) {
    camStream = cam;
    if (!srcVideo) {
      srcVideo = document.createElement("video");
      srcVideo.muted = true; srcVideo.playsInline = true; srcVideo.setAttribute("playsinline", ""); srcVideo.setAttribute("aria-hidden", "true");
      srcVideo.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
      document.body.appendChild(srcVideo);
    }
    srcVideo.srcObject = cam; srcVideo.play().catch(() => {});
    fxCanvas = document.createElement("canvas"); fxCanvas.width = 640; fxCanvas.height = 480;
    fxCtx = fxCanvas.getContext("2d");
    pipelineOn = typeof fxCanvas.captureStream === "function";
    if (!pipelineOn) return cam;
    cancelAnimationFrame(fxRaf); fxLoop();
    if (fx !== "none") { preloadSticker(fx); loadFaces(); }
    return new MediaStream([fxCanvas.captureStream(30).getVideoTracks()[0], ...cam.getAudioTracks()]);
  }
  let lite = params.get("lite") === "1", detectMs = 0;
  $("stage").dataset.lite = lite ? "1" : "0";
  function setLite(on) {
    if (lite === on) return; lite = on;
    $("stage").dataset.lite = on ? "1" : "0";
    if (on) setStatus("Lighter mode on to keep things smooth on this phone.");
  }
  function fxLoop() {
    fxRaf = requestAnimationFrame(fxLoop);
    const v = srcVideo; if (!v || !v.videoWidth) return;
    const sc = lite && v.videoWidth > 720 ? 720 / v.videoWidth : 1, w = Math.round(v.videoWidth * sc), h = Math.round(v.videoHeight * sc);
    if (fxCanvas.width !== w || fxCanvas.height !== h) { fxCanvas.width = w; fxCanvas.height = h; }
    fxCtx.setTransform(sc, 0, 0, sc, 0, 0); // stickers are placed in camera pixels
    fxCtx.drawImage(v, 0, 0);
    if (fx !== "none") drawStickers(fxCtx, performance.now() / 1000);
    fxCtx.setTransform(1, 0, 0, 1, 0, 0);
  }
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function loadFaces() {
    if (faceLib === "ready") { detectLoop(); return; }
    if (faceLib === "loading") return;
    faceLib = "loading"; setStatus("Loading face stickers…");
    try {
      if (typeof faceapi === "undefined") await loadScript("vendor/face-api/face-api.js");
      await faceapi.nets.tinyFaceDetector.loadFromUri("vendor/face-api/models");
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri("vendor/face-api/models");
      faceLib = "ready"; setStatus("Face stickers on. Move around and they follow you.");
      detectLoop();
    } catch (e) { faceLib = "failed"; setStatus("Face stickers couldn't load on this device.", true); }
  }
  const P = (p) => ({ x: p.x, y: p.y });
  const mean = (pts, a, b) => { let x = 0, y = 0; for (let i = a; i <= b; i++) { x += pts[i].x; y += pts[i].y; } const n = b - a + 1; return { x: x / n, y: y / n }; };
  function faceGeometry(pts) {
    const eyeL = mean(pts, 36, 41), eyeR = mean(pts, 42, 47), nose = P(pts[30]), mouth = mean(pts, 48, 59), chin = P(pts[8]);
    const mid = { x: (eyeL.x + eyeR.x) / 2, y: (eyeL.y + eyeR.y) / 2 };
    const e = Math.hypot(eyeR.x - eyeL.x, eyeR.y - eyeL.y), ang = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);
    const down = (p) => (p.x - mid.x) * -Math.sin(ang) + (p.y - mid.y) * Math.cos(ang); // distance below the eye line
    return { x: mid.x, y: mid.y, e, ang, nd: down(nose), md: down(mouth), cd: down(chin) };
  }
  function updateFaces(res) {
    const now = performance.now();
    if (!res.length) { // nobody found this time: keep the last stickers briefly so they don't blink
      faces = faces.filter((f) => now - f.seen < Math.max(700, detectMs * 2.5)); // slower devices check less often
    } else {
      const used = new Set();
      faces = res.map((r) => {
        const g = faceGeometry(r.landmarks.positions);
        let old = null, best = g.e * 3;
        faces.forEach((f) => { const d = Math.hypot(f.x - g.x, f.y - g.y); if (d < best && !used.has(f)) { best = d; old = f; } });
        if (old) { // smooth small jitters, follow big moves right away
          used.add(old); const a = best < g.e * .6 ? 0.6 : 1, px = old.x + (old.vx || 0) * Math.min(now - old.seen, 300), py = old.y + (old.vy || 0) * Math.min(now - old.seen, 300);
          for (const k of ["x", "y", "e", "nd", "md", "cd"]) g[k] = old[k] + (g[k] - old[k]) * a;
          g.ang = old.ang + (g.ang - old.ang) * a;
          const dt = now - old.seen; // speed in pixels per millisecond, smoothed
          if (dt > 0 && dt < 1000) { g.vx = ((g.x - old.x) / dt) * .6 + (old.vx || 0) * .4; g.vy = ((g.y - old.y) / dt) * .6 + (old.vy || 0) * .4; }
          if (Math.hypot(px - g.x, py - g.y) > g.e * 1.5) { g.vx = 0; g.vy = 0; } // direction changed: stop leading
        }
        g.seen = now; return g;
      });
    }
    $("stage").dataset.faces = String(faces.length);
  }
  async function detectLoop() {
    if (detecting || faceLib !== "ready") return;
    detecting = true;
    const full = new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.55 });
    const light = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
    while (camStream) {
      if (fx !== "none" && srcVideo && srcVideo.videoWidth) {
        const t0 = performance.now();
        try { updateFaces(await faceapi.detectAllFaces(srcVideo, lite ? light : full).withFaceLandmarks(true)); } catch {}
        const ms = performance.now() - t0; detectMs = detectMs ? detectMs * .8 + ms * .2 : ms;
        if (!lite && detectMs > 200 && params.get("lite") !== "0") setLite(true); // slow phone: lighter checks, smaller video
        await sleep(lite ? 140 : 60);
      } else { faces = []; await sleep(300); }
    }
    detecting = false;
  }

  function drawStickers(g, t) {
    const draw = STICKERS[fx]; if (!draw) return;
    const now = performance.now();
    faces.forEach((f) => {
      const lead = Math.min(now - f.seen, 250); // between face checks, keep moving the way the face was moving
      g.save(); g.translate(f.x + (f.vx || 0) * lead, f.y + (f.vy || 0) * lead); g.rotate(f.ang); try { draw(g, f, t); } catch {} g.restore();
    });
  }
  function buildFx() {
    const bar = $("fxBar"); bar.innerHTML = "";
    FX.forEach(([k, label, ch]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "fx"; b.setAttribute("aria-pressed", String(fx === k));
      b.innerHTML = ch.includes("/") ? `<img class="e" src="${ch}" alt="" loading="lazy" decoding="async"><span></span>` : `<span class="e" aria-hidden="true">${ch}</span><span></span>`;
      b.lastChild.textContent = label;
      b.addEventListener("click", () => {
        fx = k; try { localStorage.setItem("fb-fx", k); } catch {}
        preloadSticker(k);
        buildFx();
        if (photosMode) { rebakeAll(); return; }
        if (k === "none") { setStatus("Face stickers off."); return; }
        if (!pipelineOn) { setStatus("Face stickers aren't supported in this browser. Try Chrome or Safari.", true); return; }
        if (faceLib === "ready") { setStatus(`${label} on. Move around and it follows you.`); detectLoop(); } else loadFaces();
      });
      bar.appendChild(b);
    });
  }

  /* ---------- camera ---------- */
  let localStream = null, facing = "user", micOn = true, solo = false;
  async function openCamera(withAudio = true) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error("nomedia"), { name: "NoMedia" });
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: withAudio ? { echoCancellation: true, noiseSuppression: true } : false,
    });
  }
  function cameraError(e) {
    const n = e && e.name;
    if (n === "NotAllowedError") return solo ? "Camera access was blocked. Allow the camera for this site in your browser settings, then try again." : "Camera access was blocked. Allow camera and microphone for this site in your browser settings, then try again.";
    if (n === "NotFoundError" || n === "OverconstrainedError") return "No camera was found on this device.";
    if (n === "NoMedia") return "This browser can't use the camera here. Open the booth over https in Chrome, Safari or Edge.";
    if (n === "NotReadableError") return "Another app is using your camera. Close it and try again.";
    return "Couldn't start your camera. Try again.";
  }
  function localVideo() { return mySide === "A" ? $("vidA") : $("vidB"); }
  function remoteVideo() { return mySide === "A" ? $("vidB") : $("vidA"); }
  function showLocal() {
    const v = localVideo(); v.srcObject = localStream; v.muted = true; v.play().catch(() => {});
    $(mySide === "A" ? "whoA" : "whoB").textContent = "You";
    $(mySide === "A" ? "whoB" : "whoA").textContent = "Partner";
    $(mySide === "A" ? "waitA" : "waitB").hidden = true;
    if (solo) return;
    const w = $(mySide === "A" ? "waitB" : "waitA"); w.hidden = false; w.textContent = "Waiting for your partner to join…";
  }
  function showRemote(stream) {
    const v = remoteVideo(); v.srcObject = stream; v.muted = false;
    v.play().catch(() => { setStatus("Tap anywhere to hear your partner."); document.addEventListener("click", () => v.play().catch(() => {}), { once: true }); });
    $(mySide === "A" ? "waitB" : "waitA").hidden = true;
  }
  function clearRemote(msg) {
    const v = remoteVideo(); v.srcObject = null;
    const w = $(mySide === "A" ? "waitB" : "waitA"); w.hidden = false; w.textContent = msg || "Waiting for your partner to join…";
  }
  $("micBtn").addEventListener("click", () => {
    micOn = !micOn; if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = micOn; });
    $("micBtn").classList.toggle("off", !micOn); $("micBtn").setAttribute("aria-label", micOn ? "Mute microphone" : "Unmute microphone");
    setStatus(micOn ? "Microphone on." : "Microphone muted.");
  });
  let flipping = false;
  const getCam = (mode, exact) => navigator.mediaDevices.getUserMedia({ video: { facingMode: exact ? { exact: mode } : mode, width: { ideal: 1280 }, height: { ideal: 960 } } });
  $("flipBtn").addEventListener("click", async () => {
    if (flipping || !localStream) return;
    flipping = true; $("flipBtn").disabled = true;
    const want = facing === "user" ? "environment" : "user";
    const old = camStream.getVideoTracks()[0];
    if (old) old.stop(); // most phones can only have one camera open at a time
    let s = null, switched = false;
    try { s = await getCam(want, true); switched = true; } catch {
      try { s = await getCam(want, false); switched = true; } catch {}
    }
    if (!s) { try { s = await getCam(facing, false); } catch {} } // could not switch: reopen the camera we had
    if (!s) { setStatus("Your camera stopped. Tap Leave and start again.", true); flipping = false; $("flipBtn").disabled = false; return; }
    if (switched) facing = want;
    const nt = s.getVideoTracks()[0];
    camStream = new MediaStream([nt, ...camStream.getAudioTracks()]);
    srcVideo.srcObject = camStream; srcVideo.play().catch(() => {});
    const v = localVideo();
    if (!pipelineOn) { // no sticker canvas in this browser: send the camera itself
      localStream = camStream; v.srcObject = localStream; v.play().catch(() => {});
      if (call && call.peerConnection) { const snd = call.peerConnection.getSenders().find((x) => x.track && x.track.kind === "video"); if (snd) snd.replaceTrack(nt).catch(() => {}); }
    }
    v.style.transform = facing === "user" ? "" : "none";
    send({ t: "facing", user: facing === "user" });
    setStatus(!switched ? "Couldn't open the other camera on this device." : facing === "user" ? "Front camera on." : "Back camera on.", !switched);
    flipping = false; $("flipBtn").disabled = false;
  });

  /* ---------- connection (PeerJS) ---------- */
  const PREFIX = "flashbulb-live-";
  const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const genCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  let peer = null, conn = null, call = null, code = "", busy = false, leaving = false, reconnectTries = 0;
  // Connection settings come from config.js (relay server, own PeerJS server); link parameters override them for testing.
  const CFG = window.FLASHBULB_CONFIG || {};
  let iceCache = null;
  async function iceServers() {
    if (iceCache) return iceCache;
    const list = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
    (Array.isArray(CFG.iceServers) ? CFG.iceServers : []).forEach((x) => { if (x && x.urls) list.push(x); });
    if (params.get("turn")) list.push({ urls: params.get("turn"), username: params.get("turnuser") || "", credential: params.get("turnpass") || "" });
    if (CFG.turnCredentialsUrl) {
      try {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
        const r = await fetch(CFG.turnCredentialsUrl, { signal: ctl.signal }); clearTimeout(t);
        const extra = await r.json();
        if (Array.isArray(extra)) extra.forEach((x) => { if (x && x.urls) list.push(x); });
      } catch (e) { /* relay unavailable: direct connections still work on most Wi-Fi */ }
    }
    iceCache = list; return list;
  }
  const hasRelay = () => (iceCache || []).some((x) => [].concat(x.urls).some((u) => /^turns?:/.test(u)));
  async function peerOptions() {
    const o = { debug: 0, config: { iceServers: await iceServers() } }, ps = CFG.peerServer;
    if (params.get("peerhost")) { o.host = params.get("peerhost"); o.port = +(params.get("peerport") || 443); o.path = params.get("peerpath") || "/"; o.secure = params.get("peersecure") !== "0"; }
    else if (ps && ps.host) { o.host = ps.host; o.port = +(ps.port || 443); o.path = ps.path || "/"; o.secure = ps.secure !== false; if (ps.key) o.key = ps.key; }
    return o;
  }
  const serviceTrouble = (t) => t === "network" || t === "server-error" || t === "socket-error" || t === "socket-closed";
  // Keep the link to the connection service alive if it drops for a moment.
  // Phones pause a page in the background (for example while you send the link in Messenger). Coming back, rejoin the service at once.
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && peer && peer.disconnected && !peer.destroyed && !leaving) { try { peer.reconnect(); } catch (e) {} } });
  let testAway = false; // tests only: hold the booth away from the service, like a phone with the page in the background
  function keepAlive(p) { p.on("disconnected", () => { if (!leaving && !p.destroyed) setTimeout(() => { try { if (p.disconnected && !p.destroyed && !testAway) p.reconnect(); } catch (e) {} }, 1500); }); }
  /* ---------- Steps: set up your look (no camera yet) → shoot → your print drops out ---------- */
  let setupMode = null; // "solo" | "host" | "photos"
  const boothEl = $("booth");
  function setView(v) {
    boothEl.dataset.view = v; closeLook();
    const pb = $("printBox");
    if (v === "result") $("tray").appendChild(pb); else $("side").insertBefore(pb, $("setupCta"));
    $("sideTitle").textContent = v === "setup" ? "Choose your look" : "Edit look";
    $("setupKicker").hidden = v !== "setup";
    window.scrollTo(0, 0);
  }
  function openLook() { boothEl.classList.add("look-open"); $("scrim").hidden = false; if (!$("tab-design").hidden) paintTiles(); }
  function closeLook() { boothEl.classList.remove("look-open"); $("scrim").hidden = true; }
  ["lookBtn", "lookBtn2"].forEach((id) => $(id).addEventListener("click", openLook));
  $("closeLook").addEventListener("click", closeLook); $("scrim").addEventListener("click", closeLook);
  document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; if (!mb.hidden) closeBrowser(); else closeLook(); });
  function enterSetup(mode) {
    setupMode = mode; solo = mode !== "host"; photosMode = false;
    state.duo = mode === "host"; poseFor = state.duo ? "duo" : "solo"; state.mirror = mode !== "photos";
    $("lobby").hidden = true; boothEl.hidden = false;
    $("modeTag").textContent = mode === "host" ? "Together" : mode === "photos" ? "Your photos" : "Just me";
    $("codeWrap").hidden = true; $("pill").hidden = true;
    $("startCamBtn").textContent = mode === "host" ? "Open my booth" : mode === "photos" ? "Choose photos" : "Start camera";
    $("setupNote").textContent = mode === "host" ? "Next, your camera and microphone turn on and you get a code to send your partner."
      : mode === "photos" ? "Next, pick up to 4 photos from your gallery." : "Next, your camera turns on. You can change all of this later with Edit look.";
    $("againBtn").textContent = mode === "photos" ? "Change photos" : "Shoot again";
    $("setupNote").classList.remove("err"); $("startCamBtn").disabled = false;
    setView("setup"); buildUI(); render(); renderThumbs();
  }
  $("startCamBtn").addEventListener("click", () => { if (setupMode === "host") startBooth(); else if (setupMode === "photos") startPhotos(); else startSolo(); });
  // the print feeds out of the slot, drops, and develops
  function dispense() {
    setView("result");
    const pb = $("printBox"); pb.classList.remove("dispense"); void pb.offsetWidth; pb.classList.add("dispense");
    const st = $("strip"); st.classList.remove("develop"); void st.offsetWidth; st.classList.add("develop");
    motor(calm() ? .4 : 2.2);
  }
  $("againBtn").addEventListener("click", () => { setView("shoot"); if (!photosMode) setStatus(solo ? "Ready when you are. Tap Start." : "Ready for another round. Tap Start when you're both ready."); });

  function enterBooth() {
    setView("shoot");
    $("lobby").hidden = true; $("booth").hidden = false;
    state.duo = !solo; poseFor = solo ? "solo" : "duo";
    $("stage").classList.toggle("solo", solo);
    $("modeTag").textContent = solo ? "Just me" : "Together";
    $("codeWrap").hidden = solo; $("micBtn").hidden = solo;
    if (solo) { $("pill").hidden = true; $("shootBtn").disabled = false; }
    $("codeChip").textContent = code; showLocal(); buildUI(); render(); renderThumbs();
    if (navigator.share) $("shareImgBtn").hidden = false;
    window.scrollTo(0, 0);
  }
  async function startSolo() {
    solo = true; busyBtns(true); $("soloBtn").disabled = true; lobbyNote("Starting your camera…");
    try { localStream = startPipeline(await openCamera(false)); } catch (e) { busyBtns(false); $("soloBtn").disabled = false; lobbyNote(cameraError(e), true); solo = false; return; }
    mySide = "A"; enterBooth();
    setStatus(LAYOUTS[state.layout].n === 1 ? "Tap Take the shot when you're ready." : "Tap Start when you're ready. You'll get a pose and a countdown for each shot.");
  }
  function lobbyNote(msg, err) { ["lobbyNote", "setupNote", "inviteNote"].forEach((id) => { const n = $(id); n.textContent = msg; n.classList.toggle("err", !!err); }); }
  function busyBtns(on) { ["startBtn", "joinBtn", "startCamBtn", "inviteJoin"].forEach((id) => { $(id).disabled = on; }); }

  const inBooth = () => !$("booth").hidden && $("booth").dataset.view !== "setup"; // past the setup step, camera on
  async function startBooth() {
    if (typeof Peer === "undefined") { lobbyNote("Couldn't load the video connection. Check your internet and reload.", true); return; }
    busyBtns(true); lobbyNote("Starting your camera…");
    try { localStream = startPipeline(await openCamera()); } catch (e) { busyBtns(false); lobbyNote(cameraError(e), true); return; }
    mySide = "A"; code = genCode();
    const opts = await peerOptions();
    const tryOpen = (attempt) => {
      const p = peer = new Peer(PREFIX + code, opts); keepAlive(p);
      p.on("open", () => { if (inBooth()) return; enterBooth(); setPill("wait", "Waiting for your partner"); setStatus(`Your booth is open. Send your partner the code ${code} or tap Share link.`); });
      p.on("error", (e) => {
        if (e.type === "unavailable-id" && attempt < 3) { p.destroy(); code = genCode(); tryOpen(attempt + 1); return; }
        if (serviceTrouble(e.type) && !p.open && attempt < 3) { // the connection service is busy: try again
          lobbyNote("The booth service is busy. Trying again…"); p.destroy(); setTimeout(() => tryOpen(attempt + 1), 1500 * (attempt + 1)); return;
        }
        if (serviceTrouble(e.type)) { if (!inBooth()) { lobbyNote("Couldn't reach the booth service. Check your internet and try again.", true); busyBtns(false); } else setPill("wait", "Reconnecting"); return; }
        if (e.type !== "peer-unavailable") setStatus("Connection problem: " + e.type, true);
      });
      p.on("connection", (c) => {
        if (conn && conn.open && c.peer !== conn.peer) { c.on("open", () => { c.send({ t: "full" }); setTimeout(() => c.close(), 500); }); return; }
        if (conn && c.peer === conn.peer) { const old = conn; conn = null; try { old.close(); } catch (e) {} } // the same partner knocking again: use the newest link
        wireConn(c);
      });
      p.on("call", (cl) => {
        if (call && call.open && conn && conn.open) { cl.close(); return; }
        if (call && call !== cl) { try { call.close(); } catch (e) {} } // a returning partner replaces the old video link
        call = cl; cl.answer(localStream); wireCall(cl);
      });
    };
    tryOpen(0);
  }
  async function joinBooth() {
    const c = $("joinCode").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.length !== 6) { lobbyNote("Booth codes have 6 letters and numbers.", true); return; }
    if (typeof Peer === "undefined") { lobbyNote("Couldn't load the video connection. Check your internet and reload.", true); return; }
    busyBtns(true); lobbyNote("Starting your camera…");
    try { localStream = startPipeline(await openCamera()); } catch (e) { busyBtns(false); lobbyNote(cameraError(e), true); return; }
    mySide = "B"; code = c; leaving = false; joinStart = 0;
    const opts = await peerOptions();
    const tryOpen = (attempt) => {
      const p = peer = new Peer(opts); keepAlive(p);
      p.on("open", () => {
        if (inBooth() || joinStart) return;
        joinStart = Date.now(); lobbyNote("Connecting to your partner…");
        knock();
      });
      p.on("error", (e) => {
        if (e.type === "peer-unavailable") {
          if (inBooth()) return; // reconnecting: keep trying quietly
          // the booth isn't there right now: often your partner just switched apps to send the link. Keep knocking for a while.
          if (Date.now() - joinStart < JOIN_WAIT) { lobbyNote("Waiting for your partner's booth… Ask them to go back to the booth page and keep it open."); clearTimeout(knockT); knockT = setTimeout(knock, 3000); return; }
          lobbyNote("No open booth with that code. Check the code, and ask your partner to keep the booth page open on their phone.", true); busyBtns(false); stopAll(); return;
        }
        if (serviceTrouble(e.type) && !p.open && attempt < 3 && !inBooth()) {
          lobbyNote("The booth service is busy. Trying again…"); p.destroy(); setTimeout(() => tryOpen(attempt + 1), 1500 * (attempt + 1)); return;
        }
        if (!inBooth()) { lobbyNote("Connection problem: " + e.type + ". Check your internet and try again.", true); busyBtns(false); }
      });
    };
    tryOpen(0);
  }
  // Joining: knock on the booth every few seconds for up to a minute, until the link opens.
  const JOIN_WAIT = 60000;
  let joinStart = 0, knockT = 0;
  function knock() {
    if (leaving || inBooth()) return;
    if (Date.now() - joinStart > JOIN_WAIT) {
      lobbyNote(hasRelay() ? "Found your partner's booth, but couldn't connect. Check both of your internet connections and try again." : "Couldn't connect to your partner's phone. Make sure their booth page is open, and try both of you on Wi-Fi.", true);
      busyBtns(false); stopAll(); return;
    }
    if (peer && peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch (e) {} }
    if (conn && !conn.open) { const old = conn; conn = null; try { old.close(); } catch (e) {} } // drop the knock that went unanswered
    const dc = guestConnect();
    dc.on("open", () => { clearTimeout(knockT); if (!inBooth()) enterBooth(); });
    clearTimeout(knockT); knockT = setTimeout(() => { if (!inBooth() && (!conn || !conn.open)) knock(); }, 10000); // no answer yet: try a fresh connection
  }
  function guestConnect() {
    const dc = peer.connect(PREFIX + code, { reliable: true });
    wireConn(dc);
    if (call) { try { call.close(); } catch (e) {} }
    call = peer.call(PREFIX + code, localStream); wireCall(call);
    return dc;
  }
  // If the link to the partner drops, the person who joined calls back automatically.
  function scheduleReconnect() {
    if (leaving || mySide !== "B") return;
    if (reconnectTries >= 10) { setPill("wait", "Disconnected"); setStatus("Lost the connection to your partner. Tap Leave and join again.", true); return; }
    reconnectTries++;
    setPill("wait", "Reconnecting"); setStatus(`Connection lost. Reconnecting… (try ${reconnectTries})`);
    setTimeout(() => {
      if (leaving || (conn && conn.open)) return;
      try { if (peer.disconnected && !peer.destroyed) peer.reconnect(); } catch (e) {}
      guestConnect();
      setTimeout(() => { if (!leaving && (!conn || !conn.open)) scheduleReconnect(); }, 5000);
    }, 1500);
  }
  function wireCall(cl) {
    cl.on("stream", (s) => showRemote(s));
    cl.on("close", () => { if (call === cl) { call = null; clearRemote("Your partner's video stopped."); } });
    cl.on("error", () => setStatus("The video connection dropped. Reconnecting…", true));
    const pc = cl.peerConnection;
    if (pc) pc.addEventListener("iceconnectionstatechange", () => {
      if (pc.iceConnectionState === "failed") setStatus(hasRelay() ? "The video connection failed. Reconnecting…" : "Couldn't connect your videos directly. Try both of you on Wi-Fi, or add a relay server (see the README).", true);
    });
  }
  function wireConn(c) {
    conn = c;
    c.on("open", () => {
      setPill("on", "Connected"); $("shootBtn").disabled = false;
      setStatus(reconnectTries ? "Reconnected!" : mySide === "A" ? "Your partner is here. Say hi, then tap Start when you're both ready." : "You're in! Say hi, then tap Start when you're both ready.");
      reconnectTries = 0;
      if (mySide === "A") send({ t: "settings", s: settingsPayload() });
      send({ t: "facing", user: facing === "user" });
    });
    c.on("data", onData);
    c.on("close", () => {
      if (conn !== c) return;
      conn = null; $("shootBtn").disabled = true;
      if (mySide === "B" && !leaving) { clearRemote("Reconnecting to your partner…"); scheduleReconnect(); return; }
      setPill("wait", "Partner left"); clearRemote("Your partner left. They can join again with the same code."); setStatus("Your partner left the booth. They can rejoin with the same code.");
    });
  }
  function send(m) { if (conn && conn.open) { try { conn.send(m); } catch (e) { setStatus("Couldn't send to your partner.", true); } } }

  /* ---------- settings sync ---------- */
  function settingsPayload() {
    return { layout: state.layout, filter: state.filter, frame: state.frame, theme: state.theme, design: state.design, caption: state.caption,
      capHl: state.capHl, showDate: state.showDate, poseMode, posePrint, poseFor,
      picks: { classic: picks.classic.slice(), meme: picks.meme.slice(), classicDuo: picks.classicDuo.slice(), memeDuo: picks.memeDuo.slice() } };
  }
  function sendSettings() { send({ t: "settings", s: settingsPayload() }); }
  let capTimer; function sendSettingsSoon() { clearTimeout(capTimer); capTimer = setTimeout(sendSettings, 350); }
  const okPicks = (a, len) => Array.isArray(a) && a.length === 4 && a.every((v) => Number.isInteger(v) && v >= 0 && v < len);
  function applySettings(d) {
    if (!d || typeof d !== "object") return;
    if (LAYOUTS[d.layout] && !busy) state.layout = d.layout;
    if (FILTERS[d.filter]) state.filter = d.filter;
    if (Number.isInteger(d.frame) && FRAMES[d.frame]) state.frame = d.frame;
    if (THEMES[d.theme]) state.theme = d.theme;
    if (DESIGNS[d.design]) state.design = d.design;
    if (typeof d.caption === "string" && document.activeElement !== $("caption")) state.caption = d.caption.slice(0, 28);
    if (typeof d.capHl === "boolean") state.capHl = d.capHl;
    if (typeof d.showDate === "boolean") state.showDate = d.showDate;
    if (["off", "classic", "meme"].includes(d.poseMode)) poseMode = d.poseMode;
    if (typeof d.posePrint === "boolean") posePrint = d.posePrint;
    if (d.poseFor === "solo" || d.poseFor === "duo") poseFor = d.poseFor;
    if (d.picks) [["classic", CLASSIC], ["meme", MEME], ["classicDuo", CLASSIC_DUO], ["memeDuo", MEME_DUO]].forEach(([k, list]) => { if (okPicks(d.picks[k], list.length)) picks[k] = d.picks[k].slice(); });
    changed(true);
  }

  /* ---------- shots ---------- */
  let partnerFront = true;
  function frameFrom(video, backCamera) {
    const w = video.videoWidth || video.width, h = video.videoHeight || video.height; if (!w || !h) return null;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    if (backCamera) { g.translate(w, 0); g.scale(-1, 1); } // the print mirrors photos like a selfie; undo that for the back camera
    g.drawImage(video, 0, 0, w, h);
    return c;
  }
  function toShot(c) {
    const t = document.createElement("canvas"), ts = 220 / Math.max(c.width, c.height);
    t.width = Math.round(c.width * ts); t.height = Math.round(c.height * ts); t.getContext("2d").drawImage(c, 0, 0, t.width, t.height);
    return { canvas: c, thumb: t.toDataURL("image/jpeg", .8) };
  }
  function encode(c) {
    const s = Math.min(1, 1100 / Math.max(c.width, c.height)), t = document.createElement("canvas");
    t.width = Math.round(c.width * s); t.height = Math.round(c.height * s); t.getContext("2d").drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL("image/jpeg", .85);
  }
  function decode(url) {
    if (typeof url !== "string" || !url.startsWith("data:image/jpeg;base64,") || url.length > 3000000) return Promise.resolve(null);
    return new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d").drawImage(im, 0, 0); res(toShot(c)); }; im.onerror = () => res(null); im.src = url; });
  }
  async function onData(m) {
    if (!m || typeof m !== "object") return;
    if (m.t === "settings") applySettings(m.s);
    else if (m.t === "start") { if (!busy) runSession(false, m.n); }
    else if (m.t === "shot" && Number.isInteger(m.i) && m.i >= 0 && m.i < 4) {
      const p = await decode(m.img); if (!p) return;
      sideArr(otherSide())[m.i] = p; render(); renderThumbs();
    } else if (m.t === "facing") {
      partnerFront = m.user !== false; remoteVideo().style.transform = partnerFront ? "" : "none";
    } else if (m.t === "full") { setStatus("That booth already has two people.", true); }
  }
  function overlay(html) { $("overlay").innerHTML = html; }
  function poseCardHTML(i, n) {
    const head = `<small>Shot ${i + 1} of ${n}</small>`;
    if (poseMode === "off") return `<div class="pose-pop">${head}<b>Strike a pose!</b></div>`;
    if (poseMode === "meme") { const f = packList()[picks[packKey()][i]]; return `<div class="pose-pop"><div class="art">${memeImg(f, poseFor === "duo")}</div>${head}<b>${f.name}</b></div>`; }
    const c = CLASSIC[picks.classic[i]]; return `<div class="pose-pop"><div class="art"><span class="emo">${c[0]}</span></div>${head}<b>${c[1]}</b></div>`;
  }
  async function runSession(local, nRemote) {
    if (busy) return;
    const n = LAYOUTS[state.layout].n;
    if (local) send({ t: "start", n });
    busy = true; $("shootBtn").disabled = true; buildUI();
    for (const sd of ["A", "B"]) for (let i = 0; i < 4; i++) sideArr(sd)[i] = null;
    render(); renderThumbs();
    const total = nRemote || n;
    for (let i = 0; i < total; i++) {
      if (poseMode !== "off" && i < LAYOUTS[state.layout].n) { pickPose(i); $("poseRail").classList.add("live"); }
      else overlay(poseCardHTML(i, total)); // no pose guide: a short "Strike a pose!" on the camera
      if (poseMode !== "off") { const pi = poseInfo(i); setStatus(`Shot ${i + 1} of ${total}: ${pi.name}. ${pi.tip || "Get ready!"}`); }
      else setStatus(`Shot ${i + 1} of ${total}: get ready.`);
      await sleep(1800);
      for (const k of [3, 2, 1]) { overlay(`<div class="count">${k}</div>`); beep(k === 1 ? 990 : 660, k === 1 ? .18 : .12); await sleep(800); }
      overlay("");
      const f = $("flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); shutter();
      const mine = frameFrom(pipelineOn ? fxCanvas : localVideo(), facing !== "user");
      if (mine) { sideArr(mySide)[i] = toShot(mine); send({ t: "shot", i, img: encode(mine) }); }
      render(); renderThumbs();
      const idx = i;
      if (!solo) setTimeout(() => { // backup: if the partner's photo never arrives, use a frame from their live video
        if (!sideArr(otherSide())[idx] && remoteVideo().srcObject) { const c = frameFrom(remoteVideo(), !partnerFront); if (c) { sideArr(otherSide())[idx] = toShot(c); render(); renderThumbs(); } }
      }, 6000);
      await sleep(900);
    }
    busy = false; $("shootBtn").disabled = solo ? false : !(conn && conn.open); $("poseRail").classList.remove("live"); buildUI();
    setStatus("Done! Your print is ready.");
    const st = $("strip"); st.classList.remove("develop"); void st.offsetWidth; st.classList.add("develop"); // the print develops like instant film
    dispense(); setTimeout(() => { confettiBurst(); beep(1320, .1, .12); setTimeout(() => beep(1760, .16, .12), 120); }, calm() ? 0 : 2400);
  }
  /* ---------- Use my photos: build a strip from pictures you already have ---------- */
  let photosMode = false, pickSlot = null;
  const photosRaw = [null, null, null, null];
  let faceLibPromise = null;
  function faceLibReady() { // load face tracking once, for photos (no camera loop)
    if (faceLib === "ready") return Promise.resolve(true);
    if (!faceLibPromise) faceLibPromise = (async () => {
      faceLib = "loading";
      try {
        if (typeof faceapi === "undefined") await loadScript("vendor/face-api/face-api.js");
        await faceapi.nets.tinyFaceDetector.loadFromUri("vendor/face-api/models");
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri("vendor/face-api/models");
        faceLib = "ready"; return true;
      } catch (e) { faceLib = "failed"; return false; }
    })();
    return faceLibPromise;
  }
  function artReady(k) {
    return Promise.all((NEEDS[k] || []).map((x) => new Promise((res) => {
      const src = x.includes("/") ? x : sheet(x); img(src); const im = imgCache[src];
      if (im.complete && im.naturalWidth) res(); else { im.addEventListener("load", res, { once: true }); im.addEventListener("error", res, { once: true }); }
    })));
  }
  // Put the chosen sticker on every face found in a photo (a still frame of the animation).
  async function bake(raw) {
    if (fx === "none" || !raw) return raw;
    if (!(await faceLibReady())) return raw;
    await artReady(fx);
    let res = [];
    try { res = await faceapi.detectAllFaces(raw, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })).withFaceLandmarks(true); } catch (e) {}
    const c = document.createElement("canvas"); c.width = raw.width; c.height = raw.height; const g = c.getContext("2d"); g.drawImage(raw, 0, 0);
    const keep = faces, now = performance.now();
    faces = res.map((r) => Object.assign(faceGeometry(r.landmarks.positions), { seen: now, vx: 0, vy: 0 }));
    drawStickers(g, 1.2); const found = faces.length; faces = keep;
    c.dataset.faces = String(found);
    return c;
  }
  async function placePhoto(i, raw) {
    photosRaw[i] = raw;
    const done = await bake(raw);
    state.photos[i] = toShot(done); state.photos[i].faces = +(done.dataset && done.dataset.faces || 0);
  }
  async function rebakeAll() {
    if (!photosRaw.some(Boolean)) return;
    setStatus(fx === "none" ? "Stickers removed." : "Adding stickers to your photos…");
    for (let i = 0; i < 4; i++) if (photosRaw[i]) await placePhoto(i, photosRaw[i]);
    renderPick(); render(); renderThumbs();
    if (fx !== "none") { const n = state.photos.reduce((a, p) => a + (p ? p.faces || 0 : 0), 0); setStatus(n ? `Stickers added to ${n} face${n === 1 ? "" : "s"}.` : "No faces found in your photos, so no stickers were added.", !n); }
    if (state.photos.slice(0, LAYOUTS[state.layout].n).every(Boolean)) dispense(); // all photos in: the print comes out again with the stickers
  }
  async function readPhoto(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) { bmp = await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { res(im); URL.revokeObjectURL(u); }; im.onerror = () => { rej(e); URL.revokeObjectURL(u); }; im.src = u; }); }
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    return c;
  }
  async function addPhotos(files, start) {
    const list = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) { setStatus("That file isn't a photo. Try a JPG, PNG or HEIC picture.", true); return; }
    const n = LAYOUTS[state.layout].n; setStatus("Adding your photos…");
    let added = 0;
    for (let k = 0; k < list.length && k < 4; k++) {
      let slot = k === 0 && start != null ? start : state.photos.findIndex((p, j) => !p && j < n);
      if (slot < 0) slot = (start ?? 0) + k < 4 ? (start ?? 0) + k : k;
      try { await placePhoto(slot, await readPhoto(list[k])); added++; } catch (e) {}
    }
    renderPick(); render(); renderThumbs();
    const st = $("strip"); st.classList.remove("develop"); void st.offsetWidth; st.classList.add("develop");
    const filled = state.photos.slice(0, n).filter(Boolean).length;
    setStatus(added ? (filled >= n ? "Your strip is ready! Save it as a picture." : `Added ${added} photo${added === 1 ? "" : "s"}. ${n - filled} to go.`) : "Couldn't open that photo. Try saving it as JPG first.", !added);
    if (filled >= n && added) { dispense(); setTimeout(confettiBurst, calm() ? 0 : 2400); }
  }
  function renderPick() {
    const box = $("photoPick"), n = LAYOUTS[state.layout].n; box.innerHTML = ""; box.dataset.n = String(n);
    for (let i = 0; i < n; i++) {
      const p = state.photos[i], b = document.createElement("button"); b.type = "button"; b.className = "pick-slot" + (p ? " filled" : "");
      b.setAttribute("aria-label", p ? `Replace photo ${i + 1}` : `Add photo ${i + 1}`);
      b.innerHTML = p ? `<img src="${p.thumb}" alt=""><span class="n">${i + 1}</span>` : `<span class="plus" aria-hidden="true">+</span><span>Photo ${i + 1}</span>`;
      b.addEventListener("click", () => { pickSlot = i; $("photoOne").value = ""; $("photoOne").click(); });
      box.appendChild(b);
    }
  }
  function startPhotos() {
    solo = true; photosMode = true; mySide = "A"; state.mirror = false; state.usingSamples = false;
    for (let i = 0; i < 4; i++) { state.photos[i] = null; photosRaw[i] = null; }
    enterBooth();
    document.body.classList.add("photos-mode"); $("stage").classList.add("photos");
    $("modeTag").textContent = "Your photos";
    ["micBtn", "flipBtn", "soundBtn"].forEach((id) => { $(id).hidden = true; });
    $("shootLabel").textContent = "Add photos"; $("shootBtn").disabled = false; $("againBtn").textContent = "Change photos";
    renderPick(); setStatus("Tap Add photos, or a numbered box, to pick pictures from your gallery.");
  }
  $("photoMany").addEventListener("change", (e) => addPhotos(e.target.files, null));
  $("photoOne").addEventListener("change", (e) => addPhotos(e.target.files, pickSlot));
  $("photosBtn").addEventListener("click", () => enterSetup("photos"));
  $("stage").addEventListener("dragover", (e) => { if (photosMode) e.preventDefault(); });
  $("stage").addEventListener("drop", (e) => { if (!photosMode) return; e.preventDefault(); addPhotos(e.dataTransfer && e.dataTransfer.files, null); });

  $("shootBtn").addEventListener("click", () => {
    if (photosMode) { $("photoMany").value = ""; $("photoMany").click(); return; }
    runSession(true);
  });

  /* ---------- Sounds: countdown beeps and a shutter click (Web Audio, no files) ---------- */
  let soundOn = true, actx = null, soundsPlayed = 0;
  try { soundOn = localStorage.getItem("fb-sound") !== "0"; } catch {}
  function anyAudio() {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); return actx; } catch { return null; }
  }
  function audio() { return soundOn ? anyAudio() : null; }
  let master = null; // every booth sound goes through here to your speaker
  function sinkFor(a) { if (!master || master.context !== a) { master = a.createGain(); master.connect(a.destination); } return master; }
  document.addEventListener("pointerdown", () => { if (soundOn) audio(); }, { once: true }); // phones only allow sound after a tap
  function beep(freq = 880, dur = .12, vol = .18) {
    const a = audio(); if (!a) return; soundsPlayed++;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(sinkFor(a)); o.start(t); o.stop(t + dur + .02);
  }
  function motor(sec) {
    const a = audio(); if (!a) return; soundsPlayed++;
    const o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
    o.type = "sawtooth"; o.frequency.value = 92; f.type = "lowpass"; f.frequency.value = 520;
    g.gain.setValueAtTime(0, t);
    for (let k = 0, step = .245; k * step < sec; k++) { g.gain.setValueAtTime(.06, t + k * step); g.gain.setValueAtTime(.015, t + k * step + step * .7); } // stepping feed
    g.gain.setValueAtTime(0, t + sec);
    o.connect(f).connect(g).connect(sinkFor(a)); o.start(t); o.stop(t + sec + .05);
  }
  function shutter() {
    const a = audio(); if (!a) return; soundsPlayed++;
    const len = Math.floor(a.sampleRate * .14), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = "highpass"; f.frequency.value = 1400; g.gain.value = .55;
    src.connect(f).connect(g).connect(sinkFor(a)); src.start();
  }
  function renderSoundBtn() {
    const b = $("soundBtn"); b.classList.toggle("off", !soundOn);
    b.setAttribute("aria-label", soundOn ? "Turn sounds off" : "Turn sounds on"); b.setAttribute("aria-pressed", String(soundOn));
  }
  $("soundBtn").addEventListener("click", () => {
    soundOn = !soundOn; try { localStorage.setItem("fb-sound", soundOn ? "1" : "0"); } catch {}
    renderSoundBtn(); if (soundOn) beep(990, .1); setStatus(soundOn ? "Sounds on." : "Sounds off.");
  });
  renderSoundBtn();

  /* ---------- Motion: confetti when the print is ready ---------- */
  const calm = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function confettiBurst() {
    if (calm()) return;
    const c = document.createElement("canvas"); c.className = "confetti"; c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
    const g = c.getContext("2d"), cols = ["#1F5C4A", "#7CC8AC", "#F2B33D", "#E8536F", "#3A86FF", "#8338EC"], start = performance.now();
    const bits = Array.from({ length: 140 }, (_, k) => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .55, vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: cols[k % cols.length] }));
    (function tick(now) {
      const t = (now - start) / 1000; g.clearRect(0, 0, c.width, c.height);
      bits.forEach((b) => { b.vy += .45; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr; g.save(); g.globalAlpha = Math.max(0, 1 - t / 2.6); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); g.restore(); });
      if (t < 2.6) requestAnimationFrame(tick); else c.remove();
    })(start);
  }

  /* ---------- save / share ---------- */
  function fileName() {
    const d = new Date(), st = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return ((state.caption.trim() || "flashbulb").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "flashbulb") + "-" + st + ".png";
  }
  const isIOS = params.get("ios") === "1" || /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // The finished PNG is made ahead of time: Safari only opens the share sheet if it's called the moment you tap,
  // and making the picture first takes too long.
  function queuePrintFile() {
    clearTimeout(printT); printFile = null;
    printT = setTimeout(() => canvas.toBlob((b) => { if (b) printFile = new File([b], fileName(), { type: "image/png" }); }, "image/png"), 300);
  }
  const canShareFile = (f) => { try { return !!(f && navigator.share && navigator.canShare && navigator.canShare({ files: [f] })); } catch { return false; } };
  // Last resort on iPhone (old iOS, or in-app browsers like Instagram and Messenger): show the picture so you can
  // press and hold it, then tap Save to Photos.
  function holdToSave() {
    const old = document.querySelector(".hold-sheet"); if (old) old.remove();
    const box = document.createElement("div"); box.className = "hold-sheet"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Save your print");
    const img = new Image(); img.alt = "Your print"; img.src = canvas.toDataURL("image/png");
    const p = document.createElement("p"); p.innerHTML = "<b>Press and hold the picture</b>, then tap <b>Save to Photos</b>.";
    const close = document.createElement("button"); close.type = "button"; close.className = "btn"; close.textContent = "Done";
    close.addEventListener("click", () => box.remove());
    box.append(p, img, close); document.body.appendChild(box);
    setStatus("Press and hold your print, then tap Save to Photos.");
  }
  function download(blob, name, what) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); setStatus(`Saved your ${what}.`);
  }
  // On iPhone/iPad the share sheet (Save Image) is the way into Photos; elsewhere a normal download.
  $("saveBtn").addEventListener("click", () => {
    if (isIOS) {
      if (canShareFile(printFile)) {
        navigator.share({ files: [printFile] })
          .then(() => setStatus("Saved. If you don't see it in Photos, tap Save print and choose Save Image."))
          .catch((e) => { if (!e || e.name !== "AbortError") holdToSave(); });
      } else holdToSave();
      return;
    }
    canvas.toBlob((b) => {
      if (!b) { setStatus("Couldn't make the image. Try again.", true); return; }
      download(b, fileName(), "print");
    }, "image/png");
  });
  $("shareImgBtn").addEventListener("click", () => {
    if (canShareFile(printFile)) {
      navigator.share({ files: [printFile] }).catch((e) => { if (e && e.name !== "AbortError") { if (isIOS) holdToSave(); else setStatus("Couldn't share the print.", true); } });
    } else if (isIOS) holdToSave();
    else setStatus("Sharing pictures isn't supported here. Use Save print instead.");
  });
  $("shareBtn").addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}?join=${code}`;
    try { if (navigator.share) { await navigator.share({ title: "Join my photo booth", text: `Join my Flashbulb booth. Code: ${code}`, url }); setStatus("Sent! Keep this page open so your partner can get in."); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); setStatus("Link copied. Send it to your partner, then come back and keep this page open."); } catch { setStatus(`Send your partner this link: ${url}`); }
  });

  /* ---------- leave ---------- */
  function stopAll() {
    leaving = true;
    try { if (call) call.close(); } catch {} try { if (conn) conn.close(); } catch {} try { if (peer) peer.destroy(); } catch {}
    call = conn = peer = null;
    if (localStream) localStream.getTracks().forEach((t) => t.stop()); localStream = null;
    if (camStream) camStream.getTracks().forEach((t) => t.stop()); camStream = null;
    cancelAnimationFrame(fxRaf);
  }
  $("leaveBtn").addEventListener("click", () => { stopAll(); location.href = location.pathname; });
  if (params.get("test") === "1") window.__fbTest = { sounds: () => soundsPlayed, drop() { try { if (conn) conn.close(); } catch (e) {} try { if (call) call.close(); } catch (e) {} }, away() { testAway = true; peer.disconnect(); }, back() { testAway = false; if (peer.disconnected) peer.reconnect(); } };
  window.addEventListener("pagehide", stopAll);

  $("soloBtn").addEventListener("click", () => enterSetup("solo"));
  $("startBtn").addEventListener("click", () => enterSetup("host"));
  $("joinBtn").addEventListener("click", joinBooth);
  $("joinCode").addEventListener("keydown", (e) => { if (e.key === "Enter") joinBooth(); });
  if (params.get("mode") === "photos") startPhotos();
  const pre = (params.get("join") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (pre) { // opened from an invite link: put Join front and centre, so nobody starts a second booth by mistake
    $("joinCode").value = pre; $("inviteCode").textContent = pre; $("invite").hidden = false;
    $("inviteJoin").addEventListener("click", joinBooth); $("inviteJoin").focus();
  }
  if (!window.isSecureContext) lobbyNote("Open this page over https (a secure link) so the camera can turn on.", true);
  function onlineState() {
    const off = !navigator.onLine;
    ["startBtn", "joinBtn", "joinCode"].forEach((id) => { $(id).disabled = off; });
    const n = $("togetherNote"); n.textContent = off ? "You're offline. Together needs internet, but Just me and Use my photos still work." : "Wi-Fi gives the smoothest video.";
    n.classList.toggle("err", off);
  }
  window.addEventListener("online", onlineState); window.addEventListener("offline", onlineState); onlineState();
  // keep the booth available offline after the first visit
  if ("serviceWorker" in navigator && window.isSecureContext && !params.get("nosw")) navigator.serviceWorker.register("sw.js").catch(() => {});

  buildUI(); buildFx(); render();
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 42px "Comfortaa"'), document.fonts.load('500 16px "Urbanist"'), ...DESIGN_FONTS.map((f) => document.fonts.load(f).catch(() => {}))]).then(() => { render(); buildDesigns(); }, () => {});
})();
