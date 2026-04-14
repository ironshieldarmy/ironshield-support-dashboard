const UI_STORAGE_KEY = "ironshield_support_ui_v3";
const OVERRIDES_STORAGE_KEY = "ironshield_support_overrides_v3";
const AUTH_STATE_KEY = "ironshield_support_auth_v1";
const PRIVATE_SNAPSHOT_KEY = "ironshield_support_private_snapshot_v1";
const LIVE_DATA_SCRIPT = "support-data.js";
const DEFAULT_CONFIG = {
  mode: "demo",
  remoteDataUrl: "",
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
  { id: "all", label: "Wszystko" },
  { id: "new", label: "Nowe" },
  { id: "needs-baselinker", label: "BaseLinker" },
  { id: "ready", label: "Gotowe do wysylki" },
  { id: "waiting", label: "Czeka na klienta" },
  { id: "sent", label: "Wyslane" },
];

const STATUS_META = {
  new: { label: "Nowy mail", badgeClass: "badge-danger" },
  "needs-baselinker": { label: "Wymaga BaseLinkera", badgeClass: "badge-warn" },
  ready: { label: "Gotowe do wysylki", badgeClass: "badge-accent" },
  waiting: { label: "Czeka na klienta", badgeClass: "" },
  sent: { label: "Wyslane", badgeClass: "" },
};

const MUTABLE_FIELDS = [
  "status",
  "unread",
  "needsBaselinker",
  "baselinkerDone",
  "draft",
  "sendEnabled",
  "internalCta",
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
    syncSource: "fallback",
    ticketCount: 0,
  },
  isSyncing: false,
  isUnlocked: true,
  isUnlocking: false,
  privateSnapshot: null,
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
  runtimeModeLabel: document.getElementById("runtimeModeLabel"),
  runtimeFeaturesLabel: document.getElementById("runtimeFeaturesLabel"),
  runtimeNextStepLabel: document.getElementById("runtimeNextStepLabel"),
  statCardTemplate: document.getElementById("statCardTemplate"),
  ticketCardTemplate: document.getElementById("ticketCardTemplate"),
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function runtimeConfig() {
  const raw = window.__IRONSHIELD_SUPPORT_CONFIG__ || {};
  const labels = raw.labels && typeof raw.labels === "object" ? raw.labels : {};
  const auth = raw.auth && typeof raw.auth === "object" ? raw.auth : {};

  return {
    mode: raw.mode === "remote" ? "remote" : "demo",
    remoteDataUrl: typeof raw.remoteDataUrl === "string" ? raw.remoteDataUrl.trim() : "",
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

function hasPrivateSnapshot() {
  return Boolean(state.privateSnapshot && state.privateSnapshot.payload);
}

function authEnabled() {
  return state.config.auth.enabled && Boolean(state.config.auth.passcodeHash);
}

function readAuthState() {
  if (!authEnabled()) return true;
  return sessionStorage.getItem(AUTH_STATE_KEY) === state.config.auth.passcodeHash;
}

function persistAuthState(unlocked) {
  if (!authEnabled()) return;

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
      if (state.filter !== "all" && ticket.status !== state.filter) return false;
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
    .sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      return new Date(b.receivedAt) - new Date(a.receivedAt);
    });
}

function renderStats() {
  const summary = counts();
  const items = [
    {
      label: "Nowe maile",
      value: String(summary.unread),
      subtitle: "Swieze wiadomosci, ktore wymagaja ruchu supportu.",
      tone: "danger",
    },
    {
      label: "Do BaseLinkera",
      value: String(summary.ops),
      subtitle: "Sprawy, gdzie bez recznej operacji nie ma finalnej odpowiedzi.",
      tone: "warn",
    },
    {
      label: "Gotowe drafty",
      value: String(summary.ready),
      subtitle: "Tu draft juz jest, a Ty tylko go przegladasz lub kopiujesz.",
      tone: "accent",
    },
    {
      label: "Sync source",
      value: state.liveMeta.ticketCount ? String(state.liveMeta.ticketCount) : "0",
      subtitle: `Ostatni feed: ${state.liveMeta.syncSource}`,
      tone: "neutral",
    },
  ];

  el.statsGrid.innerHTML = "";

  items.forEach((item) => {
    const node = el.statCardTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(`stat-card--${item.tone}`);
    node.querySelector(".mini-label").textContent = item.label;
    node.querySelector(".stat-value").textContent = item.value;
    node.querySelector(".stat-subtitle").textContent = item.subtitle;
    el.statsGrid.appendChild(node);
  });
}

