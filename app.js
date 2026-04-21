const UI_STORAGE_KEY = "ironshield_support_ui_v3";
const OVERRIDES_STORAGE_KEY = "ironshield_support_overrides_v3";
const AUTH_STATE_KEY = "ironshield_support_auth_v1";
const PRIVATE_SNAPSHOT_KEY = "ironshield_support_private_snapshot_v1";
const TWEAKS_STORAGE_KEY = "ironshield_support_tweaks_v1";
const LIVE_DATA_SCRIPT = "support-data.js";
const DEFAULT_TWEAKS = {
  theme: "dark",
  density: "regular",
  accent: "ember",
  surprise: "none",
};
const ACCENTS = [
  { id: "ember", css: "oklch(0.72 0.14 35)", dim: "oklch(0.62 0.12 35)", bg: "oklch(0.72 0.14 35 / 0.12)" },
  { id: "steel", css: "oklch(0.72 0.09 230)", dim: "oklch(0.62 0.08 230)", bg: "oklch(0.72 0.09 230 / 0.12)" },
  { id: "moss", css: "oklch(0.72 0.11 150)", dim: "oklch(0.62 0.10 150)", bg: "oklch(0.72 0.11 150 / 0.12)" },
  { id: "violet", css: "oklch(0.72 0.14 300)", dim: "oklch(0.62 0.12 300)", bg: "oklch(0.72 0.14 300 / 0.12)" },
];
const DEFAULT_CONFIG = {
  mode: "demo",
  remoteDataUrl: "",
  encryptedFeedUrl: "",
  replyApiUrl: "",
  composeFallback: false,
  refreshIntervalMs: 60 * 1000,
  auth: {
    enabled: false,
    passcodeHash: "",
  },
  labels: {
    mode: "GitHub Pages demo",
    features: "Queue + draft + CTA",
    nextStep: "Prywatny backend + BaseLinker",
  },
};

const FILTERS = [
  { id: "all", label: "Wszystkie" },
  { id: "missing", label: "Braki" },
  { id: "damaged", label: "Uszkodzenia" },
  { id: "shipping", label: "Dostawa" },
  { id: "replacement", label: "Dosylki" },
  { id: "other", label: "Inne" },
];

const STATUS_META = {
  new: { label: "Nowy mail", badgeClass: "badge-danger" },
  "needs-baselinker": { label: "Wymaga BaseLinkera", badgeClass: "badge-warn" },
  ready: { label: "Gotowe do wysylki", badgeClass: "badge-accent" },
  waiting: { label: "Czeka na klienta", badgeClass: "" },
  sent: { label: "Wyslane", badgeClass: "" },
};

const CATEGORY_META = {
  missing: { label: "Braki" },
  damaged: { label: "Uszkodzenia" },
  shipping: { label: "Dostawa" },
  replacement: { label: "Dosylki" },
  other: { label: "Inne" },
};

const MUTABLE_FIELDS = [
  "status",
  "unread",
  "needsBaselinker",
  "baselinkerDone",
  "draft",
  "operatorHint",
  "sendEnabled",
  "internalCta",
  "timeline",
];

const HINT_CHIPS = [
  "krotko",
  "bez upsellu",
  "popros o foto",
  "potwierdz adres",
  "produkcja 5 dni",
  "wysylka 7-10 dni",
];

const fallbackTickets = [
  {
    id: "fallback-demo",
    status: "ready",
    unread: true,
    needsBaselinker: false,
    baselinkerDone: false,
    sendEnabled: false,
    customerName: "Live sync pending",
    customerEmail: "feed@ironshieldarmy.demo",
    subject: "Brak danych dashboardu",
    orderNumber: "brak",
    source: "dashboard fallback",
    language: "PL",
    receivedAt: "2026-04-14T12:00:00",
    preview: "Panel czeka na pierwszy zapis support-data.js z bezpiecznym feedem demo.",
    summary:
      "Jesli widzisz ten wpis, dashboard nie dostal jeszcze danych z repozytorium. Kliknij Odswiez dane albo odswiez strone.",
    tags: ["fallback", "public demo"],
    draft: "Brak draftu. Najpierw zaladuj dane demonstracyjne z repozytorium.",
    internalCta: {
      orderNumber: "brak",
      customerEmail: "brak",
      baseLinkerAction: "Sprawdzic, czy support-data.js istnieje w repozytorium.",
      notes: "To tylko fallback awaryjny, nie prawdziwe zgloszenie klienta.",
    },
    timeline: [
      {
        author: "System",
        time: "fallback",
        text: "Dashboard uruchomil sie bez aktualnego feedu demo.",
      },
    ],
  },
];

const state = {
  config: null,
  filter: "all",
  search: "",
  selectedId: null,
  tickets: [],
  overrides: {},
  liveMeta: {
    updatedAt: null,
    checkedAt: null,
    syncSource: "fallback",
    ticketCount: 0,
  },
  isSyncing: false,
  isUnlocked: true,
  isUnlocking: false,
  privateSnapshot: null,
  feedPasscode: "",
  tweaks: { ...DEFAULT_TWEAKS },
  tweaksOpen: false,
};

