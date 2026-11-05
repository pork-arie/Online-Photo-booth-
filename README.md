# Flashbulb Photo Booth

[![Test the booth](https://github.com/pork-arie/Online-Photo-booth-/actions/workflows/test.yml/badge.svg)](https://github.com/pork-arie/Online-Photo-booth-/actions/workflows/test.yml)

A photo booth in your browser. Shoot on your own, or with someone far away while you see and hear each other live. Every booth has pose cards, a 3‑2‑1 countdown and one printed strip at the end.

![Start page with three ways to shoot](docs/start-page.png)

## Three ways to shoot

| | What it does | Internet |
|---|---|---|
| **Just me** | Your live camera, a pose for each shot, a countdown and one print | Not needed after the first visit |
| **Together** | Two people far apart see and hear each other live, pose together and both get the same print | Needed |
| **Use my photos** | Turn photos from your gallery into a strip with the same looks. Face stickers go on the faces in your photos too | Not needed after the first visit |

### Together, step by step

1. **Start a booth.** Allow your camera and microphone. You get a 6‑letter code and a **Share link** button.
2. **Your partner joins** from the link, or by typing the code and tapping **Join**.
3. **See each other live.** You're on the left and your partner is on the right. Use the mic button to mute, and the camera button to switch between front and back cameras.
4. **Tap Start 4 shots.** Both screens show the same pose card, count down together and flash. Each phone takes a full-quality photo from its own camera, and the two phones swap photos automatically.
5. **Save it** as a picture, a looping GIF or an animated video (see below), or **Share print** straight to apps on your phone.

If the connection drops for a moment, the booth reconnects by itself.

![Together: two cameras and the shared print](docs/live-booth.png)

![Duo poses printed beside each pair of photos](docs/duo-print.png)

### Just me

![Just me: one camera and your print](docs/just-me.png)

## Works offline and installs like an app

After you've opened the booth once, **Just me** and **Use my photos** keep working with no internet. On your phone, use **Add to Home Screen** (Safari) or **Install app** (Chrome) to keep Flashbulb on your home screen. **Together** still needs internet, because it connects two phones.

## Face stickers

Pick a sticker under the camera and it follows your face as you move, like the filters in photo booth apps. It works with more than one face in the frame.

- **3D accessories** ([Fluent Emoji](https://github.com/microsoft/fluentui-emoji) by Microsoft, MIT): 👑 Crown · 🕶️ Shades · 👓 Glasses · 🎩 Top hat · 🧢 Cap · 🎓 Grad cap · 👒 Sun hat · 🎀 Bow · 🌸 Flower crown
- **Animated effects** ([Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/) by Google, CC BY 4.0): 💖 In love · 🎉 Party · 💫 Dizzy · ✨ Sparkle · 🔥 On fire · 🦋 Butterflies
- **Drawn:** 🐶 Puppy · 🐱 Kitty · 🎅 Santa hat

Stickers show in your preview, in every photo on the print and, in Together, on your partner's screen (you each pick your own). Face tracking runs on your phone with [face-api](https://github.com/vladmandic/face-api) (MIT). No video is uploaded, and it all works offline. Full credits are in [`assets/stickers/CREDITS.md`](assets/stickers/CREDITS.md).

![Puppy sticker following a face](docs/stickers.png)

## Save as a picture, GIF or video

When your shots are done, the print slides out and develops like an instant photo, with a burst of confetti. Then:

- **Save print:** the full strip as a PNG picture.
- **Save GIF:** your shots as a looping boomerang GIF, ready for chats.
- **Save video:** an animated 9:16 video for Reels, Stories or TikTok. It shows your caption, then each shot sliding in with a flash and a slow zoom, then the whole print rising into place with confetti. It's made right in your browser (MP4 on most phones, WebM in some browsers).

On iPhone and iPad, saving opens the share sheet. Tap **Save Image** or **Save Video** to put it in Photos.

## Features

- **Layouts:** Strip (4 shots), Grid (2 × 2) or Instant (1 big shot). In Together, you and your partner are side by side in every frame.
- **Film looks:** Natural, Silver, Sepia, Faded film, Cool, Vivid
- **Frames:** Paper, Onyx, Blush, Sage, Sand, Navy
- **Season themes:** Pasko (parol lanterns and snow), Valentine, Summer, Spring, Halloween, New Year. The theme for the current month is marked ✦.
- **Pose guide:** Off, Classic (emoji poses) or Meme (line-drawn meme poses such as Time out, Begone!, Airplane and Who, me?). Poses can be printed beside each photo.
- **Caption** with a marker-style highlight that matches the frame colors
- **Solo and Duo poses:** Solo poses have one figure. Duo poses have two figures side by side (Big heart, High five, Point at each other, Blow & catch, Secret and more), so in Together each person copies their half. Beside the camera your figure is black and your partner's is green, labeled You and Partner. Together starts with Duo and Just me with Solo, and you can switch in the Poses tab.
- **Poses beside the camera:** the poses for your shots sit in a column next to the camera (on phones, in a swipeable row right under it, so the camera keeps the full width). Tap one to pick it. During the countdown, the current shot's pose stays there and pulses, so you can copy it while you pose.
- **White or dark:** the booth is white by default. Use the moon button at the top to switch to dark, and it remembers your choice.
- **Settings in three tabs:** Look (layout, film, frame, season), Poses (guide, the upcoming poses, picking one and swapping with ↻) and Caption
- **Synced settings in Together:** whatever either person changes appears on both screens
- **Sounds:** beeps on 3, 2, 1 and a shutter click on the flash. The speaker button turns them off.
- **Motion:** the print ejects and develops, confetti when it's ready, shots pop in, and stickers wiggle when picked. All of this switches off if your phone is set to reduce motion.
- **Lighter mode:** on slower phones the booth switches to lighter face tracking and a smaller camera picture by itself, so it stays smooth.

## Put it online (GitHub Pages)

Phones only allow the camera on secure (https) pages, and GitHub Pages provides that for free.

1. In this repo, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, then **Save**.
3. After a minute your booth is live at `https://pork-arie.github.io/Online-Photo-booth-/`.

Any other static host works too, for example Netlify or Cloudflare Pages. There's no build step: upload the folder as it is.

## Make Together work on mobile data (relay server)

The two phones normally connect directly. Many mobile data networks block that, so Together fails with "Couldn't connect your videos directly". A **relay (TURN) server** fixes it. Metered.ca has a free plan:

1. Make a free account at [metered.ca](https://www.metered.ca/stun-turn) and create a TURN app.
2. In its dashboard, find the **TURN Server Credentials API** URL. It looks like `https://YOUR-APP.metered.live/api/v1/turn/credentials?apiKey=…`.
3. Open [`config.js`](config.js) in this repo, paste the URL into `turnCredentialsUrl`, and commit.

The booth then uses the relay only when a direct connection isn't possible. `config.js` is public on your site, so keep an eye on usage in Metered's dashboard.

## Good to know

- **Connection:** the two phones find each other through the free public [PeerJS](https://peerjs.com) server. After that, video and photos go directly between the two phones (or through your relay) and are not stored on any server. If the PeerJS service is busy, the booth tries again by itself.
- **Your own connection server (optional):** for more reliability, run the PeerJS server yourself (for example `npx peerjs --port 9000`, or the free [PeerJS server template](https://github.com/peers/peerjs-server) on Render), then fill in `peerServer` in `config.js`.
- **Limit:** two people per booth. A third person who tries to join is told the booth is full.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | The page: start screen and booth layout |
| `css/booth.css` | All the styles, light and dark |
| `js/booth.js` | The app: camera, connection, shooting, print, GIF and video |
| `js/looks.js` | Layouts, film looks, frame colors and season themes |
| `js/poses.js` | Pose artwork: classic and meme, solo and duo |
| `js/stickers.js` | Face sticker artwork and placement |
| `config.js` | Your settings: relay server and own connection server |
| `solo/index.html` | Old link for the strip maker; it opens Use my photos |
| `sw.js` | Keeps the booth working offline after the first visit |
| `assets/stickers/` | Sticker artwork: Fluent Emoji 3D accessories and Noto animated emoji (see `CREDITS.md`) |
| `vendor/face-api/` | Face tracking for the stickers ([face-api](https://github.com/vladmandic/face-api), MIT license) and its two small models |
| `vendor/gifenc/` | GIF maker ([gifenc](https://github.com/mattdesl/gifenc), MIT license) |
| `.github/workflows/test.yml` | Runs the automated test on GitHub after every push |
| `manifest.webmanifest`, `icons/` | Lets phones install the booth like an app |
| `tests/` | End-to-end test for the whole booth |
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

The test runs on GitHub after every push (see the **Actions** tab and the badge at the top). To run it on your computer:

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
- that a dropped connection reconnects by itself and the video comes back
- what happens when a partner leaves
- that the phone layout doesn't scroll sideways
- Just me: the camera, pose list and swapping, 4 shots, sounds, the print developing, and saving the print, GIF and video
- offline: the booth, Just me and Use my photos open with no internet
- face stickers, using a fake camera made from a public-domain portrait (`tests/fixtures/`): the face is found, stickers appear, follow the face and stay steady, end up in the print, and your partner sees them
- lighter mode still tracks faces
- Use my photos: adding photos, picking a slot, stickers placed on a face in a photo, saving, and the old `/solo/` link

It ends with `PASS` or `FAIL` for each check. Screenshots are saved to `tests/test-output/`.
