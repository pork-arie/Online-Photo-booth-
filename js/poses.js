// Pose guide artwork: classic emoji poses and line-drawn meme poses, solo and duo.
(() => {
  /* ---------- Pose guide: Off / Classic (emoji) / Meme (line drawings) ---------- */
  const CLASSIC = [
    ["✌️", "Peace sign", "The classic. Tilt your head a little."],
    ["🫰", "Finger heart", "Cross your thumb and index finger."],
    ["🫶", "Heart hands", "Make one big heart together."],
    ["😂", "Fake candid laugh", "Look away and laugh at nothing."],
    ["🤨", "Side-eye", "Slowly look at the person next to you."],
    ["👉", "Point at each other", "Everyone points. Who's the real one?"],
    ["😱", "Shocked", "Hands on cheeks, mouth wide open."],
    ["😐", "Serious squad", "No smiling. Stare straight into the lens."],
    ["💅", "Main character", "Hand on chin, glamour face, chin up."],
    ["🐰", "Bunny ears", "Sneak them behind someone's head."],
    ["😘", "Blow a kiss", "Send it straight to the camera."],
    ["🙈", "Too shy", "Cover your face, peek through your fingers."],
  ];
  // Meme poses drawn as simple outline figures. Arms are [shoulder, elbow, hand] points in a 100×100 box.
  const MEME = [
    { name: "Heart hands", tip: "Make a heart over your chest. Soft eyes.", mouth: "smile",
      arms: [[[34, 50], [27, 70], [45, 61]], [[66, 50], [73, 70], [55, 61]]], extra: "heart" },
    { name: "Who, me?", tip: "Point at your own chest. Smug little smile.", mouth: "smirk",
      arms: [[[34, 50], [29, 74], [33, 96]], [[66, 50], [72, 76], [53, 64]]], extra: "point" },
    { name: "Time out", tip: "Make a T with your hands. Dead serious face.", mouth: "flat",
      arms: [[[34, 50], [30, 60], [67, 58]], [[66, 50], [56, 86], [51, 61]]] },
    { name: "Begone!", tip: "One palm up, hold your phone out like a shield.", mouth: "open", eyes: "wide",
      arms: [[[34, 50], [24, 64], [17, 56]], [[66, 50], [80, 38], [84, 16]]], extra: "shield", palm: 1 },
    { name: "Please, I beg", tip: "Hands pressed together, puppy eyes.", mouth: "sad",
      arms: [[[34, 50], [30, 72], [49, 54]], [[66, 50], [70, 72], [51, 54]]] },
    { name: "Airplane", tip: "Arms out wide like you're flying. Big grin.", mouth: "open",
      arms: [[[34, 50], [18, 51], [3, 53]], [[66, 50], [82, 49], [97, 47]]] },
    { name: "Big brain", tip: "Tap your temple. You just figured it out.", mouth: "smirk",
      arms: [[[34, 50], [29, 74], [33, 96]], [[66, 50], [80, 46], [63, 24]]] },
    { name: "Flex", tip: "Both arms up. Make it dramatic.", mouth: "open",
      arms: [[[34, 50], [16, 47], [21, 30]], [[66, 50], [84, 47], [79, 30]]] },
    { name: "Shh", tip: "Finger on your lips, eyebrows up.", mouth: "flat",
      arms: [[[34, 50], [29, 74], [33, 96]], [[66, 50], [70, 70], [51, 34]]] },
  ];
  // To use a picture instead of a drawing later, add img: "poses/flex.png" (or .gif) to a MEME entry.
  // GIFs print as their first frame, because the saved print is a still PNG.
  function figureBody(f, ink, bg) {
    const arm = (pts) => `M${pts.map((q) => q.join(" ")).join(" L")}`;
    const mouths = {
      smile: '<path d="M44 33 Q50 38 56 33"/>', smirk: '<path d="M45 34 Q51 36 56 32"/>',
      open: `<ellipse cx="50" cy="34" rx="4" ry="3.2" fill="${ink}"/>`, flat: '<path d="M45 34 H55"/>',
      sad: '<path d="M45 35 Q50 31 55 35"/>',
    };
    const eyes = f.eyes === "wide"
      ? `<circle cx="45" cy="24" r="2.4"/><circle cx="55" cy="24" r="2.4"/><circle cx="45" cy="24" r=".8" fill="${ink}"/><circle cx="55" cy="24" r=".8" fill="${ink}"/>`
      : `<circle cx="45" cy="25" r="1.1" fill="${ink}"/><circle cx="55" cy="25" r="1.1" fill="${ink}"/>`;
    let out = `<g stroke="${ink}">`;
    out += `<path d="M44 40 L44 45 Q36 46 33 49 Q28 70 30 100 H70 Q72 70 67 49 Q64 46 56 45 L56 40" fill="${bg}"/>`;
    out += `<ellipse cx="50" cy="26" rx="11" ry="13.5" fill="${bg}"/>${eyes}${mouths[f.mouth] || mouths.smile}`;
    if (f.extra === "shield") out += `<rect x="9" y="47" width="9" height="15" rx="2" transform="rotate(-12 13 54)" fill="${bg}"/>`;
    f.arms.forEach((a) => { out += `<path d="${arm(a)}" stroke-width="10.5"/><path d="${arm(a)}" stroke="${bg}" stroke-width="6.5"/>`; });
    f.arms.forEach((a, k) => {
      const h = a[2], r = f.palm === k ? 5 : 3.6;
      out += `<circle cx="${h[0]}" cy="${h[1]}" r="${r}" fill="${bg}"/>`;
    });
    if (f.extra === "heart") out += '<path d="M50 66 C42 60 44 54 50 58 C56 54 58 60 50 66Z" fill="#E0607E" stroke="none"/>';
    if (f.extra === "point") out += '<path d="M53 64 L45 62"/>';
    if (f.shades) out += `<rect x="40" y="21" width="9" height="6" rx="2" fill="${ink}"/><rect x="51" y="21" width="9" height="6" rx="2" fill="${ink}"/><path d="M49 23 H51"/>`;
    (f.vsign || []).forEach((k) => { const h = f.arms[k][2]; out += `<path d="M${h[0] - 1.5} ${h[1] - 2} L${h[0] - 4} ${h[1] - 11} M${h[0] + 1.5} ${h[1] - 2} L${h[0] + 4} ${h[1] - 11}"/>`; });
    (f.fingers || []).forEach(([k, dx, dy]) => { const h = f.arms[k][2]; out += `<path d="M${h[0]} ${h[1]} L${h[0] + dx} ${h[1] + dy}"/>`; });
    return out + "</g>";
  }
  const SVG_OPEN = (w, cls) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="92" viewBox="0 8 ${w} 92"${cls ? ` class="${cls}"` : ""} aria-hidden="true" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">`;
  function figureSVG(f, ink = "currentColor", bg = "var(--surface)") { return SVG_OPEN(100) + figureBody(f, ink, bg) + "</svg>"; }
  // Two people side by side: left figure is the left camera, right figure the right camera.
  function duoSVG(p, inkL = "currentColor", inkR = "currentColor", bg = "var(--surface)") {
    let out = SVG_OPEN(200, "duo") + figureBody(p.L, inkL, bg) + `<g transform="translate(100 0)">${figureBody(p.R, inkR, bg)}</g>`;
    if (p.center === "heart") out += '<path d="M100 58 C86 48 90 36 100 44 C110 36 114 48 100 58Z" fill="#E0607E" stroke="none"/>';
    if (p.center === "kiss") out += '<path d="M100 40 C93 35 95 29 100 33 C105 29 107 35 100 40Z" fill="#E0607E" stroke="none"/><path d="M84 38 L91 37 M84 43 L90 44" stroke="#E0607E"/>';
    if (p.center === "spark") out += `<path d="M100 8 V14 M92 11 L95 16 M108 11 L105 16" stroke="${inkL}"/>`;
    if (p.center === "think") out += '<circle cx="100" cy="20" r="6" fill="#FFD166" stroke="none"/><path d="M97 27 H103 M98 30 H102" stroke="#C99A2E"/>';
    if (p.center === "whisper") out += `<path d="M84 30 Q90 27 94 30 M86 35 Q92 33 96 36" stroke="${inkL}"/>`;
    return out + "</svg>";
  }
  // Duo poses: L is the person on the left, R the person on the right. Arms are [shoulder, elbow, hand] in each figure's own 100×100 box.
  const DOWN_L = [[34, 50], [29, 74], [33, 96]], DOWN_R = [[66, 50], [71, 74], [67, 96]];
  const MEME_DUO = [
    { name: "Big heart", tip: "Each make half a heart. Together it's whole!", center: "heart",
      L: { mouth: "smile", arms: [DOWN_L, [[66, 50], [86, 30], [99, 42]]] }, R: { mouth: "smile", arms: [[[34, 50], [14, 30], [1, 42]], DOWN_R] } },
    { name: "Point at each other", tip: "Who's the real one? Point at your partner.",
      L: { mouth: "open", eyes: "wide", arms: [DOWN_L, [[66, 50], [82, 52], [97, 50]]], fingers: [[1, 4, 0]] }, R: { mouth: "open", eyes: "wide", arms: [[[34, 50], [18, 52], [3, 50]], DOWN_R], fingers: [[0, -4, 0]] } },
    { name: "High five", tip: "Reach to the middle like you're slapping hands.", center: "spark",
      L: { mouth: "open", arms: [DOWN_L, [[66, 50], [84, 40], [95, 22]]], palm: 1 }, R: { mouth: "open", arms: [[[34, 50], [16, 40], [5, 22]], DOWN_R], palm: 0 } },
    { name: "Too cool", tip: "Sunglasses face, arms crossed, no smiling.",
      L: { mouth: "flat", shades: true, arms: [[[34, 50], [38, 70], [62, 60]], [[66, 50], [62, 70], [38, 60]]] }, R: { mouth: "flat", shades: true, arms: [[[34, 50], [38, 70], [62, 60]], [[66, 50], [62, 70], [38, 60]]] } },
    { name: "Both shocked", tip: "Hands on cheeks, mouths wide open.",
      L: { mouth: "open", eyes: "wide", arms: [[[34, 50], [28, 46], [40, 36]], [[66, 50], [72, 46], [60, 36]]] }, R: { mouth: "open", eyes: "wide", arms: [[[34, 50], [28, 46], [40, 36]], [[66, 50], [72, 46], [60, 36]]] } },
    { name: "Blow & catch", tip: "One blows a kiss, the other catches it.", center: "kiss",
      L: { mouth: "smirk", arms: [DOWN_L, [[66, 50], [72, 64], [57, 35]]] }, R: { mouth: "open", eyes: "wide", arms: [[[34, 50], [16, 46], [4, 38]], DOWN_R], palm: 0 } },
    { name: "Flex buddies", tip: "Both arms up. Who's stronger?",
      L: { mouth: "open", arms: [[[34, 50], [16, 47], [21, 30]], [[66, 50], [84, 47], [79, 30]]] }, R: { mouth: "open", arms: [[[34, 50], [16, 47], [21, 30]], [[66, 50], [84, 47], [79, 30]]] } },
    { name: "Peace twins", tip: "Peace sign on the inside hand. Same smile.",
      L: { mouth: "smile", arms: [DOWN_L, [[66, 50], [80, 42], [82, 26]]], vsign: [1] }, R: { mouth: "smile", arms: [[[34, 50], [20, 42], [18, 26]], DOWN_R], vsign: [0] } },
    { name: "Time out vs Please", tip: "One makes a T, the other begs.",
      L: { mouth: "flat", arms: [[[34, 50], [30, 60], [67, 58]], [[66, 50], [56, 86], [51, 61]]] }, R: { mouth: "sad", arms: [[[34, 50], [30, 72], [49, 54]], [[66, 50], [70, 72], [51, 54]]] } },
    { name: "Fly away", tip: "Arms out wide, like you're flying together.",
      L: { mouth: "open", arms: [[[34, 50], [18, 51], [3, 53]], [[66, 50], [82, 49], [97, 47]]] }, R: { mouth: "open", arms: [[[34, 50], [18, 49], [3, 47]], [[66, 50], [82, 51], [97, 53]]] } },
    { name: "Thinking twins", tip: "Tap your temples. Big idea incoming.", center: "think",
      L: { mouth: "smirk", arms: [DOWN_L, [[66, 50], [80, 46], [63, 24]]] }, R: { mouth: "smirk", arms: [[[34, 50], [20, 46], [37, 24]], DOWN_R] } },
    { name: "Secret", tip: "One whispers a secret, the other listens.", center: "whisper",
      L: { mouth: "smirk", arms: [DOWN_L, [[66, 50], [78, 54], [62, 35]]] }, R: { mouth: "open", eyes: "wide", arms: [[[34, 50], [24, 42], [37, 27]], DOWN_R] } },
  ];
  const CLASSIC_DUO = [
    ["👉", "👈", "Point at each other", "Both point to the middle."], ["🫶", "🫶", "Big heart", "Both make heart hands."],
    ["🙌", "🙌", "High five", "Reach to the middle."], ["😘", "🥰", "Kiss & blush", "One blows a kiss, the other blushes."],
    ["😱", "😱", "Both shocked", "Hands on cheeks!"], ["✌️", "✌️", "Peace twins", "Same pose, same face."],
    ["💪", "💪", "Flex buddies", "Show those arms."], ["😎", "😎", "Too cool", "Arms crossed, no smiling."],
    ["🤫", "👂", "Secret", "One whispers, one listens."], ["🤔", "💡", "Big idea", "One thinks, the other gets it."],
  ];

  Object.assign(window.FB = window.FB || {}, { CLASSIC, MEME, figureBody, SVG_OPEN, figureSVG, duoSVG, DOWN_L, MEME_DUO, CLASSIC_DUO, DOWN_R });
})();
