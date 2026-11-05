// Face sticker artwork: Fluent 3D accessories, Noto animated emoji and drawn stickers.
(() => {
  const FL = (n) => `assets/stickers/fluent/${n}.png`, NI = (n) => `assets/stickers/noto/${n}-icon.png`;
  const FX = [ // [id, label, button icon (image path or emoji)]
    ["none", "Off", "🚫"],
    ["crown", "Crown", FL("crown")], ["shades", "Shades", FL("sunglasses")], ["glasses", "Glasses", FL("glasses")],
    ["tophat", "Top hat", FL("top_hat")], ["cap", "Cap", FL("billed_cap")], ["grad", "Grad cap", FL("graduation_cap")],
    ["sunhat", "Sun hat", FL("womans_hat")], ["bow", "Bow", FL("ribbon")], ["flowers", "Flowers", FL("cherry_blossom")],
    ["love", "In love", NI("sparkling_heart")], ["party", "Party", NI("party_popper")], ["dizzy", "Dizzy", NI("dizzy")],
    ["sparkle", "Sparkle", NI("sparkles")], ["fire", "On fire", NI("fire")], ["butterflies", "Butterflies", NI("butterfly")],
    ["puppy", "Puppy", "🐶"], ["kitty", "Kitty", "🐱"], ["santa", "Santa hat", "🎅"],
  ];
  // Noto animations are stored as strips of frames: frame count, frame size and time per frame.
  const ANIM = { sparkling_heart: 50, party_popper: 69, dizzy: 59, glowing_star: 89, sparkles: 101, fire: 54, butterfly: 139, red_heart: 92 };
  const imgCache = {};
  function img(src) {
    let im = imgCache[src];
    if (!im) { im = new Image(); im.decoding = "async"; im.src = src; imgCache[src] = im; }
    return im.complete && im.naturalWidth ? im : null;
  }
  const NEEDS = {
    crown: [FL("crown")], shades: [FL("sunglasses")], glasses: [FL("glasses")], tophat: [FL("top_hat")], cap: [FL("billed_cap")],
    grad: [FL("graduation_cap")], sunhat: [FL("womans_hat")], bow: [FL("ribbon")], flowers: [FL("cherry_blossom"), FL("hibiscus"), FL("blossom")],
    love: ["sparkling_heart", "red_heart"], party: ["party_popper"], dizzy: ["dizzy", "glowing_star"], sparkle: ["sparkles"], fire: ["fire"], butterflies: ["butterfly"],
  };
  const sheet = (name) => `assets/stickers/noto/${name}.webp`;
  function preloadSticker(k) { (NEEDS[k] || []).forEach((x) => img(x.includes("/") ? x : sheet(x))); }
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  // ---- sticker drawings, in face space: origin between the eyes, x along the eyes, e = distance between the eyes ----
  function emoji(g, ch, x, y, size, rot = 0) {
    g.save(); g.translate(x, y); if (rot) g.rotate(rot);
    g.font = `${Math.round(size)}px ${EMOJI_FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, 0, 0); g.restore();
  }
  function heartPath(g, x, y, s) {
    g.beginPath(); g.moveTo(x, y + s * .35);
    g.bezierCurveTo(x - s * 1.1, y - s * .45, x - s * .45, y - s * 1.05, x, y - s * .45);
    g.bezierCurveTo(x + s * .45, y - s * 1.05, x + s * 1.1, y - s * .45, x, y + s * .35); g.closePath();
  }
  // Content box of each Fluent image (fractions of the image), so accessories line up by what's drawn, not by empty space.
  const BOX = {
    crown: [.066, .22, .937, .934], sunglasses: [.059, .313, .938, .66], glasses: [.063, .313, .938, .656], top_hat: [.066, .121, .934, .941],
    billed_cap: [.055, .195, .938, .785], graduation_cap: [.063, .16, .938, .941], womans_hat: [.063, .309, .938, .938], ribbon: [.059, .191, .938, .938],
  };
  // Place a Fluent accessory: `w` is its drawn width in eye-distances; anchor "bottom" puts its lowest edge at y, "center" centres it on y.
  function wear(g, name, f, w, y, anchor = "bottom", x = 0, rot = 0) {
    const im = img(FL(name)); if (!im) return;
    const [x1, y1, x2, y2] = BOX[name] || [0, 0, 1, 1], sc = (w * f.e) / ((x2 - x1) * im.naturalWidth);
    const W = im.naturalWidth * sc, H = im.naturalHeight * sc, cx = ((x1 + x2) / 2) * W, cy = anchor === "bottom" ? y2 * H : ((y1 + y2) / 2) * H;
    g.save(); g.translate(x, y * f.e); if (rot) g.rotate(rot); g.drawImage(im, -cx, -cy, W, H); g.restore();
  }
  // Draw one frame of a Noto animation strip, centred at (x, y), `size` pixels wide.
  function anim(g, name, x, y, size, t, phase = 0, flip = false) {
    const im = img(sheet(name)); if (!im) return;
    const fs = im.naturalHeight, n = Math.round(im.naturalWidth / fs), k = Math.floor(t * 1000 / ANIM[name] + phase * n) % n;
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(im, k * fs, 0, fs, fs, -size / 2, -size / 2, size, size); g.restore();
  }
  const STICKERS = {
    crown(g, f, t) { wear(g, "crown", f, 1.95, -1.22 + Math.sin(t * 3) * .03); },
    shades(g, f) { wear(g, "sunglasses", f, 2.35, .04, "center"); },
    glasses(g, f) { wear(g, "glasses", f, 2.25, .04, "center"); },
    tophat(g, f) { wear(g, "top_hat", f, 2.15, -1.1); },
    cap(g, f) { wear(g, "billed_cap", f, 2.5, -.62); },
    grad(g, f) { wear(g, "graduation_cap", f, 2.3, -.95); },
    sunhat(g, f) { wear(g, "womans_hat", f, 2.8, -.75); },
    bow(g, f, t) { wear(g, "ribbon", f, 1.25, -1.1, "bottom", .85 * f.e, .3 + Math.sin(t * 2) * .03); },
    flowers(g, f) {
      const list = ["cherry_blossom", "hibiscus", "blossom", "cherry_blossom", "blossom", "hibiscus", "cherry_blossom"];
      list.forEach((n, k) => {
        const im = img(FL(n)); if (!im) return;
        const a = Math.PI * (1.12 + k * .76 / (list.length - 1)), r = 1.3 * f.e, size = .78 * f.e;
        g.save(); g.translate(Math.cos(a) * r, -.3 * f.e + Math.sin(a) * r * .75); g.rotate((k - 3) * .15); g.drawImage(im, -size / 2, -size / 2, size, size); g.restore();
      });
    },
    love(g, f, t) {
      const e = f.e;
      [-1, 1].forEach((sd, k) => anim(g, "sparkling_heart", sd * .5 * e, .02 * e, .82 * e, t, k * .5));
      for (let k = 0; k < 4; k++) {
        const ph = (t * .4 + k / 4) % 1;
        g.globalAlpha = 1 - ph; anim(g, "red_heart", (k - 1.5) * .8 * e + Math.sin(t * 2 + k) * .12 * e, -.8 * e - ph * 1.8 * e, .62 * e, t, k / 4);
      }
      g.globalAlpha = 1;
    },
    party(g, f, t) {
      const e = f.e;
      anim(g, "party_popper", -1.6 * e, -1.05 * e, 1.55 * e, t, 0, true);
      anim(g, "party_popper", 1.6 * e, -1.05 * e, 1.55 * e, t, .5);
      const cols = ["#FF006E", "#FFBE0B", "#3A86FF", "#8338EC", "#06D6A0"];
      for (let k = 0; k < 16; k++) {
        const ph = (t * .35 + k / 16) % 1, x = ((k * 37) % 32 - 16) / 16 * 1.9 * e, y = -2.4 * e + ph * 3.4 * e;
        g.save(); g.translate(x, y); g.rotate(t * 3 + k); g.fillStyle = cols[k % 5]; g.fillRect(-.07 * e, -.03 * e, .14 * e, .06 * e); g.restore();
      }
    },
    dizzy(g, f, t) {
      const e = f.e;
      for (let k = 0; k < 5; k++) {
        const a = t * 2 + k * Math.PI * 2 / 5, depth = (Math.sin(a) + 1) / 2;
        g.globalAlpha = .6 + depth * .4;
        anim(g, k % 2 ? "glowing_star" : "dizzy", Math.cos(a) * 1.45 * e, -1.25 * e + Math.sin(a) * .35 * e, (.7 + depth * .25) * e, t, k / 5);
      }
      g.globalAlpha = 1;
    },
    sparkle(g, f, t) {
      const e = f.e;
      [-1, 1].forEach((sd) => {
        const gr = g.createRadialGradient(sd * .78 * e, f.nd + .1 * e, 0, sd * .78 * e, f.nd + .1 * e, .42 * e);
        gr.addColorStop(0, "rgba(255,105,140,.45)"); gr.addColorStop(1, "rgba(255,105,140,0)"); g.fillStyle = gr;
        g.beginPath(); g.arc(sd * .78 * e, f.nd + .1 * e, .42 * e, 0, 7); g.fill();
      });
      [[-1.35, -.75, 0], [1.3, -.95, .33], [1.4, .3, .66], [-1.25, .55, .2]].forEach(([x, y, ph]) => anim(g, "sparkles", x * e, y * e, .95 * e, t, ph));
    },
    fire(g, f, t) { [[-.8, -1.6, 1.1, 0], [0, -1.95, 1.45, .4], [.8, -1.6, 1.1, .7]].forEach(([x, y, sz, ph]) => anim(g, "fire", x * f.e, y * f.e, sz * f.e, t, ph)); },
    butterflies(g, f, t) {
      const e = f.e;
      for (let k = 0; k < 3; k++) {
        const a = t * (.8 + k * .15) + k * 2.1;
        anim(g, "butterfly", Math.cos(a) * 1.6 * e, -.9 * e + Math.sin(a * 1.6) * .75 * e, 1.05 * e, t, k / 3, Math.sin(a) > 0);
      }
    },
    puppy(g, f, t) {
      const e = f.e;
      [-1, 1].forEach((s) => {
        g.save(); g.translate(s * 1.0 * e, -1.05 * e); g.rotate(s * (0.35 + Math.sin(t * 4) * 0.06));
        g.fillStyle = "#7A4A24"; g.beginPath(); g.ellipse(0, 0, .4 * e, .7 * e, 0, 0, 7); g.fill();
        g.fillStyle = "#C68B59"; g.beginPath(); g.ellipse(0, .08 * e, .22 * e, .45 * e, 0, 0, 7); g.fill(); g.restore();
      });
      g.fillStyle = "#1A1A1A"; g.beginPath(); g.ellipse(0, f.nd - .02 * e, .3 * e, .2 * e, 0, 0, 7); g.fill();
      g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(-.1 * e, f.nd - .08 * e, .08 * e, .05 * e, 0, 0, 7); g.fill();
      const ty = f.md + .04 * e, tl = .26 * e + Math.sin(t * 5) * .04 * e;
      g.fillStyle = "#F06B8B"; g.beginPath(); g.ellipse(0, ty + tl / 2, .2 * e, tl / 2 + .05 * e, 0, 0, 7); g.fill();
      g.strokeStyle = "#C94A69"; g.lineWidth = .03 * e; g.beginPath(); g.moveTo(0, ty); g.lineTo(0, ty + tl * .7); g.stroke();
    },
    kitty(g, f, t) {
      const e = f.e;
      [-1, 1].forEach((s) => {
        g.save(); g.translate(s * .85 * e, -1.15 * e); g.rotate(s * .25);
        g.fillStyle = "#5E5E66"; g.beginPath(); g.moveTo(-.38 * e, .3 * e); g.lineTo(0, -.55 * e); g.lineTo(.38 * e, .3 * e); g.closePath(); g.fill();
        g.fillStyle = "#F4A6B8"; g.beginPath(); g.moveTo(-.2 * e, .2 * e); g.lineTo(0, -.3 * e); g.lineTo(.2 * e, .2 * e); g.closePath(); g.fill(); g.restore();
      });
      g.fillStyle = "#F4A6B8"; g.beginPath(); g.moveTo(-.13 * e, f.nd - .1 * e); g.lineTo(.13 * e, f.nd - .1 * e); g.lineTo(0, f.nd + .04 * e); g.closePath(); g.fill();
      g.lineCap = "round";
      [-1, 1].forEach((s) => [-.12, .04, .2].forEach((dy, k) => {
        g.strokeStyle = "rgba(30,30,30,.85)"; g.lineWidth = .045 * e;
        g.beginPath(); g.moveTo(s * .3 * e, f.nd + .08 * e); g.lineTo(s * 1.25 * e, f.nd + (dy + (k - 1) * .06) * e + Math.sin(t * 3 + k) * .02 * e); g.stroke();
      }));
    },
    santa(g, f, t) {
      const e = f.e, sway = Math.sin(t * 2.5) * .08;
      g.save(); g.translate(0, -1.15 * e);
      g.fillStyle = "#D62828"; g.beginPath(); g.moveTo(-1.0 * e, 0); g.quadraticCurveTo(-.4 * e, -1.4 * e, .9 * e + sway * e, -1.05 * e); g.quadraticCurveTo(.5 * e, -.5 * e, 1.0 * e, 0); g.closePath(); g.fill();
      g.fillStyle = "#FFFFFF"; g.beginPath(); g.roundRect ? g.roundRect(-1.1 * e, -.12 * e, 2.2 * e, .36 * e, .18 * e) : g.rect(-1.1 * e, -.12 * e, 2.2 * e, .36 * e); g.fill();
      g.beginPath(); g.arc(.95 * e + sway * e, -1.05 * e, .2 * e, 0, 7); g.fill(); g.restore();
    },
  };

  Object.assign(window.FB = window.FB || {}, { FL, FX, ANIM, imgCache, img, NEEDS, sheet, preloadSticker, EMOJI_FONT, emoji, heartPath, BOX, wear, anim, STICKERS, NI });
})();