const el = {
  authGate: document.getElementById("authGate"),
  appShell: document.getElementById("appShell"),
  passcodeInput: document.getElementById("passcodeInput"),
  unlockBtn: document.getElementById("unlockBtn"),
  authMessage: document.getElementById("authMessage"),
  lockPanelBtn: document.getElementById("lockPanelBtn"),
  statsGrid: document.getElementById("statsGrid"),
  filterBar: document.getElementById("filterBar"),
  ticketList: document.getElementById("ticketList"),
  detailView: document.getElementById("detailView"),
  opsSummary: document.getElementById("opsSummary"),
  opsChecklist: document.getElementById("opsChecklist"),
  searchInput: document.getElementById("searchInput"),
  importSnapshotBtn: document.getElementById("importSnapshotBtn"),
  clearSnapshotBtn: document.getElementById("clearSnapshotBtn"),
  importSnapshotInput: document.getElementById("importSnapshotInput"),
  resetDemoBtn: document.getElementById("resetDemoBtn"),
  syncNowBtn: document.getElementById("syncNowBtn"),
  syncMeta: document.getElementById("syncMeta"),
  alertHeadline: document.getElementById("alertHeadline"),
  alertSubline: document.getElementById("alertSubline"),
  tweaksToggleBtn: document.getElementById("tweaksToggleBtn"),
  tweaksPanel: document.getElementById("tweaksPanel"),
  closeTweaksBtn: document.getElementById("closeTweaksBtn"),
  queueTitleCount: document.getElementById("queueTitleCount"),
  runtimeModeLabel: document.getElementById("runtimeModeLabel"),
  runtimeFeaturesLabel: document.getElementById("runtimeFeaturesLabel"),
  runtimeNextStepLabel: document.getElementById("runtimeNextStepLabel"),
  statCardTemplate: document.getElementById("statCardTemplate"),
  ticketCardTemplate: document.getElementById("ticketCardTemplate"),
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readTweaks() {
  const raw = localStorage.getItem(TWEAKS_STORAGE_KEY);
  if (!raw) return { ...DEFAULT_TWEAKS };

  try {
    const parsed = JSON.parse(raw);
    const theme = parsed?.theme === "light" ? "light" : "dark";
    const density = ["compact", "regular", "comfy"].includes(parsed?.density)
      ? parsed.density
      : DEFAULT_TWEAKS.density;
    const accent = ACCENTS.some((item) => item.id === parsed?.accent)
      ? parsed.accent
      : DEFAULT_TWEAKS.accent;
    const surprise = ["none", "cockpit", "focus"].includes(parsed?.surprise)
      ? parsed.surprise
      : DEFAULT_TWEAKS.surprise;

    return {
      theme,
      density,
      accent,
      surprise,
    };
  } catch {
    return { ...DEFAULT_TWEAKS };
  }
}

function saveTweaks() {
  localStorage.setItem(TWEAKS_STORAGE_KEY, JSON.stringify(state.tweaks));
}

function applyAccent(accentId) {
  const accent = ACCENTS.find((item) => item.id === accentId) || ACCENTS[0];
  document.documentElement.style.setProperty("--ember", accent.css);
  document.documentElement.style.setProperty("--ember-dim", accent.dim);
  document.documentElement.style.setProperty("--ember-bg", accent.bg);
}

function applyTweaks() {
  document.documentElement.dataset.theme = state.tweaks.theme;
  document.documentElement.dataset.density = state.tweaks.density;
  applyAccent(state.tweaks.accent);
  el.appShell.classList.toggle("surprise-cockpit", state.tweaks.surprise === "cockpit");
  el.appShell.classList.toggle("surprise-focus", state.tweaks.surprise === "focus");
}

function renderTweaks() {
  if (!el.tweaksPanel) return;

  el.tweaksPanel.classList.toggle("is-open", state.tweaksOpen);

  if (el.tweaksToggleBtn) {
    el.tweaksToggleBtn.setAttribute("aria-pressed", String(state.tweaksOpen));
  }

  el.tweaksPanel.querySelectorAll("[data-tweak-key]").forEach((button) => {
    const active = state.tweaks[button.dataset.tweakKey] === button.dataset.tweakValue;
    button.classList.toggle("is-on", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setTweak(key, value) {
  state.tweaks = {
    ...state.tweaks,
    [key]: value,
  };
  saveTweaks();
  applyTweaks();
  renderTweaks();
}

function toggleTweaksPanel(force) {
  state.tweaksOpen = typeof force === "boolean" ? force : !state.tweaksOpen;
  renderTweaks();
}

function runtimeConfig() {
  const raw = window.__IRONSHIELD_SUPPORT_CONFIG__ || {};
  const labels = raw.labels && typeof raw.labels === "object" ? raw.labels : {};
  const auth = raw.auth && typeof raw.auth === "object" ? raw.auth : {};

  return {
    mode: raw.mode === "remote" ? "remote" : "demo",
    remoteDataUrl: typeof raw.remoteDataUrl === "string" ? raw.remoteDataUrl.trim() : "",
    encryptedFeedUrl:
      typeof raw.encryptedFeedUrl === "string" ? raw.encryptedFeedUrl.trim() : "",
    replyApiUrl: typeof raw.replyApiUrl === "string" ? raw.replyApiUrl.trim() : "",
    composeFallback: Boolean(raw.composeFallback),
    refreshIntervalMs:
      Number.isFinite(raw.refreshIntervalMs) && raw.refreshIntervalMs >= 15 * 1000
        ? raw.refreshIntervalMs
        : DEFAULT_CONFIG.refreshIntervalMs,
    auth: {
      enabled: Boolean(auth.enabled),
      passcodeHash:
        typeof auth.passcodeHash === "string" ? auth.passcodeHash.trim().toLowerCase() : "",
    },
    labels: {
      mode: labels.mode || DEFAULT_CONFIG.labels.mode,
      features: labels.features || DEFAULT_CONFIG.labels.features,
      nextStep: labels.nextStep || DEFAULT_CONFIG.labels.nextStep,
    },
  };
}

function usesRemoteApi() {
  return state.config.mode === "remote" && Boolean(state.config.remoteDataUrl);
}

function usesEncryptedFeed() {
  return Boolean(state.config.encryptedFeedUrl);
}

function hasPrivateSnapshot() {
  return Boolean(state.privateSnapshot && state.privateSnapshot.payload);
}

function isReplyApiConfigured() {
  return Boolean(state.config.replyApiUrl);
}

function canSendTicket(ticket) {
  return Boolean((ticket.draft || "").trim()) && (ticket.status === "ready" || ticket.sendEnabled);
}

function authEnabled() {
  return state.config.auth.enabled && Boolean(state.config.auth.passcodeHash);
}

function readAuthState() {
  if (!authEnabled()) return true;
  if (usesEncryptedFeed()) return false;
  return sessionStorage.getItem(AUTH_STATE_KEY) === state.config.auth.passcodeHash;
}

function persistAuthState(unlocked) {
  if (!authEnabled()) return;
  if (usesEncryptedFeed()) {
    sessionStorage.removeItem(AUTH_STATE_KEY);
    return;
  }

  if (unlocked) {
    sessionStorage.setItem(AUTH_STATE_KEY, state.config.auth.passcodeHash);
    return;
  }

  sessionStorage.removeItem(AUTH_STATE_KEY);
}

function setAuthMessage(message, mode = "default") {
  el.authMessage.textContent = message;
  el.authMessage.dataset.mode = mode;
}

async function sha256Hex(value) {
  const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function applyAuthState() {
  const locked = authEnabled() && !state.isUnlocked;
  document.body.classList.toggle("locked", locked);
  el.authGate.hidden = !locked;
  el.lockPanelBtn.hidden = !authEnabled();
  el.appShell.setAttribute("aria-hidden", String(locked));

  if ("inert" in el.appShell) {
    el.appShell.inert = locked;
  }

  if (!locked) {
    el.passcodeInput.value = "";
    setAuthMessage("To jest lekka blokada front-endowa dla szybkiego ograniczenia dostępu do panelu.");
  }
}

async function unlockPanel() {
  if (!authEnabled()) return;

  const candidate = el.passcodeInput.value.trim();
  if (!candidate) {
    setAuthMessage("Wpisz hasło operatora, żeby wejść do panelu.", "error");
    el.passcodeInput.focus();
    return;
  }

  state.isUnlocking = true;
  el.unlockBtn.disabled = true;
  setAuthMessage("Sprawdzam hasło...", "info");

  try {
    const candidateHash = await sha256Hex(candidate);

    if (candidateHash !== state.config.auth.passcodeHash) {
      setAuthMessage("To hasło nie pasuje. Spróbuj jeszcze raz.", "error");
      el.passcodeInput.select();
      return;
    }

    if (usesEncryptedFeed()) {
      setAuthMessage("Odszyfrowuję feed klientów...", "info");
      const decrypted = await refreshLiveData({ silent: true, passcode: candidate });
      if (!decrypted) {
        setAuthMessage("Nie udało się odczytać feedu klientów tym hasłem.", "error");
        el.passcodeInput.select();
        return;
      }
      state.feedPasscode = candidate;
    }

    state.isUnlocked = true;
    persistAuthState(true);
    applyAuthState();
    render();

    if (usesRemoteApi() && !state.liveMeta.updatedAt) {
      refreshLiveData({ silent: true });
    }

    toast("Panel odblokowany.");
    el.searchInput.focus();
  } catch {
    setAuthMessage("Nie udało się zweryfikować hasła w tej przeglądarce.", "error");
  } finally {
    state.isUnlocking = false;
    el.unlockBtn.disabled = false;
  }
}

function lockPanel() {
  if (!authEnabled()) return;
  state.isUnlocked = false;
  state.feedPasscode = "";
  persistAuthState(false);
  applyAuthState();
  el.passcodeInput.focus();
  toast("Panel został zablokowany.");
}

function loadUiState() {
  const raw = localStorage.getItem(UI_STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.filter = parsed.filter || state.filter;
    state.search = parsed.search || "";
    state.selectedId = parsed.selectedId || null;
  } catch {
    // Ignore broken UI state.
  }
}

function saveUiState() {
  localStorage.setItem(
    UI_STORAGE_KEY,
    JSON.stringify({
      filter: state.filter,
      search: state.search,
      selectedId: state.selectedId,
    })
  );
}

function loadOverrides() {
  const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.overrides = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    state.overrides = {};
  }
}

function saveOverrides() {
  localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(state.overrides));
}

function readPrivateSnapshot() {
  const raw = localStorage.getItem(PRIVATE_SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.payload || !Array.isArray(parsed.payload.tickets)) {
      return null;
    }

    return {
      name: typeof parsed.name === "string" ? parsed.name : "private-support-snapshot.json",
      savedAt: parsed.savedAt || null,
      payload: parsed.payload,
    };
  } catch {
    return null;
  }
}

function savePrivateSnapshot(snapshot) {
  state.privateSnapshot = snapshot;

  if (!snapshot) {
    localStorage.removeItem(PRIVATE_SNAPSHOT_KEY);
    return;
  }

  localStorage.setItem(PRIVATE_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function normalizePayload(raw) {
  if (raw && Array.isArray(raw.tickets) && raw.tickets.length) {
    return {
      updatedAt: raw.updatedAt || null,
      syncSource: raw.syncSource || "repo-feed",
      ticketCount: raw.tickets.length,
      tickets: clone(raw.tickets),
    };
  }

  return {
    updatedAt: null,
    syncSource: "fallback",
    ticketCount: fallbackTickets.length,
    tickets: clone(fallbackTickets),
  };
}

function mergeTicketsWithOverrides(baseTickets) {
  return baseTickets.map((ticket) => {
    const override = state.overrides[ticket.id] || {};
    const merged = { ...ticket };

    MUTABLE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(override, field)) {
        merged[field] = override[field];
      }
    });

    return merged;
  });
}

function applyPayload(rawPayload) {
  const payload = normalizePayload(rawPayload);
  state.liveMeta = {
    updatedAt: payload.updatedAt,
    checkedAt: state.liveMeta.checkedAt,
    syncSource: payload.syncSource,
    ticketCount: payload.ticketCount,
  };
  state.tickets = mergeTicketsWithOverrides(payload.tickets);
  ensureSelectedTicket();
}

function applyDefaultPayload() {
  if (hasPrivateSnapshot()) {
    applyPayload(state.privateSnapshot.payload);
    return;
  }

  if (usesEncryptedFeed()) {
    applyPayload(null);
    return;
  }

  applyPayload(usesRemoteApi() ? null : window.__IRONSHIELD_SUPPORT_DATA__);
}

function ensureSelectedTicket() {
  const exists = state.tickets.some((ticket) => ticket.id === state.selectedId);
  if (!exists) {
    state.selectedId = state.tickets[0]?.id || null;
  }
}

function selectedTicket() {
  return state.tickets.find((ticket) => ticket.id === state.selectedId) || null;
}

function formatDate(iso) {
  if (!iso) return "brak danych";
  return new Date(iso).toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAge(iso) {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  if (diffHours < 1) return "<1h temu";
  if (diffHours < 24) return `${diffHours}h temu`;
  return `${Math.round(diffHours / 24)}d temu`;
}

function focusMessage(ticket) {
  if (ticket.needsBaselinker && !ticket.baselinkerDone) {
    return {
      title: "Najpierw ręczny ruch w BaseLinkerze albo na produkcji",
      body: "Ten temat nie powinien zostać zamknięty, dopóki nie przygotujesz dosyłki, replacementu albo statusu potrzebnego do odpowiedzi.",
    };
  }

  if (ticket.unread) {
    return {
      title: "Najpierw oceń draft i zdecyduj, czy to już odpowiedź do klienta",
      body: "To świeży mail. Priorytetem jest szybkie potwierdzenie problemu i ustawienie sprawy na właściwy tor.",
    };
  }

  if (ticket.status === "ready") {
    return {
      title: "Draft jest gotowy, możesz go skopiować albo dopracować",
      body: "To najbliższy krok do zamknięcia sprawy. Sprawdź tylko, czy nic nie czeka jeszcze po stronie operacyjnej.",
    };
  }

  if (ticket.status === "sent") {
    return {
      title: "Sprawa jest już domknięta po stronie panelu",
      body: "Tutaj tylko monitorujesz, czy klient wróci z nową odpowiedzią lub dodatkową prośbą.",
    };
  }

  return {
    title: "Skontroluj status zgłoszenia i następny ruch operatora",
    body: "Panel podpowiada, co zrobić teraz, ale to Ty decydujesz, czy temat jest gotowy do dalszego kroku.",
  };
}

function customerFirstName(ticket) {
  const value = String(ticket.customerName || "").trim();
  return value.split(/\s+/)[0] || "there";
}

function normalizeSupportText(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectDraftScenario(ticket) {
  const haystack = normalizeSupportText(
    [
      ticket.subject,
      ticket.summary,
      ticket.preview,
      ...(ticket.tags || []),
      ticket.internalCta?.baseLinkerAction || "",
    ].join(" ")
  );

  return {
    shippingQuestion: /shipping|delivery time|how many days|texas|usa/.test(haystack),
    tracking: /where is my order|tracking|status|delay|shipped/.test(haystack),
    scaleIssue: /scale|32 mm|38 mm|wrong scale/.test(haystack),
    damaged: /damaged|broken|replacement|zlam|uszkod/.test(haystack),
    missing: /missing|brakuje|free gift|gift|welcome bribe|chest/.test(haystack),
  };
}

function detectHintFlags(operatorHint) {
  const hint = normalizeSupportText(operatorHint);

  return {
    shortMode: /krotk|short/.test(hint),
    formalMode: /formal|neutral|bez nerd|without nerd/.test(hint),
    noUpsell: /bez upsell|without upsell|no upsell/.test(hint),
    forceUpsell: /zapytaj czy chce cos jeszcze|zapytaj o cos jeszcze|anything else|add anything else|dorzucic cos|dopytaj czy chce cos jeszcze/.test(
      hint
    ),
    mentionAddress: /adres|address/.test(hint),
    skipAddress: /bez adres|bez pytania o adres|without address|don't ask.*address/.test(hint),
    confirmAddress: /potwierdz adres|confirm address|address still the same|ten sam adres/.test(hint),
    mentionPackaging: /pakow|package|zabezpiecz|protect|lepiej zapak|better packaging/.test(hint),
    mentionDelayCheck: /sprawdz|zweryfikuj|check|bazelinker|baselinker|system/.test(hint),
    askPhoto: /zdjec|photo|picture|fotk|foto|fotograf/.test(hint),
    askMeasuredPhotos: /zmierz|zmierzon|mierzon|measurement|measure|wymiar|dimension|linijk|ruler/.test(hint),
    askWhatMissing: /co brakuje|ktorej figurki|which mini|which miniature|which item/.test(hint),
    askWhatBroken: /co sie zlam|what broke|which part|what part/.test(hint),
    mentionFulfillment: /5 dni|5 business days|czas realizacji|fulfillment|production time/.test(hint),
    noPromise: /nie obiecuj|don't promise|do not promise|najpierw sprawdz/i.test(hint),
    productionWindow: extractDayWindow(hint, "produkcj|realizac|production|fulfillment"),
    shippingWindow: extractDayWindow(hint, "wysylk|dostaw|shipping|delivery|transit"),
  };
}

function buildFallbackGuidanceParagraphs(ticket, operatorHint) {
  const hint = normalizeSupportText(operatorHint);
  const scenario = detectDraftScenario(ticket);
  const orderLabel = ticket.orderNumber && ticket.orderNumber !== "brak" ? `order ${ticket.orderNumber}` : "your order";
  const paragraphs = [];
  const productionWindow = extractDayWindow(hint, "produkcj|realizac|production|fulfillment");
  const shippingWindow = extractDayWindow(hint, "wysylk|dostaw|shipping|delivery|transit");

  if (!hint) {
    return paragraphs;
  }

  if (/zdjec|photo|picture|fotk|foto|fotograf/.test(hint) && /zmierz|zmierzon|mierzon|measure|measurement|linijk|ruler|wymiar|dimension/.test(hint)) {
    paragraphs.push("If possible, please send photos of the measured miniatures, ideally with a ruler visible in the frame, so we can verify the scale properly.");
    paragraphs.push("Once we have that, we can verify the scale properly and come back to you with the next step.");
    return paragraphs;
  }

  if (/zdjec|photo|picture|fotk|foto|fotograf/.test(hint)) {
    if (scenario.damaged) {
      paragraphs.push("If possible, please send a quick photo of the damage so we can match the replacement correctly.");
    } else if (scenario.missing) {
      paragraphs.push("If possible, please send a quick photo of what arrived so we can confirm the missing part correctly.");
    } else {
      paragraphs.push("If possible, please send a few photos so we can verify the issue properly.");
    }
  }

  if (/co brakuje|ktorej figurki|which mini|which miniature|which item/.test(hint)) {
    paragraphs.push("If you can, please confirm exactly which miniature is missing from the order.");
  }

  if (/co sie zlam|what broke|which part|what part/.test(hint)) {
    paragraphs.push("If you can, please let me know which part arrived broken.");
  }

  if (/adres|address/.test(hint) && !/bez adres|bez pytania o adres|without address|don't ask.*address/.test(hint)) {
    paragraphs.push(`If your shipping address is still the same as in ${orderLabel}, we can move forward from our side.`);
  }

  if (/pakow|package|zabezpiecz|protect|lepiej zapak|better packaging/.test(hint)) {
    paragraphs.push("I have also noted the packaging request, so we can take extra care with this replacement.");
  }

  if (/sprawdz|zweryfikuj|check|bazelinker|baselinker|system/.test(hint)) {
    paragraphs.push(`I am checking ${orderLabel} in our system first so I can give you an accurate update instead of guessing.`);
  }

  if (productionWindow || shippingWindow || /5 dni|5 business days|czas realizacji|fulfillment|production time/.test(hint)) {
    const timingLines = [];

    if (productionWindow) {
      timingLines.push(`Production usually takes ${formatBusinessDayWindow(productionWindow)}.`);
    } else if (/5 dni|5 business days|czas realizacji|fulfillment|production time/.test(hint)) {
      timingLines.push("Our average fulfillment time is about 5 business days.");
    }

    if (shippingWindow) {
      timingLines.push(`Shipping after dispatch usually takes around ${formatBusinessDayWindow(shippingWindow, { prefix: "" })}.`);
    }

    if (timingLines.length) {
      paragraphs.push(timingLines.join(" "));
    }
  }

  return Array.from(new Set(paragraphs));
}

function joinDraft(parts) {
  return parts.filter(Boolean).join("\n\n");
}

function splitDraftIntoParagraphs(draft) {
  return String(draft || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function insertBeforeSignoff(paragraphs, paragraph) {
  if (!paragraph || paragraphs.includes(paragraph)) {
    return paragraphs;
  }

  const signoffIndex = paragraphs.findIndex((item) => /^Best regards,/i.test(item));

  if (signoffIndex === -1) {
    paragraphs.push(paragraph);
    return paragraphs;
  }

  paragraphs.splice(signoffIndex, 0, paragraph);
  return paragraphs;
}

function removeParagraphsMatching(paragraphs, pattern) {
  return paragraphs.filter((paragraph) => !pattern.test(paragraph));
}

function extractDayWindow(text, keywordPattern) {
  const match = String(text || "").match(
    new RegExp(`(?:${keywordPattern})[^\\d]{0,20}(\\d{1,2})(?:\\s*(?:-|–|—|do|to)\\s*(\\d{1,2}))?`, "i")
  );

  if (!match) {
    return null;
  }

  return {
    from: Number(match[1]),
    to: match[2] ? Number(match[2]) : null,
  };
}

function formatBusinessDayWindow(window, { prefix = "about " } = {}) {
  if (!window) {
    return "";
  }

  if (window.to && window.to !== window.from) {
    return `${window.from}-${window.to} business days`;
  }

  return `${prefix}${window.from} business days`;
}

function buildBaseDraftFromTicket(ticket) {
  const firstName = customerFirstName(ticket);
  const orderLabel = ticket.orderNumber && ticket.orderNumber !== "brak" ? `order ${ticket.orderNumber}` : "your order";
  const scenario = detectDraftScenario(ticket);
  const greeting = `Hello ${firstName},`;
  const signoff = "Best regards,\nIronShield Army Support";

  if (scenario.shippingQuestion) {
    return joinDraft([
      greeting,
      "Thank you for your message.",
      "Our average fulfillment time is about 5 business days. After dispatch, delivery time depends on the carrier and destination, but that transit time comes on top of production.",
      "If you already know which miniatures you want, feel free to send them over and we can help you estimate it a bit more closely.",
      signoff,
    ]);
  }

  if (scenario.tracking || ticket.needsBaselinker) {
    return joinDraft([
      greeting,
      "Thank you for your message, and I am sorry for the delay.",
      `I am checking ${orderLabel} in our system first so I can give you an accurate update instead of guessing.`,
      "As soon as I verify the current status, I will get back to you with the next step.",
      signoff,
    ]);
  }

  if (scenario.scaleIssue) {
    return joinDraft([
      greeting,
      "Thank you for your message, and I am very sorry about that.",
      `I understand there may be an issue with the scale in ${orderLabel}. I am checking the order details from our side first so I can confirm exactly what happened and come back to you with the right solution.`,
      "As soon as I verify the order, I will get back to you with the next step.",
      signoff,
    ]);
  }

  if (scenario.damaged) {
    return joinDraft([
      greeting,
      "Thank you for your message, and I am very sorry your miniature arrived damaged.",
      "Yes, absolutely, we can send you a replacement free of charge.",
      /package|arrow|protect/i.test(ticket.preview || "")
        ? "I have also noted the packaging request, so we can take extra care with this replacement."
        : "",
      "If you liked the rest of the minis and would like to add anything else from our shop, feel free to let me know and we can include it in the same shipment.",
      `If your shipping address is still the same as in ${orderLabel}, we can move forward from our side.`,
      signoff,
    ]);
  }

  if (scenario.missing) {
    return joinDraft([
      greeting,
      "Thank you for your message, and I am very sorry about that.",
      "Of course, we can send the missing miniature free of charge.",
      "If you liked the rest of the minis and would like to add anything else from our shop, feel free to let me know and we can include it in the same shipment.",
      `If your shipping address is still the same as in ${orderLabel}, we can move forward from our side.`,
      signoff,
    ]);
  }

  return joinDraft([
    greeting,
    "Thank you for your message.",
    "I am checking the details from our side so I can come back to you with the right next step.",
    signoff,
  ]);
}

function reviseDraftWithOperatorInput(ticket, currentDraft, operatorHint) {
  const scenario = detectDraftScenario(ticket);
  const hint = detectHintFlags(operatorHint);
  const originalDraft = String(currentDraft || buildBaseDraftFromTicket(ticket)).trim();
  let paragraphs = splitDraftIntoParagraphs(originalDraft);
  const orderLabel = ticket.orderNumber && ticket.orderNumber !== "brak" ? `order ${ticket.orderNumber}` : "your order";

  const signoffPattern = /^Best regards,/i;
  const addressPattern = /If your shipping address is still the same/i;
  const upsellPattern = /add anything else from our shop|send them over and we can help you estimate/i;
  const timingPattern = /Our average fulfillment time|Production usually takes|Shipping after dispatch usually takes/i;
  const systemCheckPattern = /I am checking .* in our system first|I am checking the order details from our side first/i;
  const followupPattern = /As soon as I verify/i;
  const replacementPromisePattern = /replacement free of charge|missing miniature free of charge/i;
  const photoPattern = /please send .*photo|please send photos of the measured miniatures/i;

  if (!paragraphs.some((paragraph) => signoffPattern.test(paragraph))) {
    paragraphs.push("Best regards,\nIronShield Army Support");
  }

  if (hint.noUpsell) {
    paragraphs = removeParagraphsMatching(paragraphs, upsellPattern);
  }

  if (hint.forceUpsell) {
    insertBeforeSignoff(
      paragraphs,
      scenario.shippingQuestion
        ? "If you already know which miniatures you want, feel free to send them over and we can help you estimate it a bit more closely."
        : "If you liked the rest of the minis and would like to add anything else from our shop, feel free to let me know and we can include it in the same shipment."
    );
  }

  if (hint.skipAddress) {
    paragraphs = removeParagraphsMatching(paragraphs, addressPattern);
  }

  if (hint.confirmAddress || hint.mentionAddress) {
    insertBeforeSignoff(
      paragraphs,
      `If your shipping address is still the same as in ${orderLabel}, we can move forward from our side.`
    );
  }

  if (hint.noPromise) {
    paragraphs = removeParagraphsMatching(paragraphs, replacementPromisePattern);
    insertBeforeSignoff(
      paragraphs,
      "I am checking the order details from our side first so I can come back to you with the right next step."
    );
  }

  if (hint.mentionPackaging) {
    insertBeforeSignoff(
      paragraphs,
      "I have also noted the packaging request, so we can take extra care with this replacement."
    );
  }

  if (hint.askWhatBroken) {
    insertBeforeSignoff(paragraphs, "If you can, please let me know which part arrived broken.");
  }

  if (hint.askWhatMissing) {
    insertBeforeSignoff(paragraphs, "If you can, please confirm exactly which miniature is missing from the order.");
  }

  if (scenario.scaleIssue && (hint.askMeasuredPhotos || hint.askPhoto)) {
    paragraphs = removeParagraphsMatching(paragraphs, systemCheckPattern);
    paragraphs = removeParagraphsMatching(paragraphs, followupPattern);
    paragraphs = removeParagraphsMatching(paragraphs, photoPattern);
    insertBeforeSignoff(
      paragraphs,
      hint.askMeasuredPhotos
        ? "If possible, please send photos of the measured miniatures, ideally with a ruler visible in the frame, so we can verify the scale properly."
        : "If it is possible, please send a quick photo of the miniature next to a ruler or another reference mini."
    );
    insertBeforeSignoff(
      paragraphs,
      "Once we have that, we can verify the scale properly and come back to you with the next step."
    );
  } else if (hint.askPhoto) {
    paragraphs = removeParagraphsMatching(paragraphs, photoPattern);
    if (scenario.damaged) {
      insertBeforeSignoff(paragraphs, "If possible, please send a quick photo of the damage so we can match the replacement correctly.");
    } else if (scenario.missing) {
      insertBeforeSignoff(paragraphs, "If possible, please send a quick photo of what arrived so we can confirm the missing part correctly.");
    }
  }

  if (hint.mentionDelayCheck) {
    insertBeforeSignoff(
      paragraphs,
      `I am checking ${orderLabel} in our system first so I can give you an accurate update instead of guessing.`
    );
  }

  if (hint.productionWindow || hint.shippingWindow || hint.mentionFulfillment) {
    paragraphs = removeParagraphsMatching(paragraphs, timingPattern);
    const timingLines = [];

    if (hint.productionWindow) {
      timingLines.push(`Production usually takes ${formatBusinessDayWindow(hint.productionWindow)}.`);
    } else if (hint.mentionFulfillment) {
      timingLines.push("Our average fulfillment time is about 5 business days.");
    }

    if (hint.shippingWindow) {
      timingLines.push(`Shipping after dispatch usually takes around ${formatBusinessDayWindow(hint.shippingWindow, { prefix: "" })}.`);
    }

    if (timingLines.length) {
      insertBeforeSignoff(paragraphs, timingLines.join(" "));
    }
  }

  let revisedDraft = joinDraft(paragraphs);

  if (String(revisedDraft).trim() === originalDraft) {
    buildFallbackGuidanceParagraphs(ticket, operatorHint).forEach((paragraph) => {
      insertBeforeSignoff(paragraphs, paragraph);
    });
    revisedDraft = joinDraft(paragraphs);
  }

  return revisedDraft;
}

function buildDraftFromTicket(ticket, operatorHint = "", currentDraft = "") {
  const baseDraft = currentDraft && String(currentDraft).trim()
    ? currentDraft
    : buildBaseDraftFromTicket(ticket);

  if (!String(operatorHint || "").trim()) {
    return baseDraft;
  }

  return reviseDraftWithOperatorInput(ticket, baseDraft, operatorHint);
}

function categoryForTicket(ticket) {
  const haystack = normalizeSupportText(
    [
      ticket.subject,
      ticket.preview,
      ticket.summary,
      ...(ticket.tags || []),
      ticket.internalCta?.baseLinkerAction || "",
    ].join(" ")
  );

  if (/missing|brakuje|gift|gratis|bonus|free gift|welcome bribe/.test(haystack)) {
    return "missing";
  }

  if (/tracking|where is my order|shipping|delivery|status przesylki|status przesylki|shipped/.test(haystack)) {
    return "shipping";
  }

  if (/replacement arrived|follow-up|resend/.test(haystack)) {
    return "replacement";
  }

  if (/damaged|broken|zlam|uszkod|snap/.test(haystack)) {
    return "damaged";
  }

  return "other";
}

function waitingStateForTicket(ticket) {
  if (ticket.status === "sent") return "client";
  if (ticket.needsBaselinker && !ticket.baselinkerDone) return "us";
  if (ticket.unread || ticket.status === "ready" || ticket.sendEnabled) return "us";
  return "client";
}

function initialsForName(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function firstInboundMessage(ticket) {
  const first = Array.isArray(ticket.timeline) ? ticket.timeline[0] : null;
  return first?.text || ticket.preview || ticket.summary || "";
}

function categoryCounts() {
  return state.tickets.reduce(
    (acc, ticket) => {
      acc.all += 1;
      acc[categoryForTicket(ticket)] += 1;
      return acc;
    },
    { all: 0, missing: 0, damaged: 0, shipping: 0, replacement: 0, other: 0 }
  );
}

function checklistItemsForTicket(ticket) {
  const items = [
    {
      id: "review",
      kind: "check",
      label: "Sprawdz draft i dopasuj ton odpowiedzi do problemu klienta.",
      hint: "To jest ostatni moment na poprawki przed wysylka.",
      done: !ticket.unread,
    },
  ];

  if (ticket.orderNumber && ticket.orderNumber !== "brak") {
    items.push({
      id: "open-order",
      kind: "external",
      label: `Sprawdz ${ticket.orderNumber} w BaseLinkerze`,
      hint: "Skopiuj numer zamowienia i wykonaj ruch operacyjny.",
      done: false,
    });
  }

  if (ticket.internalCta?.baseLinkerAction) {
    items.push({
      id: "ops",
      kind: "check",
      label: ticket.internalCta.baseLinkerAction,
      hint: ticket.internalCta.notes || "Ten krok zamyka czesc operacyjna sprawy.",
      done: Boolean(ticket.baselinkerDone),
    });
  }

  items.push({
    id: "send",
    kind: "check",
    label: "Wyslij odpowiedz albo otworz gotowy mail w Gmailu.",
    hint: isReplyApiConfigured()
      ? "Backend reply jest skonfigurowany."
      : state.config.composeFallback
        ? "Mozesz otworzyc gotowa odpowiedz w Gmailu."
        : "Na razie dostepne jest kopiowanie odpowiedzi.",
    done: ticket.status === "sent",
  });

  return items;
}

function counts() {
  return state.tickets.reduce(
    (acc, ticket) => {
      acc.all += 1;
      acc[ticket.status] += 1;
      if (ticket.unread) acc.unread += 1;
      if (ticket.needsBaselinker && !ticket.baselinkerDone) acc.ops += 1;
      return acc;
    },
    { all: 0, unread: 0, new: 0, "needs-baselinker": 0, ready: 0, waiting: 0, sent: 0, ops: 0 }
  );
}

function filteredTickets() {
  const term = state.search.trim().toLowerCase();

  return state.tickets
    .filter((ticket) => {
      if (state.filter !== "all" && categoryForTicket(ticket) !== state.filter) return false;
      if (!term) return true;

      const haystack = [
        ticket.customerName,
        ticket.customerEmail,
        ticket.subject,
        ticket.orderNumber,
        ticket.preview,
        ticket.summary,
        ticket.internalCta?.baseLinkerAction,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    })
    .sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
}

function renderStats() {
  const summary = counts();
  const items = [
    {
      label: "Nowe",
      value: String(summary.unread),
      subtitle: "Swieze wiadomosci, ktore wymagaja ruchu supportu.",
      tone: "danger",
    },
    {
      label: "BL",
      value: String(summary.ops),
      subtitle: "Sprawy, gdzie bez recznej operacji nie ma finalnej odpowiedzi.",
      tone: "warn",
    },
    {
      label: "Gotowe",
      value: String(summary.ready),
      subtitle: "Tu draft juz jest, a Ty tylko go przegladasz lub kopiujesz.",
      tone: "accent",
    },
    {
      label: "Feed",
      value: state.liveMeta.ticketCount ? String(state.liveMeta.ticketCount) : "0",
      subtitle: `Ostatni feed: ${state.liveMeta.syncSource}`,
      tone: "neutral",
    },
  ];

  el.statsGrid.innerHTML = "";

  items.forEach((item) => {
    const node = el.statCardTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(`stat-card--${item.tone}`);
    node.title = item.subtitle;
    node.setAttribute("aria-label", `${item.label}: ${item.value}. ${item.subtitle}`);
    node.querySelector(".section-label").textContent = item.label;
    node.querySelector(".stat-value").textContent = item.value;
    node.querySelector(".stat-subtitle").textContent = item.subtitle;
    el.statsGrid.appendChild(node);
  });
}

function renderAlert() {
  const unreadTickets = state.tickets.filter((ticket) => ticket.unread);

  el.alertHeadline.textContent = unreadTickets.length
    ? `${unreadTickets.length} watkow czeka teraz na odpowiedz`
    : "Kolejka klientow jest pod kontrola";

  if (!unreadTickets.length) {
    el.alertSubline.textContent =
      usesEncryptedFeed()
        ? "Panel po odblokowaniu czyta zaszyfrowany feed klientow."
        : usesRemoteApi()
          ? "Panel czyta prywatne API z mailami klientow."
          : "To publiczna warstwa panelu oparta o feed demonstracyjny.";
    return;
  }

  el.alertSubline.textContent = unreadTickets
    .slice(0, 3)
    .map((ticket) => `${ticket.customerName} (${ticket.orderNumber})`)
    .join(", ");
}

function renderSyncMeta() {
  const updated = state.liveMeta.updatedAt ? formatDate(state.liveMeta.updatedAt) : "brak syncu";
  const checked = state.liveMeta.checkedAt ? formatDate(state.liveMeta.checkedAt) : "jeszcze nie sprawdzano";
  const syncingText = authEnabled() && !state.isUnlocked
    ? "Panel jest zablokowany."
    : hasPrivateSnapshot()
      ? `Aktywny snapshot: ${state.privateSnapshot.name}.`
      : state.isSyncing
        ? usesEncryptedFeed()
          ? "Trwa odszyfrowanie feedu..."
          : usesRemoteApi()
            ? "Trwa odswiezanie prywatnego API..."
            : "Trwa odswiezanie feedu demo..."
        : usesEncryptedFeed()
          ? "Zaszyfrowany live feed."
          : usesRemoteApi()
            ? "Prywatne API."
            : "Feed demonstracyjny.";
  el.syncMeta.textContent = `Feed: ${updated} • Sprawdzone: ${checked} • ${syncingText}`;
  el.syncNowBtn.disabled = state.isSyncing || (authEnabled() && !state.isUnlocked) || hasPrivateSnapshot();
  el.syncNowBtn.textContent = hasPrivateSnapshot()
    ? "Snapshot aktywny"
    : state.isSyncing
      ? "Odswiezanie..."
      : "Odswiez maile";
  if (el.importSnapshotBtn) {
    el.importSnapshotBtn.hidden = usesEncryptedFeed();
  }
  if (el.clearSnapshotBtn) {
    el.clearSnapshotBtn.hidden = usesEncryptedFeed() || !hasPrivateSnapshot();
  }
}

function renderRuntimeLabels() {
  if (!el.runtimeModeLabel || !el.runtimeFeaturesLabel || !el.runtimeNextStepLabel) {
    return;
  }

  if (hasPrivateSnapshot()) {
    el.runtimeModeLabel.textContent = "Prywatny snapshot";
    el.runtimeFeaturesLabel.textContent = "Realne maile z lokalnego pliku";
    el.runtimeNextStepLabel.textContent = "Wczytaj nowy plik, aby odswiezyc kolejke";
    return;
  }

  el.runtimeModeLabel.textContent = state.config.labels.mode;
  el.runtimeFeaturesLabel.textContent = state.config.labels.features;
  el.runtimeNextStepLabel.textContent = state.config.labels.nextStep;
}

function renderFilters() {
  const summary = categoryCounts();
  el.filterBar.innerHTML = "";

  FILTERS.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `queue-cat${state.filter === filter.id ? " is-active" : ""}`;
    const countValue = summary[filter.id] || 0;
    button.innerHTML = `
      <span class="queue-cat-label">${escapeHtml(filter.label)}</span>
      <span class="queue-cat-count">${countValue}</span>
    `;
    button.addEventListener("click", () => {
      state.filter = filter.id;
      saveUiState();
      render();
    });
    el.filterBar.appendChild(button);
  });
}

function renderQueue() {
  const tickets = filteredTickets();
  el.ticketList.innerHTML = "";
  if (el.queueTitleCount) {
    el.queueTitleCount.textContent = String(tickets.length);
  }

  if (!tickets.length) {
    el.ticketList.innerHTML = `
      <div class="empty-state">
        <strong>Brak pasujacych zgloszen.</strong>
        <p class="muted">Zmien filtr albo wpisz inny mail, numer zamowienia lub nazwe figurki.</p>
      </div>
    `;
    return;
  }

  tickets.forEach((ticket) => {
    const node = el.ticketCardTemplate.content.firstElementChild.cloneNode(true);
    const statusMeta = STATUS_META[ticket.status];
    const category = categoryForTicket(ticket);
    const waiting = waitingStateForTicket(ticket);
    const badgeText = ticket.needsBaselinker && !ticket.baselinkerDone
      ? "BL check"
      : ticket.status === "sent"
        ? "sent"
        : ticket.status === "ready" || ticket.sendEnabled
          ? "draft ready"
          : statusMeta.label;

    node.classList.toggle("active", ticket.id === state.selectedId);
    node.classList.add("queue-item");
    node.classList.toggle("is-unread", ticket.unread);
    node.querySelector(".queue-item-subject").textContent = ticket.subject;
    node.querySelector(".queue-item-time").textContent = formatAge(ticket.receivedAt);
    node.querySelector(".queue-item-from").textContent = ticket.customerName;
    node.querySelector(".queue-item-order").textContent = ticket.orderNumber || "brak";
    node.querySelector(".queue-item-preview").textContent = ticket.preview;

    const rail = node.querySelector(".queue-item-rail");
    rail.dataset.cat = category;

    const chip = node.querySelector(".queue-chip");
    chip.textContent = CATEGORY_META[category].label;
    chip.dataset.cat = category;

    const waitingNode = node.querySelector(".queue-waiting");
    waitingNode.dataset.waiting = waiting;
    waitingNode.textContent = waiting === "us" ? "czekam na akcje" : "czekam na klienta";

    const badgeNode = node.querySelector(".queue-item-badge");
    badgeNode.textContent = badgeText;

    node.addEventListener("click", () => {
      state.selectedId = ticket.id;
      saveUiState();
      render();
    });

    el.ticketList.appendChild(node);
  });
}

function renderDetail() {
  const ticket = selectedTicket();

  if (!ticket) {
    el.detailView.innerHTML = `
      <div class="empty-state">
        <strong>Nie wybrano zgloszenia.</strong>
        <p class="muted">Kliknij sprawe z kolejki po lewej stronie.</p>
      </div>
    `;
    return;
  }

  const statusMeta = STATUS_META[ticket.status];
  const category = categoryForTicket(ticket);
  const waiting = waitingStateForTicket(ticket);
  const checklistItems = checklistItemsForTicket(ticket);
  const hasDraft = Boolean((ticket.draft || "").trim());
  const readyToSend = canSendTicket(ticket);
  const primaryActionLabel =
    ticket.status === "sent"
      ? "Mail wyslany"
      : readyToSend
        ? isReplyApiConfigured()
          ? "Wyslij maila"
          : state.config.composeFallback
            ? "Otworz w Gmailu"
            : "Gotowe do wysylki"
        : "Przygotuj do wysylki";
  const primaryActionTitle =
    ticket.status === "sent"
      ? "Ta sprawa jest juz oznaczona jako wyslana."
      : readyToSend
        ? isReplyApiConfigured()
          ? "Wysle odpowiedz do klienta przez prywatny backend."
          : state.config.composeFallback
            ? "Otworzy Gmaila z gotowa odpowiedzia do wyslania."
            : "Mail jest przygotowany, ale brak jeszcze backendu wysylki."
        : "Najpierw przygotuj odpowiedz do wysylki.";
  const messageBody = firstInboundMessage(ticket);

  el.detailView.innerHTML = `
    <header class="case-header">
      <div class="case-header-top">
        <div class="case-header-person">
          <span class="avatar-pill">${escapeHtml(initialsForName(ticket.customerName))}</span>
          <div>
            <div class="case-header-name">${escapeHtml(ticket.customerName)}</div>
            <div class="case-header-email">${escapeHtml(ticket.customerEmail)}</div>
          </div>
        </div>
        <div class="case-header-meta">
          <span class="waiting" data-waiting="${waiting}">${waiting === "us" ? "czekam na akcje" : "czekam na klienta"}</span>
          <span class="case-header-time">${formatDate(ticket.receivedAt)}</span>
        </div>
      </div>

      <div class="case-header-subject">
        <span class="chip" data-cat="${category}">${escapeHtml(CATEGORY_META[category].label)}</span>
        <h1 class="case-subject">${escapeHtml(ticket.subject)}</h1>
      </div>

      <div class="case-header-pills">
        <button class="copy-pill" type="button" data-copy-value="${escapeHtml(ticket.orderNumber || "brak")}">
          <span>${escapeHtml(ticket.orderNumber || "brak")}</span>
          <span class="copy-pill-icon">nr</span>
        </button>
        <button class="copy-pill" type="button" data-copy-value="${escapeHtml(ticket.customerEmail)}">
          <span>${escapeHtml(ticket.customerEmail)}</span>
          <span class="copy-pill-icon">@</span>
        </button>
        <button id="copyBaseLinkerBtn" class="btn btn-ghost btn-sm" type="button">Skopiuj do BL</button>
        <span class="badge ${statusMeta.badgeClass}">${statusMeta.label}</span>
      </div>
    </header>

    <section class="case-summary">
      <div class="case-summary-label">Podsumowanie AI</div>
      <p>${escapeHtml(ticket.summary)}</p>
    </section>

    <section class="case-body">
      <div class="case-body-from">
        <span class="case-body-from-name">${escapeHtml(ticket.customerName)}</span>
        <span class="case-body-from-email">&lt;${escapeHtml(ticket.customerEmail)}&gt;</span>
        <span class="case-body-spacer"></span>
        <span class="case-body-time">${formatDate(ticket.receivedAt)}</span>
      </div>
      <pre class="case-body-text">${escapeHtml(messageBody)}</pre>

      <div class="case-inline-meta">
        <span class="section-label">Podglad sprawy</span>
        <p class="case-inline-copy">${escapeHtml(ticket.preview || "")}</p>
      </div>

      ${Array.isArray(ticket.timeline) && ticket.timeline.length > 1 ? `
        <div class="case-history">
          <div class="case-history-toggle">
            <span>Historia watku</span>
            <span class="case-history-count">${ticket.timeline.length}</span>
          </div>
          <ul class="case-history-list">
            ${ticket.timeline
              .map(
                (item) => `
                  <li class="case-history-row" data-dir="${item.author === "IronShield Support" || item.author === "Panel" ? "out" : "in"}">
                    <span class="case-history-subj">${escapeHtml(item.author)}: ${escapeHtml(item.text)}</span>
                    <span class="case-history-time">${escapeHtml(item.time)}</span>
                  </li>
                `
              )
              .join("")}
          </ul>
        </div>
      ` : ""}
    </section>

    <section class="draft">
      <div class="draft-header">
        <div class="draft-header-left">
          <span class="section-label">Draft odpowiedzi</span>
        </div>
        <div class="draft-header-right">
          <button id="copyBtn" type="button" class="btn btn-sm">Kopiuj odpowiedz</button>
        </div>
      </div>

      <div class="draft-workbench">
        <div class="draft-body">
          <textarea id="draftEditor" class="textarea draft-textarea" placeholder="Tutaj pojawi sie draft odpowiedzi."></textarea>
        </div>
        <div class="draft-hint">
          <div class="draft-hint-label">Twoje wskazowki do draftu</div>
          <textarea id="operatorHintEditor" class="textarea draft-hint-textarea" placeholder="np. napisz ze produkcja 5 dni i wysylka 7-10, albo popros o fotki zmierzonych figurek z linijka"></textarea>
          <div class="draft-hint-chips">
            ${HINT_CHIPS.map((chip) => `<button type="button" class="draft-hint-chip" data-hint-chip="${escapeHtml(chip)}">+ ${escapeHtml(chip)}</button>`).join("")}
          </div>
          <button id="generateDraftBtn" type="button" class="btn btn-primary btn-sm draft-hint-apply">Przerob wg wskazowek</button>
        </div>
      </div>
    </section>

    <section class="qa-bar">
      <div class="qa-bar-label">
        <span class="section-label">Szybkie akcje</span>
      </div>
      <div class="qa-bar-btns">
        <button id="needsBlBtn" type="button" class="btn btn-sm">Oznacz: trzeba BaseLinker</button>
        <button id="blDoneBtn" type="button" class="btn btn-sm">${ticket.baselinkerDone ? "Cofnij BL done" : "BaseLinker zrobiony"}</button>
        <button id="markSentBtn" type="button" class="btn btn-sm">Oznacz jako wyslane</button>
      </div>
    </section>

    <section class="checklist">
      <div class="checklist-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="section-label">Kroki operacyjne</span>
        </div>
      </div>
      <ul class="checklist-list">
        ${checklistItems
          .map((item) => {
            if (item.kind === "external") {
              return `
                <li class="step-row step-external">
                  <span class="step-gutter">#</span>
                  <div class="step-label">
                    <span class="step-text">${escapeHtml(item.label)}</span>
                    <span class="step-hint">${escapeHtml(item.hint || "")}</span>
                  </div>
                  <button class="btn btn-sm" type="button" data-step-open="${escapeHtml(item.id)}">Skopiuj numer</button>
                  <span class="step-kind-tag">manual</span>
                </li>
              `;
            }

            return `
              <li class="step-row step-check${item.done ? " is-done" : ""}">
                <input id="check-${escapeHtml(item.id)}" data-step-check="${escapeHtml(item.id)}" class="check" type="checkbox" ${item.done ? "checked" : ""} />
                <label for="check-${escapeHtml(item.id)}" class="step-label">
                  <span class="step-text">${escapeHtml(item.label)}</span>
                  <span class="step-hint">${escapeHtml(item.hint || "")}</span>
                </label>
                <span class="step-kind-tag">manual</span>
              </li>
            `;
          })
          .join("")}
      </ul>
    </section>

    <div class="sendbar">
      <div class="sendbar-left">
        <span class="section-label">Co dalej</span>
      </div>
      <div class="sendbar-right">
        ${state.config.composeFallback && primaryActionLabel !== "Otworz w Gmailu" ? `<button id="openGmailBtn" type="button" class="btn btn-sm">Otworz w Gmailu</button>` : ""}
        <button id="primaryDraftBtn" type="button" class="btn btn-primary btn-sm" ${!hasDraft || ticket.status === "sent" ? "disabled" : ""} title="${escapeHtml(primaryActionTitle)}">${primaryActionLabel}</button>
      </div>
    </div>
  `;

  const operatorHintEditor = document.getElementById("operatorHintEditor");
  const draftEditor = document.getElementById("draftEditor");
  operatorHintEditor.value = ticket.operatorHint || "";
  draftEditor.value = ticket.draft || buildBaseDraftFromTicket(ticket);

  operatorHintEditor.addEventListener("input", (event) => {
    updateTicket(ticket.id, { operatorHint: event.target.value }, { renderNow: false });
  });

  draftEditor.addEventListener("input", (event) => {
    updateTicket(ticket.id, { draft: event.target.value }, { renderNow: false });
  });

  document.querySelectorAll("[data-copy-value]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copyValue || "");
        toast("Skopiowane.");
      } catch {
        toast("Nie udalo sie skopiowac.");
      }
    });
  });

  document.querySelectorAll("[data-hint-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.hintChip || "";
      operatorHintEditor.value = operatorHintEditor.value.trim()
        ? `${operatorHintEditor.value.trim()}, ${value}`
        : value;
      updateTicket(ticket.id, { operatorHint: operatorHintEditor.value }, { renderNow: false });
    });
  });

  document.getElementById("copyBaseLinkerBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(ticket.orderNumber || "");
      toast("Skopiowalem numer zamowienia do wyszukania w BaseLinkerze.");
    } catch {
      toast("Nie udalo sie skopiowac numeru zamowienia.");
    }
  });

  document.getElementById("generateDraftBtn").addEventListener("click", () => {
    const liveTicket = selectedTicket() || ticket;
    const previousDraft = String(draftEditor.value || "").trim();
    const nextDraft = buildDraftFromTicket(
      { ...liveTicket, draft: draftEditor.value, operatorHint: operatorHintEditor.value },
      operatorHintEditor.value,
      draftEditor.value
    );
    draftEditor.value = nextDraft;
    updateTicket(
      liveTicket.id,
      {
        draft: nextDraft,
        operatorHint: operatorHintEditor.value,
      },
      { renderNow: false }
    );

    if (!operatorHintEditor.value.trim()) {
      toast("Wpisz najpierw wskazowke do draftu.");
      return;
    }

    if (String(nextDraft).trim() === previousDraft) {
      toast("Ta wskazowka nie zmienila draftu. Napisz ja prosciej, np. 'popros o zdjecia' albo 'dodaj wysylka 7-10 dni'.");
      return;
    }

    toast("Draft przerobiony wedlug Twoich wskazowek.");
  });

  document.querySelectorAll("[data-step-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const stepId = checkbox.dataset.stepCheck;

      if (stepId === "review") {
        updateTicket(ticket.id, { unread: !checkbox.checked });
        return;
      }

      if (stepId === "ops") {
        updateTicket(ticket.id, {
          needsBaselinker: true,
          baselinkerDone: checkbox.checked,
          unread: false,
        });
        return;
      }

      if (stepId === "send") {
        updateTicket(ticket.id, { status: checkbox.checked ? "sent" : "ready", unread: false });
      }
    });
  });

  document.querySelectorAll("[data-step-open]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(ticket.orderNumber || "");
        toast("Numer zamowienia skopiowany do wyszukania w BaseLinkerze.");
      } catch {
        toast("Nie udalo sie skopiowac numeru zamowienia.");
      }
    });
  });

  document.getElementById("primaryDraftBtn").addEventListener("click", async () => {
    const currentDraft = draftEditor.value.trim();

    if (!currentDraft) {
      toast("Najpierw uzupelnij draft odpowiedzi.");
      draftEditor.focus();
      return;
    }

    if (!canSendTicket({ ...ticket, draft: currentDraft })) {
      updateTicket(ticket.id, {
        status: "ready",
        unread: false,
        sendEnabled: true,
        draft: currentDraft,
      });
      toast(
        isReplyApiConfigured()
          ? "Draft przygotowany. Mozesz teraz kliknac Wyslij maila."
          : state.config.composeFallback
            ? "Draft przygotowany. Mozesz teraz otworzyc odpowiedz w Gmailu."
            : "Draft przygotowany do wysylki."
      );
      return;
    }

    const primaryBtn = document.getElementById("primaryDraftBtn");
    primaryBtn.disabled = true;
    primaryBtn.textContent = isReplyApiConfigured()
      ? "Wysylanie..."
      : state.config.composeFallback
        ? "Otwieram Gmail..."
        : "Brak backendu";

    try {
      const result = await sendReply({ ...ticket, draft: currentDraft }, currentDraft);

      if (result?.composed) {
        updateTicket(ticket.id, {
          unread: false,
          sendEnabled: true,
          draft: currentDraft,
          timeline: [
            ...(ticket.timeline || []),
            {
              author: "Panel",
              time: formatDate(new Date().toISOString()),
              text: "Otwarto Gmaila z przygotowana odpowiedzia do wyslania.",
            },
          ],
        });
        toast("Otworzylem Gmaila z gotowa odpowiedzia. Po wyslaniu oznacz sprawe jako wyslana.");
        return;
      }

      updateTicket(ticket.id, {
        status: "sent",
        unread: false,
        sendEnabled: false,
        draft: currentDraft,
        timeline: [
          ...(ticket.timeline || []),
          {
            author: "IronShield Support",
            time: formatDate(new Date().toISOString()),
            text: "Draft zostal wyslany do klienta z panelu.",
          },
        ],
      });
      toast("Mail wyslany do klienta.");
    } catch (error) {
      if (error?.message === "reply_not_configured") {
        toast("Ta wersja panelu nie ma jeszcze bezposredniej wysylki. Skorzystaj z Gmaila albo kopiowania.");
      } else {
        toast("Nie udalo sie wyslac maila. Sprawdz backend reply i sprobuj ponownie.");
      }

      primaryBtn.disabled = false;
      primaryBtn.textContent = primaryActionLabel;
    }
  });

  document.getElementById("copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(draftEditor.value);
      toast("Odpowiedz skopiowana do schowka.");
    } catch {
      toast("Nie udalo sie skopiowac. Skopiuj tekst recznie.");
    }
  });

  if (document.getElementById("openGmailBtn")) {
    document.getElementById("openGmailBtn").addEventListener("click", () => {
      const currentDraft = draftEditor.value.trim();
      if (!currentDraft) {
        toast("Najpierw przygotuj draft.");
        return;
      }

      openComposeFallback(ticket, currentDraft);
      toast("Otworzylem Gmaila z gotowa odpowiedzia.");
    });
  }

  document.getElementById("needsBlBtn").addEventListener("click", () => {
    updateTicket(ticket.id, {
      status: "needs-baselinker",
      needsBaselinker: true,
      unread: false,
    });
    toast("Sprawa oznaczona jako wymagajaca BaseLinkera.");
  });

  document.getElementById("blDoneBtn").addEventListener("click", () => {
    updateTicket(ticket.id, {
      baselinkerDone: !ticket.baselinkerDone,
      unread: false,
    });
    toast(ticket.baselinkerDone ? "Cofnieto znacznik BaseLinkera." : "BaseLinker oznaczony jako zrobiony.");
  });

  document.getElementById("markSentBtn").addEventListener("click", () => {
    updateTicket(ticket.id, { status: "sent", unread: false });
    toast("Sprawa oznaczona jako wyslana.");
  });
}