function renderAlert() {
  const unreadTickets = state.tickets.filter((ticket) => ticket.unread);

  el.alertHeadline.textContent = unreadTickets.length
    ? `${unreadTickets.length} mail(e) klientow czekaja na ruch`
    : "Brak nowych maili klientow";

  if (!unreadTickets.length) {
    el.alertSubline.textContent =
      usesRemoteApi()
        ? "Panel jest ustawiony na prywatne API. Gdy backend zwroci nowe sprawy, pojawia sie tutaj."
        : "To publiczna wersja demo. Nowe dane pojawia sie dopiero po aktualizacji feedu w repozytorium.";
    return;
  }

  el.alertSubline.textContent = unreadTickets
    .slice(0, 3)
    .map((ticket) => `${ticket.customerName} (${ticket.orderNumber})`)
    .join(", ");
}

function renderSyncMeta() {
  const updated = state.liveMeta.updatedAt ? formatDate(state.liveMeta.updatedAt) : "brak syncu";
  const syncingText = authEnabled() && !state.isUnlocked
    ? "Panel jest zablokowany haslem operatora."
    : hasPrivateSnapshot()
      ? `Aktywny jest prywatny snapshot z pliku ${state.privateSnapshot.name}.`
      : state.isSyncing
        ? usesRemoteApi()
          ? "Trwa odswiezanie prywatnego API..."
          : "Trwa odswiezanie feedu demo..."
        : usesRemoteApi()
          ? "Panel czyta prywatny endpoint JSON."
          : "Panel czyta publiczny plik support-data.js.";
  el.syncMeta.textContent = `Ostatni sync: ${updated}. Zrodlo: ${state.liveMeta.syncSource}. ${syncingText}`;
  el.syncNowBtn.disabled = state.isSyncing || (authEnabled() && !state.isUnlocked) || hasPrivateSnapshot();
  el.syncNowBtn.textContent = hasPrivateSnapshot()
    ? "Snapshot aktywny"
    : state.isSyncing
      ? "Odswiezanie..."
      : "Odswiez dane";
  el.clearSnapshotBtn.hidden = !hasPrivateSnapshot();
}

