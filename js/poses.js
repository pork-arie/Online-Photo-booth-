// Pose guide: classic emoji poses and meme pictures, solo and duo.
(() => {
  /* ---------- Pose guide: Off / Classic (emoji) / Meme (pictures) ---------- */
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
  // Meme poses: real meme pictures (assets/memes). Copy the pose in the picture.
  const MEME_SOLO = [
    { name: "Heart hands", tip: "Make a heart with your hands. Sweet little smile.", img: "assets/memes/solo/01.jpg" },
    { name: "Time out", tip: "Make a T with your hands. Dead serious.", img: "assets/memes/solo/02.jpg" },
    { name: "Too pleased", tip: "Hands behind your head, eyes shut, big laugh.", img: "assets/memes/solo/03.jpg" },
    { name: "Scream", tip: "Hands on your ears, mouth wide open.", img: "assets/memes/solo/04.jpg" },
    { name: "Smug kid", tip: "Tiny smirk. You know something we don't.", img: "assets/memes/solo/05.jpg" },
    { name: "Holding it in", tip: "Press your lips together. Don't laugh!", img: "assets/memes/solo/06.jpg" },
    { name: "Not listening", tip: "Cover your ears and shut your eyes.", img: "assets/memes/solo/07.jpg" },
    { name: "Wide stance", tip: "Feet wide apart, lean in low. Stare.", img: "assets/memes/solo/08.jpg" },
    { name: "Fanny pack glam", tip: "Sit back, one arm on your knee. Serve.", img: "assets/memes/solo/09.jpg" },
    { name: "Whistle pose", tip: "Hands behind your head, cool and innocent.", img: "assets/memes/solo/10.jpg" },
    { name: "Rose for you", tip: "Hold out a flower (or anything) like a gift.", img: "assets/memes/solo/11.jpg" },
    { name: "Shook", tip: "Hands on your head, eyes huge, jaw dropped.", img: "assets/memes/solo/12.jpg" },
    { name: "Big brain", tip: "Tap your temple. You just figured it out.", img: "assets/memes/solo/13.jpg" },
    { name: "Vibing", tip: "Eyes closed, soft smile. You're in the music.", img: "assets/memes/solo/14.jpg" },
    { name: "Please, I beg", tip: "Hands together, eyes closed, pray hard.", img: "assets/memes/solo/15.jpg" },
    { name: "Best life", tip: "Hand on your head, laughing like you're on holiday.", img: "assets/memes/solo/16.jpg" },
    { name: "Model pose", tip: "Hand behind your head, chin up, smile.", img: "assets/memes/solo/17.jpg" },
    { name: "Low-angle selfie", tip: "Hold the camera low and look down at it.", img: "assets/memes/solo/18.jpg" },
    { name: "Disgusted", tip: "Scrunch your whole face. Ew.", img: "assets/memes/solo/19.jpg" },
    { name: "Lounging", tip: "Lean back, one hand behind your head. Relaxed.", img: "assets/memes/solo/20.jpg" },
    { name: "Bye-bye", tip: "Big smile and a little wave.", img: "assets/memes/solo/21.jpg" },
    { name: "Rude monkey", tip: "Huge grin, cheeky finger. Optional!", img: "assets/memes/solo/22.jpg" },
    { name: "Stressed", tip: "Hand on your head. It's been a long day.", img: "assets/memes/solo/23.jpg" },
  ];
  // Duo memes: two people in the picture. The person on the left copies the left one, and so on.
  const MEME_DUO = [
    { name: "Leg heart", tip: "Make a heart with your hands and your legs.", img: "assets/memes/duo/01.jpg" },
    { name: "Finger guns", tip: "Back to back, finger guns up. Action movie face.", img: "assets/memes/duo/02.jpg" },
    { name: "Presenting…", tip: "One presents, the other strikes a pose.", img: "assets/memes/duo/03.jpg" },
    { name: "Force push", tip: "One holds out a palm, the other flies back.", img: "assets/memes/duo/04.jpg" },
    { name: "Wheelbarrow", tip: "One holds the other's legs. Hold steady!", img: "assets/memes/duo/05.jpg" },
    { name: "Lean back", tip: "Hold hands and lean away from each other.", img: "assets/memes/duo/06.jpg" },
    { name: "Got an idea", tip: "One goes \"hmm\", the other has the idea.", img: "assets/memes/duo/07.jpg" },
    { name: "Photobomb", tip: "One poses up close, the other sneaks in behind.", img: "assets/memes/duo/08.jpg" },
    { name: "Silly & serious", tip: "One tongue out, the other totally unimpressed.", img: "assets/memes/duo/09.jpg" },
    { name: "Hug from behind", tip: "One hugs the other from behind.", img: "assets/memes/duo/10.jpg" },
    { name: "Hold me up", tip: "One holds the other up. Both look at the camera.", img: "assets/memes/duo/11.jpg" },
    { name: "Tourist selfie", tip: "Squeeze into the frame with huge grins.", img: "assets/memes/duo/12.jpg" },
    { name: "Head pat", tip: "One pats the other's head. Cute faces.", img: "assets/memes/duo/13.jpg" },
    { name: "Too close", tip: "Faces close. One stares, one looks away.", img: "assets/memes/duo/14.jpg" },
    { name: "Awkward handshake", tip: "Shake hands and smile like it's an office photo.", img: "assets/memes/duo/15.jpg" },
    { name: "Hold me back", tip: "One hides behind the other and holds them back.", img: "assets/memes/duo/16.jpg" },
    { name: "Alien love", tip: "Hold hands. One rests a hand on the other's face.", img: "assets/memes/duo/17.jpg" },
    { name: "Anime clash", tip: "Face each other and point. Final battle.", img: "assets/memes/duo/18.jpg" },
    { name: "Besties", tip: "Arm around each other, flex and grin.", img: "assets/memes/duo/19.jpg" },
    { name: "Too cool", tip: "Arms crossed, no smiling.", img: "assets/memes/duo/20.jpg" },
  ];
  // Solo has every meme: the one-person pictures, then the two-person ones (copy one side, or grab a friend).
  const MEME = [...MEME_SOLO, ...MEME_DUO];
  const CLASSIC_DUO = [
    ["👉", "👈", "Point at each other", "Both point to the middle."], ["🫶", "🫶", "Big heart", "Both make heart hands."],
    ["🙌", "🙌", "High five", "Reach to the middle."], ["😘", "🥰", "Kiss & blush", "One blows a kiss, the other blushes."],
    ["😱", "😱", "Both shocked", "Hands on cheeks!"], ["✌️", "✌️", "Peace twins", "Same pose, same face."],
    ["💪", "💪", "Flex buddies", "Show those arms."], ["😎", "😎", "Too cool", "Arms crossed, no smiling."],
    ["🤫", "👂", "Secret", "One whispers, one listens."], ["🤔", "💡", "Big idea", "One thinks, the other gets it."],
  ];

  Object.assign(window.FB = window.FB || {}, { CLASSIC, MEME, MEME_DUO, CLASSIC_DUO });
})();