function renderOpsPanel() {
  const ticket = selectedTicket();

  if (!ticket) {
    el.opsSummary.innerHTML = `<div class="ops-empty"><p class="muted">Wybierz zgloszenie z kolejki.</p></div>`;
    el.opsChecklist.innerHTML = "";
    return;
  }

  const statusMeta = STATUS_META[ticket.status];
  const opsItems = [];

  if (ticket.unread) {
    opsItems.push("Masz nowy mail klienta. Najpierw przeczytaj draft i zdecyduj czy go puszczasz.");
  }
  if (ticket.needsBaselinker && !ticket.baselinkerDone) {
    opsItems.push("Najpierw reczna akcja w BaseLinkerze albo na produkcji, dopiero potem finalny mail.");
  }
  if (ticket.status === "ready") {
    opsItems.push("Draft jest gotowy. Mozesz go skopiowac albo potraktowac jako referencje procesu.");
  }
  if (ticket.status === "sent") {
    opsItems.push("W panelu sprawa jest zamknieta. Czekaj tylko na kolejna odpowiedz klienta.");
  }
  if (!opsItems.length) {
    opsItems.push("Panel nie wykryl czerwonej flagi. Sprawdz draft i zdecyduj, czy temat jest gotowy do kolejnego kroku.");
  }

  el.opsSummary.innerHTML = `
    <div class="ops-card">
      <p class="mini-label">Aktualnie wybrane</p>
      <strong>${escapeHtml(ticket.customerName)}</strong>
      <p>${escapeHtml(ticket.subject)}</p>
      <div class="ops-pills">
        <span class="badge ${statusMeta.badgeClass}">${statusMeta.label}</span>
        <span class="badge">${escapeHtml(ticket.orderNumber || "brak")}</span>
        <span class="badge">${ticket.baselinkerDone ? "BL done" : "BL open"}</span>
      </div>
    </div>
    <div class="ops-card">
      <p class="mini-label">Operacyjny skrot</p>
      <strong>${escapeHtml(ticket.internalCta.baseLinkerAction)}</strong>
      <p>${escapeHtml(ticket.internalCta.notes)}</p>
    </div>
  `;

  el.opsChecklist.innerHTML = opsItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function updateTicket(id, changes, { renderNow = true } = {}) {
  state.tickets = state.tickets.map((ticket) => (ticket.id === id ? { ...ticket, ...changes } : ticket));
  state.overrides[id] = { ...(state.overrides[id] || {}) };

  MUTABLE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(changes, field)) {
      state.overrides[id][field] = changes[field];
    }
  });

  saveOverrides();
  saveUiState();

  if (renderNow) {
    render();
  }
}

