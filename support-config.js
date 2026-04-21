// Publiczny hash do lekkiej blokady front-endowej. Nie traktuj go jako prawdziwego zabezpieczenia.
window.__IRONSHIELD_SUPPORT_CONFIG__ = {
  mode: "demo",
  remoteDataUrl: "",
  encryptedFeedUrl: "support-feed.json",
  replyApiUrl: "",
  composeFallback: true,
  refreshIntervalMs: 60 * 1000,
  auth: {
    enabled: true,
    passcodeHash: "fccc822678a506bd0e93ff75239c5f008a14941a1585f8d09b1c1184a67606c3",
  },
  labels: {
    mode: "Zaszyfrowany live feed",
    features: "Realne maile + draft + CTA",
    nextStep: "Automatyczny sync Gmail + BaseLinker",
  },
};
