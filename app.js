const UI_STORAGE_KEY = "ironshield_support_ui_v3";
const OVERRIDES_STORAGE_KEY = "ironshield_support_overrides_v3";
const LIVE_DATA_SCRIPT = "support-data.js";

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
};

const el = {
  statsGrid: document.getElementById("statsGrid"),
  filterBar: document.getElementById("filterBar"),
  ticketList: document.getElementById("ticketList"),
  detailView: document.getElementById("detailView"),
  opsSummary: document.getElementById("opsSummary"),
  opsChecklist: document.getElementById("opsChecklist"),
  searchInput: document.getElementById("searchInput"),
  resetDemoBtn: document.getElementById("resetDemoBtn"),
  syncNowBtn: document.getElementById("syncNowBtn"),
  syncMeta: document.getElementById("syncMeta"),
  alertHeadline: document.getElementById("alertHeadline"),
  alertSubline: document.getElementById("alertSubline"),
  statCardTemplate: document.getElementById("statCardTemplate"),
  ticketCardTemplate: document.getElementById("ticketCardTemplate"),
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
      search: state.seearch,
      selectedId: state.selectedId,
    })
  );
}