function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);

  window.setTimeout(() => node.remove(), 2400);
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  renderTweaks();
  renderRuntimeLabels();
  renderStats();
  renderAlert();
  renderSyncMeta();
  renderFilters();
  renderQueue();
  renderDetail();
}

function applyPayloadFromRemote(rawPayload) {
  applyPayload(rawPayload);
  saveUiState();
  render();
}

function base64ToBytes(value) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function concatBytes(left, right) {
  const combined = new Uint8Array(left.length + right.length);
  combined.set(left, 0);
  combined.set(right, left.length);
  return combined;
}

async function deriveFeedKey(passcode, salt, iterations) {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"]
  );
}

async function decryptEncryptedFeed(envelope, passcode) {
  if (!envelope || typeof envelope !== "object") {
    throw new Error("feed_missing");
  }

  const iterations = Number(envelope?.kdf?.iterations);
  if (!Number.isFinite(iterations) || iterations < 1000) {
    throw new Error("feed_kdf_invalid");
  }

  const salt = base64ToBytes(envelope.kdf.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);
  const tag = base64ToBytes(envelope.tag);
  const encryptedBytes = concatBytes(ciphertext, tag);
  const key = await deriveFeedKey(passcode, salt, iterations);

  const plainBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    key,
    encryptedBytes
  );

  return JSON.parse(new TextDecoder().decode(plainBuffer));
}

