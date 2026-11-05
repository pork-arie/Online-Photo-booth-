// Print designs: how the strip looks around your photos. Each design can paint the background, frame each photo,
// add details on top, and set the caption. Everything is drawn in print pixels on a 2D canvas.
(() => {
  const rr = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); };
  // largest font size (down to `min`) that fits `text` in `maxW`
  function fit(g, text, maxW, size, font, min = 14) {
    let s = size; g.font = font(s);
    while (text && g.measureText(text).width > maxW && s > min) { s -= 1; g.font = font(s); }
    return s;
  }
  const spaced = (t) => t.split("").join(String.fromCharCode(8202)); // hair spaces = light letter spacing everywhere
  const monthDate = () => new Date().toLocaleDateString("en", { day: "2-digit", month: "long", year: "numeric" });

  const DESIGNS = {
    // The original look: your frame color (or a season), rounded type with a marker highlight.
    classic: { label: "Classic", hint: "Your frame color or a season" },

    // Clean white card, soft shadows, rounded photos, small spaced type.
    modern: {
      label: "Modern", hint: "Soft shadows, rounded photos",
      shot(g, r, i, draw, f) {
        g.save(); g.shadowColor = "rgba(20,24,22,.18)"; g.shadowBlur = 26; g.shadowOffsetY = 10; g.fillStyle = f.bg; rr(g, r.x, r.y, r.w, r.h, 20); g.fill(); g.restore();
        g.save(); rr(g, r.x, r.y, r.w, r.h, 20); g.clip(); draw(); g.restore();
      },
      footer(g, sp, f, cap, date, big) {
        const cx = sp.W / 2, y = sp.footY + sp.foot * .5;
        g.fillStyle = f.ink; g.globalAlpha = .25; g.fillRect(cx - 22, sp.footY + sp.foot * .2, 44, 3); g.globalAlpha = 1;
        g.textAlign = "center"; g.textBaseline = "alphabetic";
        if (cap) { const t = spaced(cap.toUpperCase()); fit(g, t, sp.W - 90, Math.round(big * .62), (s) => `700 ${s}px "Urbanist", sans-serif`); g.fillText(t, cx, y); }
        if (date) { g.font = `500 ${Math.round(big * .3)}px "Urbanist", sans-serif`; g.globalAlpha = .5; g.fillText(spaced(date.toUpperCase()), cx, y + big * .62); g.globalAlpha = 1; }
      },
    },

    // Raw and loud: heavy borders, hard shadows, numbered frames, big black type.
    brutalist: {
      label: "Brutalist", hint: "Heavy borders, hard shadows", palette: { bg: "#ECEAE3", ink: "#0B0B0B", hl: "#FF4D00" },
      background(g, sp, f) { g.fillStyle = f.bg; g.fillRect(0, 0, sp.W, sp.H); g.strokeStyle = f.ink; g.lineWidth = 10; g.strokeRect(5, 5, sp.W - 10, sp.H - 10); },
      shot(g, r, i, draw, f) { g.fillStyle = f.ink; g.fillRect(r.x + 9, r.y + 9, r.w, r.h); draw(); g.strokeStyle = f.ink; g.lineWidth = 5; g.strokeRect(r.x + 2.5, r.y + 2.5, r.w - 5, r.h - 5); },
      over(g, r, i, f) {
        g.fillStyle = f.ink; g.fillRect(r.x, r.y, 58, 34);
        g.fillStyle = "#fff"; g.font = `700 20px "Space Mono", monospace`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(String(i + 1).padStart(2, "0"), r.x + 11, r.y + 18);
      },
      footer(g, sp, f, cap, date, big) {
        const m = sp.slots[0].x, y = sp.footY + sp.foot * .55;
        g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = f.ink;
        if (cap) {
          const t = cap.toUpperCase(), s = fit(g, t, sp.W - m * 2, Math.round(big * 1.05), (n) => `400 ${n}px "Archivo Black", "Arial Black", sans-serif`);
          const w = g.measureText(t).width; g.fillStyle = f.hl; g.fillRect(m, y + s * .12, Math.min(w, sp.W - m * 2), Math.max(8, s * .18)); g.fillStyle = f.ink; g.fillText(t, m, y);
        }
        if (date) { g.font = `700 ${Math.round(big * .32)}px "Space Mono", monospace`; g.textAlign = "right"; g.fillText(date.toUpperCase(), sp.W - m, sp.H - 24); }
      },
    },

    // Magazine feel: thin rules and an italic serif caption.
    editorial: {
      label: "Editorial", hint: "Thin rules, italic serif", palette: { bg: "#FBFBF8", ink: "#141414", hl: "#141414" },
      over(g, r, i, f) { g.strokeStyle = f.ink; g.lineWidth = 1.2; g.strokeRect(r.x - 7, r.y - 7, r.w + 14, r.h + 14); },
      footer(g, sp, f, cap, date, big) {
        const cx = sp.W / 2, m = sp.slots[0].x;
        g.fillStyle = f.ink; g.fillRect(m, sp.footY + 22, sp.W - m * 2, 1.2);
        g.textAlign = "center"; g.textBaseline = "alphabetic";
        if (cap) { fit(g, cap, sp.W - m * 2, Math.round(big * 1.25), (s) => `italic 400 ${s}px "Instrument Serif", Georgia, serif`); g.fillText(cap, cx, sp.footY + sp.foot * .56); }
        g.font = `600 ${Math.round(big * .27)}px "Urbanist", sans-serif`; g.globalAlpha = .65;
        g.fillText(spaced(`No. ${String(new Date().getDate()).padStart(2, "0")}${date ? "  ·  " + monthDate().toUpperCase() : ""}`), cx, sp.footY + sp.foot * .82); g.globalAlpha = 1;
      },
    },

    // A strip of film: black stock, sprocket holes, orange edge numbers.
    film: {
      label: "Film", hint: "Sprocket holes, edge numbers", palette: { bg: "#141313", ink: "#F3EBDD", hl: "#E0702A" },
      background(g, sp, f) {
        g.fillStyle = f.bg; g.fillRect(0, 0, sp.W, sp.H);
        g.fillStyle = "#EDE6DA";
        for (let y = 12; y < sp.H - 20; y += 34) { rr(g, 9, y, 15, 21, 4); g.fill(); rr(g, sp.W - 24, y, 15, 21, 4); g.fill(); }
      },
      over(g, r, i, f) {
        g.save(); g.fillStyle = f.hl; g.font = `700 11px "Space Mono", monospace`; g.textBaseline = "middle";
        g.translate(sp_W(g) - 30, r.y + 30); g.rotate(Math.PI / 2); g.fillText(`${12 + i}  ▸  ${12 + i}A`, 0, 0); g.restore();
      },
      footer(g, sp, f, cap, date, big) {
        const cx = sp.W / 2; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = f.ink;
        if (cap) { fit(g, cap.toUpperCase(), sp.W - 110, Math.round(big * .62), (s) => `700 ${s}px "Space Mono", monospace`); g.fillText(cap.toUpperCase(), cx, sp.footY + sp.foot * .5); }
        g.fillStyle = f.hl; g.font = `700 ${Math.round(big * .28)}px "Space Mono", monospace`;
        g.fillText(`FLASHBULB 400${date ? "  ▸  " + date.toUpperCase() : ""}`, cx, sp.footY + sp.foot * .78);
      },
    },

    // Little instant photos on a table, each a bit tilted, with a handwritten caption.
    instant: {
      label: "Instant", hint: "Tilted snapshots, handwriting", palette: { bg: "#E7E2DA", ink: "#2B2723", hl: "#FFE08A" },
      shot(g, r, i, draw) {
        const a = (i % 2 ? 1 : -1) * .022, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        g.save(); g.translate(cx, cy); g.rotate(a); g.translate(-cx, -cy);
        g.save(); g.shadowColor = "rgba(0,0,0,.22)"; g.shadowBlur = 16; g.shadowOffsetY = 6; g.fillStyle = "#FFFFFF"; g.fillRect(r.x - 11, r.y - 11, r.w + 22, r.h + 30); g.restore();
        draw(); g.restore();
      },
      footer(g, sp, f, cap, date, big) {
        const cx = sp.W / 2; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = f.ink;
        if (cap) { fit(g, cap, sp.W - 80, Math.round(big * 1.35), (s) => `700 ${s}px "Caveat", "Comic Sans MS", cursive`); g.fillText(cap, cx, sp.footY + sp.foot * .6); }
        if (date) { g.font = `500 ${Math.round(big * .55)}px "Caveat", cursive`; g.globalAlpha = .7; g.fillText(monthDate(), cx, sp.footY + sp.foot * .88); g.globalAlpha = 1; }
      },
    },

    // Night out: dark grid, glowing pink and cyan frames.
    neon: {
      label: "Neon", hint: "Dark grid, glowing frames", palette: { bg: "#0D0B14", ink: "#F6F3FF", hl: "#FF2E88" },
      background(g, sp, f) {
        g.fillStyle = f.bg; g.fillRect(0, 0, sp.W, sp.H); g.strokeStyle = "rgba(160,140,255,.09)"; g.lineWidth = 1;
        for (let x = 0; x < sp.W; x += 32) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, sp.H); g.stroke(); }
        for (let y = 0; y < sp.H; y += 32) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(sp.W, y + .5); g.stroke(); }
      },
      shot(g, r, i, draw) { g.save(); rr(g, r.x, r.y, r.w, r.h, 12); g.clip(); draw(); g.restore(); },
      over(g, r, i) {
        const col = i % 2 ? "#23E5FF" : "#FF2E88";
        g.save(); g.shadowColor = col; g.shadowBlur = 22; g.strokeStyle = col; g.lineWidth = 4; rr(g, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 14); g.stroke(); g.stroke(); g.restore();
      },
      footer(g, sp, f, cap, date, big) {
        const cx = sp.W / 2; g.textAlign = "center"; g.textBaseline = "alphabetic";
        if (cap) {
          fit(g, cap, sp.W - 80, Math.round(big * .95), (s) => `700 ${s}px "Comfortaa", sans-serif`);
          g.save(); g.shadowColor = f.hl; g.shadowBlur = 24; g.fillStyle = f.ink; g.fillText(cap, cx, sp.footY + sp.foot * .55); g.fillText(cap, cx, sp.footY + sp.foot * .55); g.restore();
        }
        if (date) { g.save(); g.font = `700 ${Math.round(big * .3)}px "Space Mono", monospace`; g.fillStyle = "#23E5FF"; g.shadowColor = "#23E5FF"; g.shadowBlur = 12; g.fillText(date.toUpperCase(), cx, sp.footY + sp.foot * .82); g.restore(); }
      },
    },
  };
  // film edge numbers need the print width; the canvas being drawn on carries it
  function sp_W(g) { return g.canvas.width / (g.getTransform ? g.getTransform().a || 1 : 1); }
  const DESIGN_FONTS = ['400 40px "Archivo Black"', '700 20px "Space Mono"', 'italic 400 40px "Instrument Serif"', '700 40px "Caveat"'];

  Object.assign(window.FB = window.FB || {}, { DESIGNS, DESIGN_FONTS });
})();
