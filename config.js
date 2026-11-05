// Flashbulb settings. Edit this file, commit, and the booth picks it up on the next visit.
window.FLASHBULB_CONFIG = {
  // ---- Relay (TURN) server: makes Together work on mobile data and strict networks ----
  // Easiest: a free Metered.ca account. In its dashboard, open TURN Server > "Credentials API"
  // and paste the URL here (it looks like the example below, with your app name and key):
  //   "https://YOUR-APP.metered.live/api/v1/turn/credentials?apiKey=YOUR_API_KEY"
  // Note: anyone can see this file on your website, so use Metered's dashboard to watch usage.
  turnCredentialsUrl: "",

  // Or list relay servers yourself:
  //   [{ urls: "turn:relay.example.com:3478", username: "user", credential: "pass" }]
  iceServers: [],

  // ---- Connection service ----
  // Empty = the free public PeerJS service. To run your own (see README), fill this in:
  //   { host: "your-peer-server.onrender.com", port: 443, path: "/", secure: true }
  peerServer: null,
};