function fetchRemotePayload() {
  return fetch(state.config.remoteDataUrl, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`remote_status_${response.status}`);
    }

    return response.json();
  });
}

function postReplyPayload(payload) {
  return fetch(state.config.replyApiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`reply_status_${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return {};
    }

    return response.json();
  });
}

function buildReplyPayload(ticket, draft) {
  return {
    id: ticket.id,
    customerEmail: ticket.customerEmail,
    customerName: ticket.customerName,
    subject: ticket.subject,
    orderNumber: ticket.orderNumber,
    draft,
    replyMessageId: ticket.replyMessageId || "",
    gmailThreadId: ticket.gmailThreadId || "",
  };
}

function openComposeFallback(ticket, draft) {
  const subjectPrefix = /^re:/i.test(ticket.subject || "") ? "" : "Re: ";
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    tf: "1",
    to: ticket.customerEmail || "",
    su: `${subjectPrefix}${ticket.subject || ""}`,
    body: draft,
  });

  window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank", "noopener");
}

async function sendReply(ticket, draft) {
  if (isReplyApiConfigured()) {
    return postReplyPayload(buildReplyPayload(ticket, draft));
  }

  if (state.config.composeFallback) {
    openComposeFallback(ticket, draft);
    return { composed: true };
  }

  throw new Error("reply_not_configured");
}

function fetchEncryptedPayload(passcode) {
  return fetch(state.config.encryptedFeedUrl, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`encrypted_status_${response.status}`);
      }

      return response.json();
    })
    .then((envelope) => decryptEncryptedFeed(envelope, passcode));
}

function loadDemoScriptPayload() {
  return new Promise((resolve, reject) => {
    const staleRuntimeScripts = document.querySelectorAll('script[data-role="support-data-runtime"]');
    staleRuntimeScripts.forEach((script) => script.remove());

    const script = document.createElement("script");
    script.src = `${LIVE_DATA_SCRIPT}?ts=${Date.now()}`;
    script.async = true;
    script.dataset.role = "support-data-runtime";

    script.onload = () => resolve(window.__IRONSHIELD_SUPPORT_DATA__);
    script.onerror = () => reject(new Error("demo_feed_failed"));

    document.head.appendChild(script);
  });
}

async function refreshLiveData({ silent = false, passcode = "" } = {}) {
  if (state.isSyncing || (authEnabled() && !state.isUnlocked && !passcode) || hasPrivateSnapshot()) {
    return false;
  }

  const before = {
    updatedAt: state.liveMeta.updatedAt,
    ticketCount: state.liveMeta.ticketCount,
  };
  state.isSyncing = true;
  renderSyncMeta();

  try {
    if (usesEncryptedFeed()) {
      const secret = passcode || state.feedPasscode;

      if (!secret) {
        throw new Error("missing_passcode");
      }

      const payload = await fetchEncryptedPayload(secret);
      state.feedPasscode = secret;
      applyPayloadFromRemote(payload);
      state.liveMeta.checkedAt = new Date().toISOString();

      if (!silent) {
        toast(
          before.updatedAt === state.liveMeta.updatedAt && before.ticketCount === state.liveMeta.ticketCount
            ? "Skrzynka sprawdzona. Brak nowych zmian."
            : "Feed klientow odswiezony."
        );
      }

      return true;
    }

    if (usesRemoteApi()) {
      const payload = await fetchRemotePayload();
      applyPayloadFromRemote(payload);
      state.liveMeta.checkedAt = new Date().toISOString();

      if (!silent) {
        toast(
          before.updatedAt === state.liveMeta.updatedAt && before.ticketCount === state.liveMeta.ticketCount
            ? "API sprawdzone. Brak nowych zmian."
            : "Dane z prywatnego API odswiezone."
        );
      }

      return true;
    }

    const payload = await loadDemoScriptPayload();
    applyPayload(payload);
    state.liveMeta.checkedAt = new Date().toISOString();
    saveUiState();
    render();

    if (!silent) {
      toast(
        before.updatedAt === state.liveMeta.updatedAt && before.ticketCount === state.liveMeta.ticketCount
          ? "Feed sprawdzony. Brak nowych zmian."
          : "Dane dashboardu odswiezone."
      );
    }

    return true;
  } catch (error) {
    state.liveMeta.checkedAt = new Date().toISOString();
    renderSyncMeta();
    if (!silent) {
      toast(
        usesEncryptedFeed()
          ? "Nie udalo sie odczytac feedu klientow."
          : usesRemoteApi()
            ? "Nie udalo sie pobrac danych z prywatnego API."
            : "Nie udalo sie odswiezyc feedu dashboardu."
      );
    }
    return false;
  } finally {
    state.isSyncing = false;
    renderSyncMeta();
  }
}

function importPrivateSnapshot(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const raw = JSON.parse(String(reader.result || "{}"));
      const payload =
        raw && raw.payload && Array.isArray(raw.payload.tickets)
          ? raw.payload
          : raw;
      const normalized = normalizePayload(payload);
      const snapshot = {
        name: file.name,
        savedAt: new Date().toISOString(),
        payload: normalized,
      };

      savePrivateSnapshot(snapshot);
      applyPayload(normalized);
      saveUiState();
      render();
      toast("Prywatny snapshot zostal wczytany do panelu.");
    } catch {
      toast("Nie udalo sie wczytac snapshotu. Sprawdz, czy plik jest poprawnym JSON-em.");
    } finally {
      el.importSnapshotInput.value = "";
    }
  };

  reader.onerror = () => {
    el.importSnapshotInput.value = "";
    toast("Nie udalo sie odczytac pliku snapshotu.");
  };

  reader.readAsText(file);
}

function attachEvents() {
  el.searchInput.value = state.search;

  el.unlockBtn.addEventListener("click", () => {
    unlockPanel();
  });

  el.passcodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      unlockPanel();
    }
  });

  el.lockPanelBtn.addEventListener("click", () => {
    lockPanel();
  });

  if (el.tweaksToggleBtn) {
    el.tweaksToggleBtn.addEventListener("click", () => {
      toggleTweaksPanel();
    });
  }

  if (el.closeTweaksBtn) {
    el.closeTweaksBtn.addEventListener("click", () => {
      toggleTweaksPanel(false);
    });
  }

  if (el.tweaksPanel) {
    el.tweaksPanel.querySelectorAll("[data-tweak-key]").forEach((button) => {
      button.addEventListener("click", () => {
        setTweak(button.dataset.tweakKey, button.dataset.tweakValue);
      });
    });
  }

  if (el.importSnapshotBtn && el.importSnapshotInput) {
    el.importSnapshotBtn.addEventListener("click", () => {
      el.importSnapshotInput.click();
    });

    el.importSnapshotInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      importPrivateSnapshot(file);
    });
  }

  if (el.clearSnapshotBtn) {
    el.clearSnapshotBtn.addEventListener("click", () => {
      savePrivateSnapshot(null);
      applyDefaultPayload();
      saveUiState();
      render();
      toast("Wylaczono prywatny snapshot. Panel wrocil do danych demo.");
    });
  }

  el.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    saveUiState();
    renderQueue();
  });

  el.resetDemoBtn.addEventListener("click", () => {
    state.overrides = {};
    saveOverrides();
    applyDefaultPayload();
    saveUiState();
    render();
    toast(hasPrivateSnapshot() ? "Wyczyszczono lokalne zmiany na prywatnym snapshotcie." : "Wyczyszczono lokalne zmiany panelu.");
  });

  el.syncNowBtn.addEventListener("click", () => {
    refreshLiveData();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.tweaksOpen) {
      toggleTweaksPanel(false);
    }
  });
}

loadUiState();
loadOverrides();
state.tweaks = readTweaks();
state.config = runtimeConfig();
state.isUnlocked = readAuthState();
state.privateSnapshot = readPrivateSnapshot();
applyDefaultPayload();
applyTweaks();
attachEvents();
render();
applyAuthState();
if (usesRemoteApi()) {
  refreshLiveData({ silent: true });
}
window.setInterval(() => refreshLiveData({ silent: true }), state.config.refreshIntervalMs);