function renderRuntimeLabels() {
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
  const summary = counts();
  el.filterBar.innerHTML = "";

  FILTERS.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${state.filter === filter.id ? " active" : ""}`;
    const countValue = filter.id === "all" ? summary.all : summary[filter.id];
    button.textContent = `${filter.label} (${countValue})`;
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

    node.classList.toggle("active", ticket.id === state.selectedId);
    node.classList.add(`ticket-card--${ticket.status}`);
    node.classList.toggle("is-unread", ticket.unread);
    node.classList.toggle("needs-ops", ticket.needsBaselinker && !ticket.baselinkerDone);
    node.querySelector(".ticket-name").textContent = ticket.customerName;
    node.querySelector(".ticket-age").textContent = formatAge(ticket.receivedAt);
    node.querySelector(".ticket-subject").textContent = ticket.subject;
    node.querySelector(".ticket-preview").textContent = ticket.preview;
    node.querySelector(".ticket-order").textContent = ticket.orderNumber || "brak";

    const statusNode = node.querySelector(".ticket-status");
    statusNode.textContent = ticket.unread ? `${statusMeta.label} • new` : statusMeta.label;
    statusNode.className = `ticket-status badge ${statusMeta.badgeClass}`.trim();

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
  const focus = focusMessage(ticket);

  el.detailView.innerHTML = `
    <article class="customer-card customer-card--${ticket.status}">
      <div class="detail-top">
        <div>
          <p class="eyebrow">Wybrane zgloszenie</p>
          <h2>${escapeHtml(ticket.subject)}</h2>
        </div>
        <div class="detail-badges">
          <span class="badge ${statusMeta.badgeClass}">${statusMeta.label}</span>
          <span class="badge">${escapeHtml(ticket.source || "Repo feed")}</span>
          <span class="badge">${escapeHtml(ticket.language || "EN")}</span>
        </div>
      </div>

      <div class="customer-grid">
        <div>
          <span class="mini-label">Klient</span>
          <strong class="customer-name">${escapeHtml(ticket.customerName)}</strong>
          <p class="customer-email">${escapeHtml(ticket.customerEmail)}</p>
        </div>
        <div>
          <span class="mini-label">Numer zamowienia</span>
          <strong>${escapeHtml(ticket.orderNumber || "brak")}</strong>
          <p>${formatDate(ticket.receivedAt)}</p>
        </div>
        <div>
          <span class="mini-label">BaseLinker check</span>
          <strong>${ticket.needsBaselinker ? "Tak" : "Nie"}</strong>
          <p>${ticket.baselinkerDone ? "Oznaczone jako zrobione" : "Otwarte"}</p>
        </div>
      </div>
    </article>

    <article class="focus-card focus-card--${ticket.status}">
      <p class="mini-label">Najwazniejsze teraz</p>
      <strong>${escapeHtml(focus.title)}</strong>
      <p class="detail-copy">${escapeHtml(focus.body)}</p>
    </article>

    <article class="summary-strip summary-strip--${ticket.status}">
      <div>
        <p class="mini-label">Podsumowanie sprawy</p>
        <h3 class="summary-title">${escapeHtml(ticket.summary)}</h3>
      </div>
      <div class="tag-row">
        ${ticket.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </article>

    <article class="cta-card cta-card--${ticket.status}">
      <p class="mini-label">CTA dla Ciebie</p>
      <ul class="cta-list">
        <li><strong>Numer zamowienia:</strong> ${escapeHtml(ticket.internalCta.orderNumber)}</li>
        <li><strong>Mail klienta:</strong> ${escapeHtml(ticket.internalCta.customerEmail)}</li>
        <li><strong>Co zrobic w BaseLinkerze / na produkcji:</strong> ${escapeHtml(ticket.internalCta.baseLinkerAction)}</li>
        <li><strong>Uwagi:</strong> ${escapeHtml(ticket.internalCta.notes)}</li>
      </ul>
    </article>

    <article class="composer-card composer-card--${ticket.status}">
      <label for="draftEditor">
        <span class="mini-label">Proponowana odpowiedz</span>
        <textarea id="draftEditor"></textarea>
      </label>

      <div class="composer-actions">
        <button id="approveBtn" type="button" class="action-btn primary">Zatwierdz draft</button>
        <button id="copyBtn" type="button" class="action-btn">Kopiuj odpowiedz</button>
        <button id="needsBlBtn" type="button" class="action-btn">Oznacz: trzeba BaseLinker</button>
        <button id="blDoneBtn" type="button" class="action-btn secondary">${ticket.baselinkerDone ? "BaseLinker zrobiony" : "Oznacz BaseLinker jako zrobiony"}</button>
        <button id="markSentBtn" type="button" class="action-btn">Oznacz jako wyslane</button>
        <button id="sendBtn" type="button" class="action-btn" disabled>Niedostepne w demo</button>
      </div>
      <p class="composer-note">
        Publiczna wersja demo nie wysyla maili. Wysylka wroci dopiero po podpietym prywatnym backendzie.
      </p>
    </article>

    <article class="timeline-card">
      <p class="mini-label">Historia watku</p>
      ${ticket.timeline
        .map(
          (item) => `
            <div class="timeline-item">
              <div>
                <strong class="timeline-author">${escapeHtml(item.author)}</strong>
                <p>${escapeHtml(item.text)}</p>
              </div>
              <span class="timeline-time">${escapeHtml(item.time)}</span>
            </div>
          `
        )
        .join("")}
    </article>
  `;

  const draftEditor = document.getElementById("draftEditor");
  draftEditor.value = ticket.draft || "";

  draftEditor.addEventListener("input", (event) => {
    updateTicket(ticket.id, { draft: event.target.value });
  });

  document.getElementById("approveBtn").addEventListener("click", () => {
    updateTicket(ticket.id, { status: "ready", unread: false });
    toast("Draft zatwierdzony.");
  });

  document.getElementById("copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(draftEditor.value);
      toast("Odpowiedz skopiowana do schowka.");
    } catch {
      toast("Nie udalo sie skopiowac. Skopiuj tekst recznie.");
    }
  });

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

function updateTicket(id, changes) {
  state.tickets = state.tickets.map((ticket) => (ticket.id === id ? { ...ticket, ...changes } : ticket));
  state.overrides[id] = { ...(state.overrides[id] || {}) };

  MUTABLE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(changes, field)) {
      state.overrides[id][field] = changes[field];
    }
  });

  saveOverrides();
  saveUiState();
  render();
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
  renderRuntimeLabels();
  renderStats();
  renderAlert();
  renderSyncMeta();
  renderFilters();
  renderQueue();
  renderDetail();
  renderOpsPanel();
}

function applyPayloadFromRemote(rawPayload) {
  applyPayload(rawPayload);
  saveUiState();
  render();
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

function refreshLiveData({ silent = false } = {}) {
  if (state.isSyncing || (authEnabled() && !state.isUnlocked) || hasPrivateSnapshot()) return;

  state.isSyncing = true;
  renderSyncMeta();

  if (usesRemoteApi()) {
    fetchRemotePayload()
      .then((payload) => {
        state.isSyncing = false;
        applyPayloadFromRemote(payload);
        if (!silent) {
          toast("Dane z prywatnego API odswiezone.");
        }
      })
      .catch(() => {
        state.isSyncing = false;
        renderSyncMeta();
        if (!silent) {
          toast("Nie udalo sie pobrac danych z prywatnego API.");
        }
      });

    return;
  }

  const staleRuntimeScripts = document.querySelectorAll('script[data-role="support-data-runtime"]');
  staleRuntimeScripts.forEach((script) => script.remove());

  const script = document.createElement("script");
  script.src = `${LIVE_DATA_SCRIPT}?ts=${Date.now()}`;
  script.async = true;
  script.dataset.role = "support-data-runtime";

  script.onload = () => {
    state.isSyncing = false;
    applyPayload(window.__IRONSHIELD_SUPPORT_DATA__);
    saveUiState();
    render();
    if (!silent) {
      toast("Dane dashboardu odswiezone.");
    }
  };

  script.onerror = () => {
    state.isSyncing = false;
    renderSyncMeta();
    if (!silent) {
      toast("Nie udalo sie odswiezyc feedu dashboardu.");
    }
  };

  document.head.appendChild(script);
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

  el.importSnapshotBtn.addEventListener("click", () => {
    el.importSnapshotInput.click();
  });

  el.importSnapshotInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importPrivateSnapshot(file);
  });

  el.clearSnapshotBtn.addEventListener("click", () => {
    savePrivateSnapshot(null);
    applyDefaultPayload();
    saveUiState();
    render();
    toast("Wylaczono prywatny snapshot. Panel wrocil do danych demo.");
  });

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
}

loadUiState();
loadOverrides();
state.config = runtimeConfig();
state.isUnlocked = readAuthState();
state.privateSnapshot = readPrivateSnapshot();
applyDefaultPayload();
attachEvents();
render();
applyAuthState();
if (usesRemoteApi()) {
  refreshLiveData({ silent: true });
}
window.setInterval(() => refreshLiveData({ silent: true }), state.config.refreshIntervalMs);
