// Print looks: layouts, film filters, frame colors and season themes (pure drawing, no app state).
(() => {
  const LAYOUTS = {
    strip:    { label: "Strip", sub: "4", n: 4 },
    grid:     { label: "Grid", sub: "2×2", n: 4 },
    polaroid: { label: "Instant", sub: "1", n: 1 },
  };
  const FILTERS = { none: "Natural", mono: "Silver", sepia: "Sepia", film: "Faded film", cool: "Cool", punch: "Vivid" };
  const FRAMES = [
    { name: "Paper", bg: "#FAFAF7", ink: "#1A1C1B", hl: "#FFE27A" },
    { name: "Onyx",  bg: "#141615", ink: "#EDEDE8", hl: "#2F6B57" },
    { name: "Blush", bg: "#EED9D5", ink: "#4A2A2A", hl: "#F6A9B8" },
    { name: "Sage",  bg: "#D5DFD6", ink: "#20352B", hl: "#9FD1B3" },
    { name: "Sand",  bg: "#E7DDCB", ink: "#3D3222", hl: "#F2C66A" },
    { name: "Navy",  bg: "#1D2A3F", ink: "#E8E2D4", hl: "#3E5F92" },
  ];

  /* ---------- Film looks ---------- */
  function applyFilter(g, w, h, name) {
    if (name === "none") return;
    const img = g.getImageData(0, 0, w, h), d = img.data;
    const cl = (v) => v < 0 ? 0 : v > 255 ? 255 : v;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], gr = d[i + 1], b = d[i + 2];
      const l = 0.299 * r + 0.587 * gr + 0.114 * b;
      if (name === "mono") { const v = (l - 128) * 1.15 + 132; r = v; gr = v; b = v * 1.02; }
      else if (name === "sepia") { const nr = r * .393 + gr * .769 + b * .189, ng = r * .349 + gr * .686 + b * .168, nb = r * .272 + gr * .534 + b * .131; r = nr; gr = ng; b = nb; }
      else if (name === "film") { r = (r * 1.05 + 10) * .87 + 22; gr = (gr + 5) * .87 + 22; b = (b * .88 + 16) * .87 + 24; }
      else if (name === "cool") { r = r * .9; gr = gr + 4; b = b * 1.08 + 14; }
      else if (name === "punch") {
        r = l + (r - l) * 1.3; gr = l + (gr - l) * 1.3; b = l + (b - l) * 1.3;
        r = (r - 128) * 1.15 + 128; gr = (gr - 128) * 1.15 + 128; b = (b - 128) * 1.15 + 128;
      }
      d[i] = cl(r); d[i + 1] = cl(gr); d[i + 2] = cl(b);
    }
    g.putImageData(img, 0, 0);
  }

  /* ---------- Season themes: patterned print backgrounds ---------- */
  function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function star(g, x, y, r, inner, rot = -Math.PI / 2) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
  }
  function heart(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y + s * .35);
    g.bezierCurveTo(x - s * 1.1, y - s * .45, x - s * .45, y - s * 1.05, x, y - s * .45);
    g.bezierCurveTo(x + s * .45, y - s * 1.05, x + s * 1.1, y - s * .45, x, y + s * .35); g.closePath();
  }
  const THEMES = {
    none: { label: "None" },
    pasko: { label: "Pasko", bg: ["#17402F", "#0E2A1F"], ink: "#F7ECCF", hl: "#B3242E", months: [9, 11, 12],
      draw(g, W, H, R, k) {
        g.fillStyle = "rgba(255,255,255,.55)";
        for (let i = 0; i < W * H / 2200; i++) { g.globalAlpha = .25 + R() * .5; g.beginPath(); g.arc(R() * W, R() * H, (1 + R() * 2.4) * k, 0, 7); g.fill(); }
        g.globalAlpha = 1;
        const n = Math.max(6, Math.round(W * H / 42000));
        for (let i = 0; i < n; i++) {
          const x = R() * W, y = R() * H, r = (16 + R() * 14) * k, rot = -Math.PI / 2 + (R() - .5) * .4;
          g.strokeStyle = "#E3B341"; g.lineWidth = 1.6 * k;
          for (let t = -1; t <= 1; t++) { g.beginPath(); g.moveTo(x + t * r * .25, y + r * .7); g.quadraticCurveTo(x + t * r * .5 + r * .2, y + r * 1.5, x + t * r * .3, y + r * 2.1); g.stroke(); }
          g.fillStyle = "#E3B341"; star(g, x, y, r, .45, rot); g.fill();
          g.fillStyle = "#C8202F"; star(g, x, y, r * .62, .45, rot); g.fill();
          g.fillStyle = "#FFE9A8"; g.beginPath(); g.arc(x, y, r * .16, 0, 7); g.fill();
        }
      } },
    valentine: { label: "Valentine", bg: ["#FBE3E8", "#F4C3CE"], ink: "#5A1A2A", hl: "#FF9DB0", months: [2],
      draw(g, W, H, R, k) {
        const cols = ["#E8536F", "#F28AA0", "#FFFFFF", "#C9334F"];
        for (let i = 0; i < W * H / 5200; i++) { g.globalAlpha = .55 + R() * .4; g.fillStyle = cols[i % 4]; heart(g, R() * W, R() * H, (6 + R() * 14) * k); g.fill(); }
        g.globalAlpha = 1;
      } },
    summer: { label: "Summer", bg: ["#FFF0C7", "#9ED8E8"], ink: "#0F3B4A", hl: "#FFC94A", months: [3, 4, 5],
      draw(g, W, H, R, k) {
        for (let i = 0; i < Math.max(4, W * H / 70000); i++) {
          const x = R() * W, y = R() * H * .55, r = (12 + R() * 10) * k;
          g.strokeStyle = "#FFB627"; g.lineWidth = 2.4 * k; g.lineCap = "round";
          for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6; g.beginPath(); g.moveTo(x + Math.cos(t) * r * 1.35, y + Math.sin(t) * r * 1.35); g.lineTo(x + Math.cos(t) * r * 1.75, y + Math.sin(t) * r * 1.75); g.stroke(); }
          g.fillStyle = "#FFB627"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        }
        g.lineWidth = 2.2 * k; g.lineCap = "round";
        for (let i = 0; i < W * H / 9000; i++) {
          const x = R() * W, y = H * .35 + R() * H * .65, w = (26 + R() * 30) * k;
          g.strokeStyle = R() > .5 ? "rgba(255,255,255,.85)" : "rgba(20,120,150,.45)";
          g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + w * .25, y - 7 * k, x + w * .5, y + 7 * k, x + w * .75, y); g.quadraticCurveTo(x + w * .9, y - 4 * k, x + w, y); g.stroke();
        }
      } },
    spring: { label: "Spring", bg: ["#F2F8EB", "#DDEED3"], ink: "#23402E", hl: "#F7C1D9", months: [],
      draw(g, W, H, R, k) {
        const cols = ["#F7A8C4", "#FFD166", "#C3B1E1", "#FFFFFF"];
        for (let i = 0; i < W * H / 6500; i++) {
          const x = R() * W, y = R() * H, r = (5 + R() * 8) * k, rot = R() * 6;
          g.fillStyle = "rgba(90,150,90,.45)"; g.beginPath(); g.ellipse(x + r * 1.6, y + r * 1.2, r * .9, r * .4, rot, 0, 7); g.fill();
          g.fillStyle = cols[i % 4];
          for (let p = 0; p < 5; p++) { const a = rot + p * Math.PI * 2 / 5; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * .72, 0, 7); g.fill(); }
          g.fillStyle = "#F2A541"; g.beginPath(); g.arc(x, y, r * .5, 0, 7); g.fill();
        }
      } },
    halloween: { label: "Halloween", bg: ["#251C30", "#140F1B"], ink: "#F6DDB4", hl: "#B9541A", months: [10],
      draw(g, W, H, R, k) {
        g.fillStyle = "#F6DDB4";
        for (let i = 0; i < W * H / 3500; i++) { g.globalAlpha = .2 + R() * .5; g.beginPath(); g.arc(R() * W, R() * H, (.8 + R() * 1.6) * k, 0, 7); g.fill(); }
        g.globalAlpha = 1;
        for (let i = 0; i < W * H / 26000; i++) {
          const x = R() * W, y = R() * H, r = (11 + R() * 9) * k;
          if (R() > .45) {
            g.fillStyle = "#E7792B"; [-.55, 0, .55].forEach((o) => { g.beginPath(); g.ellipse(x + o * r, y, r * .62, r * .85, 0, 0, 7); g.fill(); });
            g.fillStyle = "#4E7A3A"; g.fillRect(x - r * .1, y - r * 1.15, r * .2, r * .4);
            g.fillStyle = "#3A1C08"; star(g, x - r * .35, y - r * .15, r * .16, .9, 0); g.fill(); star(g, x + r * .35, y - r * .15, r * .16, .9, 0); g.fill();
          } else {
            g.fillStyle = "#4A3A5C"; g.beginPath(); g.moveTo(x, y);
            g.quadraticCurveTo(x - r * .6, y - r * .8, x - r * 1.6, y - r * .3); g.quadraticCurveTo(x - r * 1.1, y - r * .1, x - r * 1.2, y + r * .3);
            g.quadraticCurveTo(x - r * .6, y, x, y + r * .25); g.quadraticCurveTo(x + r * .6, y, x + r * 1.2, y + r * .3);
            g.quadraticCurveTo(x + r * 1.1, y - r * .1, x + r * 1.6, y - r * .3); g.quadraticCurveTo(x + r * .6, y - r * .8, x, y); g.fill();
          }
        }
      } },
    newyear: { label: "New Year", bg: ["#18203A", "#0C1020"], ink: "#F3E7C6", hl: "#8C6A22", months: [1],
      draw(g, W, H, R, k) {
        for (let i = 0; i < Math.max(4, W * H / 60000); i++) {
          const x = R() * W, y = R() * H, r = (22 + R() * 18) * k, col = ["#C9A24A", "#E57F84", "#7FB3D5"][i % 3];
          g.strokeStyle = col; g.lineWidth = 1.6 * k; g.lineCap = "round";
          for (let a = 0; a < 16; a++) { const t = a * Math.PI / 8; g.beginPath(); g.moveTo(x + Math.cos(t) * r * .35, y + Math.sin(t) * r * .35); g.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); g.stroke(); }
        }
        const cols = ["#C9A24A", "#E8D9A8", "#7FB3D5", "#E57F84"];
        for (let i = 0; i < W * H / 3200; i++) {
          g.save(); g.translate(R() * W, R() * H); g.rotate(R() * 6); g.fillStyle = cols[i % 4]; g.globalAlpha = .55 + R() * .45;
          g.fillRect(-3 * k, -1.2 * k, 6 * k, 2.4 * k); g.restore();
        }
        g.fillStyle = "#E8D9A8"; for (let i = 0; i < W * H / 50000; i++) { star(g, R() * W, R() * H, (4 + R() * 4) * k, .4); g.fill(); }
      } },
  };
  function seasonNow() {
    const m = new Date().getMonth() + 1;
    return Object.keys(THEMES).find((key) => (THEMES[key].months || []).includes(m)) || null;
  }

  function paintBackground(g, W, H, frame, k) {
    const t = frame.theme && THEMES[frame.theme];
    if (!t) { g.fillStyle = frame.bg; g.fillRect(0, 0, W, H); return; }
    const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, t.bg[0]); lg.addColorStop(1, t.bg[1]);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    g.save(); t.draw(g, W, H, rng(7 + W + H), k); g.restore();
  }

  Object.assign(window.FB = window.FB || {}, { LAYOUTS, FILTERS, FRAMES, applyFilter, rng, star, heart, THEMES, seasonNow, paintBackground });
})();
