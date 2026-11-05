# Flashbulb Photo Booth

A photo booth in your browser. Shoot on your own, or with someone far away while you see and hear each other live. Every booth has pose cards, a 3‑2‑1 countdown and one printed strip at the end.

![Start page with three ways to shoot](docs/start-page.png)

## Three ways to shoot

| | What it does | Internet |
|---|---|---|
| **Just me** | Your live camera, a pose for each shot, a countdown and one print | Not needed after the first visit |
| **Together** | Two people far apart see and hear each other live, pose together and both get the same print | Needed |
| **Use my photos** (`/solo/`) | Turn photos you already took into a strip with the same looks | Not needed after the first visit |

### Together, step by step

1. **Start a booth.** Allow your camera and microphone. You get a 6‑letter code and a **Share link** button.
2. **Your partner joins** from the link, or by typing the code and tapping **Join**.
3. **See each other live.** You're on the left and your partner is on the right. Use the mic button to mute, and the camera button to switch between front and back cameras.
4. **Tap Start 4 shots.** Both screens show the same pose card, count down together and flash. Each phone takes a full-quality photo from its own camera, and the two phones swap photos automatically.
5. **Save the print**, or **Share print** straight to apps on your phone.

![Together: two cameras and the shared print](docs/live-booth.png)

### Just me

![Just me: one camera and your print](docs/just-me.png)

## Works offline and installs like an app

After you've opened the booth once, **Just me** and **Use my photos** keep working with no internet. On your phone, use **Add to Home Screen** (Safari) or **Install app** (Chrome) to keep Flashbulb on your home screen. **Together** still needs internet, because it connects two phones.

## Face stickers

Pick a sticker under the camera and it follows your face as you move, like the filters in photo booth apps. It also tracks more than one face in the frame.

👑 Crown · 🐶 Puppy · 🐱 Kitty · 🕶️ Shades · 😍 In love · 🥳 Party · 🎅 Santa hat · 🌸 Flowers · 💫 Dizzy · 😊 Blush

- **Animated live:** the puppy's tongue wiggles, hearts float up, confetti falls and stars circle your head.
- **In your photos:** stickers are part of every shot on the print.
- **Seen by your partner:** in Together, your partner sees your stickers live, and you each pick your own.
- **Private:** face tracking runs on your phone with [face-api](https://github.com/vladmandic/face-api) (MIT license). No video is uploaded, and it works offline.

![Puppy sticker following a face](docs/stickers.png)

## Features

- **Layouts:** Strip (4 shots), Grid (2 × 2) or Instant (1 big shot). In Together, you and your partner are side by side in every frame.
- **Film looks:** Natural, Silver, Sepia, Faded film, Cool, Vivid
- **Frames:** Paper, Onyx, Blush, Sage, Sand, Navy
- **Season themes:** Pasko (parol lanterns and snow), Valentine, Summer, Spring, Halloween, New Year. The theme for the current month is marked ✦.
- **Pose guide:** Off, Classic (emoji poses) or Meme (line-drawn meme poses such as Time out, Begone!, Airplane and Who, me?). Poses can be printed beside each photo.
- **Caption** with a marker-style highlight that matches the frame colors
- **Poses beside the camera:** the poses for your shots sit next to the camera, so you can see what's coming. Tap one to pick it. During shooting, the current shot's pose lights up. On phones, the picked pose floats in the corner of the camera, and tapping it shows the next one.
- **White or dark:** the booth is white by default. Use the moon button at the top to switch to dark, and it remembers your choice.
- **Settings in three tabs:** Look (layout, film, frame, season), Poses (guide, the upcoming poses, picking one and swapping with ↻) and Caption
- **Synced settings in Together:** whatever either person changes appears on both screens

## Put it online (GitHub Pages)

Phones only allow the camera on secure (https) pages, and GitHub Pages provides that for free.

1. In this repo, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, then **Save**.
3. After a minute your booth is live at `https://pork-arie.github.io/Online-Photo-booth-/`.

Any other static host works too, for example Netlify or Cloudflare Pages. The whole app is one file: `index.html`.

## Good to know

- **Connection:** the two phones find each other through the free public [PeerJS](https://peerjs.com) server. After that, video and photos go directly between the two phones and are not stored on any server.
- **Mobile data:** some mobile networks block direct connections between phones. If you see "Couldn't connect your videos directly", try both on Wi-Fi. For networks that need it, a relay (TURN) server can be added through the link:
  `?turn=turn:your.server:3478&turnuser=USER&turnpass=PASS`
- **Your own connection server:** you can run your own PeerJS server and point the booth at it with `?peerhost=example.com&peerport=443&peerpath=/`.
- **Limit:** two people per booth. A third person who tries to join is told the booth is full.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | The main booth: start page, Just me and Together (HTML, CSS and JavaScript in one file) |
| `solo/index.html` | Use my photos: build a strip from photos you already have, with the same layouts, looks, seasons and poses |
| `sw.js` | Keeps the booth working offline after the first visit |
| `vendor/face-api/` | Face tracking for the stickers ([face-api](https://github.com/vladmandic/face-api), MIT license) and its two small models |
| `manifest.webmanifest`, `icons/` | Lets phones install the booth like an app |
| `tests/` | End-to-end test for both booths |
| `docs/` | Screenshots used in this README |

## Test it

### On your phones (after GitHub Pages is on)

1. On phone 1, open `https://pork-arie.github.io/Online-Photo-booth-/`, tap **Start a booth** and allow the camera and microphone.
2. Tap **Share link** and send it to phone 2. On phone 2, open the link and tap **Join**.
3. Check that each phone shows both cameras, with you on the left on the host phone, and that you can hear each other.
4. Change the film or season on one phone. It should change on the other.
5. Tap **Start 4 shots**. Both phones should show the same pose and countdown, and after 4 flashes both should show the same print.
6. Tap **Save print** and check the picture is in your downloads or photos.
7. Go back, tap **Just me** and take a strip on your own.
8. Turn on airplane mode and open the link again: **Just me** should still work.

If the cameras don't connect, try both phones on Wi-Fi first (see "Mobile data" above).

### On one computer

Open the booth link in a normal window and in a private (incognito) window, then start in one and join from the other. Both windows use the same camera, so you'll see yourself twice, but it shows that everything works.

### Automated test

```bash
cd tests
npm install
npx playwright install chromium
npm test
```

The test starts a local web server and a local PeerJS server, opens two browsers with fake cameras, then checks the following:

- live video and audio in both directions
- that the invite link fills in the code
- that settings sync both ways
- that both screens get the same pose and countdown
- that all 8 photos arrive (4 from each person)
- that saving downloads the print
- what happens when a partner leaves
- that the phone layout doesn't scroll sideways
- Just me: the camera, pose list and swapping, 4 shots, and saving
- offline: the booth, Just me and Use my photos open with no internet
- face stickers, using a fake camera made from a public-domain portrait (`tests/fixtures/`): the face is found, stickers appear, follow the face and stay steady, end up in the print, and your partner sees them
- Use my photos: the home page, adding a photo, saving, and the links between pages

It ends with `PASS` or `FAIL` for each check. Screenshots are saved to `tests/test-output/`.
