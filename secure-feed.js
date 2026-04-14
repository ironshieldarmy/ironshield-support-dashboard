(function initSecureFeed() {
  const rawConfig = window.__IRONSHIELD_SUPPORT_CONFIG__ || {};
  const encryptedFeedUrl =
    typeof rawConfig.encryptedFeedUrl === "string" ? rawConfig.encryptedFeedUrl.trim() : "";

  if (!encryptedFeedUrl) {
    return;
  }

  state.config.encryptedFeedUrl = encryptedFeedUrl;
  state.config.labels = {
    ...state.config.labels,
    mode: rawConfig?.labels?.mode || "Zaszyfrowany live feed",
    features: rawConfig?.labels?.features || "Realne maile + draft + CTA",
    nextStep: rawConfig?.labels?.nextStep || "Automatyczny sync Gmail + BaseLinker",
  };

  state.isUnlocked = false;
  state.feedPasscode = "";
  sessionStorage.removeItem(AUTH_STATE_KEY);

  function usesEncryptedFeed() {
    return Boolean(state.config.encryptedFeedUrl);
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

  async function fetchEncryptedPayload(passcode) {
    const response = await fetch(state.config.encryptedFeedUrl, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`encrypted_status_${response.status}`);
    }

    const envelope = await response.json();
    return decryptEncryptedFeed(envelope, passcode);
  }

  renderSyncMeta = function renderSecureSyncMeta() {
    const updated = state.liveMeta.updatedAt ? formatDate(state.liveMeta.updatedAt) : "brak syncu";
    const syncingText = authEnabled() && !state.isUnlocked
      ? "Panel jest zablokowany haslem operatora."
      : state.isSyncing
        ? "Trwa odszyfrowanie feedu klientow..."
        : "Panel czyta zaszyfrowany feed klientow z repozytorium.";

    el.syncMeta.textContent = `Ostatni sync: ${updated}. Zrodlo: ${state.liveMeta.syncSource}. ${syncingText}`;
    el.syncNowBtn.disabled = state.isSyncing || !state.isUnlocked;
    el.syncNowBtn.textContent = state.isSyncing ? "Odswiezanie..." : "Odswiez skrzynke";
    el.importSnapshotBtn.hidden = true;
    el.clearSnapshotBtn.hidden = true;
    el.importSnapshotInput.hidden = true;
  };

  const originalRenderAlert = renderAlert;
  renderAlert = function renderSecureAlert() {
    originalRenderAlert();

    if (!state.tickets.some((ticket) => ticket.unread)) {
      el.alertSubline.textContent =
        "Zaszyfrowany feed jest aktywny. Gdy pojawią się nowe maile klientów, zobaczysz je tutaj.";
    }
  };

  refreshLiveData = async function refreshSecureFeed({ silent = false, passcode = "" } = {}) {
    if (state.isSyncing || (!state.isUnlocked && !passcode)) {
      return false;
    }

    state.isSyncing = true;
    renderSyncMeta();

    try {
      const secret = passcode || state.feedPasscode;
      if (!secret) {
        throw new Error("missing_passcode");
      }

      const payload = await fetchEncryptedPayload(secret);
      state.feedPasscode = secret;
      applyPayloadFromRemote(payload);

      if (!silent) {
        toast("Feed klientow odswiezony.");
      }

      return true;
    } catch {
      if (!silent) {
        toast("Nie udalo sie odczytac feedu klientow.");
      }
      return false;
    } finally {
      state.isSyncing = false;
      renderSyncMeta();
    }
  };

  unlockPanel = async function unlockSecurePanel() {
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

      setAuthMessage("Odszyfrowuję feed klientów...", "info");
      const loaded = await refreshLiveData({ silent: true, passcode: candidate });
      if (!loaded) {
        setAuthMessage("Nie udało się odczytać feedu klientów tym hasłem.", "error");
        el.passcodeInput.select();
        return;
      }

      state.isUnlocked = true;
      state.feedPasscode = candidate;
      applyAuthState();
      render();
      toast("Panel odblokowany.");
      el.searchInput.focus();
    } catch {
      setAuthMessage("Nie udało się zweryfikować hasła w tej przeglądarce.", "error");
    } finally {
      state.isUnlocking = false;
      el.unlockBtn.disabled = false;
    }
  };

  lockPanel = function lockSecurePanel() {
    if (!authEnabled()) return;
    state.isUnlocked = false;
    state.feedPasscode = "";
    sessionStorage.removeItem(AUTH_STATE_KEY);
    applyAuthState();
    el.passcodeInput.focus();
    toast("Panel został zablokowany.");
  };

  applyPayload(null);
  render();
  applyAuthState();
})();
