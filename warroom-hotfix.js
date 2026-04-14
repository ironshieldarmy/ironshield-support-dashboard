(function initWarRoomHotfix() {
  if (typeof render !== "function" || typeof selectedTicket !== "function") {
    return;
  }

  if (Array.isArray(MUTABLE_FIELDS) && !MUTABLE_FIELDS.includes("operatorHint")) {
    MUTABLE_FIELDS.push("operatorHint");
  }

  const style = document.createElement("style");
  style.textContent = `
    .priority-guide,
    .ops-panel,
    #importSnapshotBtn,
    #clearSnapshotBtn,
    #importSnapshotInput,
    .support-hooks {
      display: none !important;
    }

    .workspace {
      grid-template-columns: minmax(340px, 0.82fr) minmax(560px, 1.18fr) !important;
    }

    .detail-panel,
    .queue-panel {
      min-height: 78vh;
    }

    .composer-card label {
      display: grid;
      gap: 8px;
    }

    .hint-editor {
      width: 100%;
      min-height: 96px;
      resize: vertical;
      line-height: 1.52;
      border: 1px solid rgba(124, 63, 29, 0.18);
      border-radius: 16px;
      padding: 12px 14px;
      background: rgba(255, 252, 247, 0.95);
      color: inherit;
    }

    @media (max-width: 1220px) {
      .workspace {
        grid-template-columns: 1fr !important;
      }

      .detail-panel,
      .queue-panel {
        min-height: auto;
      }
    }
  `;
  document.head.appendChild(style);

  function customerFirstName(ticket) {
    return String(ticket?.customerName || "").trim().split(/\s+/)[0] || "there";
  }

  function detectDraftScenario(ticket) {
    const haystack = [
      ticket?.subject,
      ticket?.summary,
      ticket?.preview,
      ...((ticket && Array.isArray(ticket.tags)) ? ticket.tags : []),
      ticket?.internalCta?.baseLinkerAction || "",
    ]
      .join(" ")
      .toLowerCase();

    return {
      shippingQuestion: /shipping|delivery time|how many days|texas|usa/.test(haystack),
      tracking: /where is my order|tracking|status|delay|shipped/.test(haystack),
      scaleIssue: /scale|32 mm|38 mm|wrong scale/.test(haystack),
      damaged: /damaged|broken|replacement|zlam|uszkod/.test(haystack),
      missing: /missing|brakuje|free gift|gift|welcome bribe|chest/.test(haystack),
    };
  }

  function detectHintFlags(operatorHint) {
    const hint = String(operatorHint || "").toLowerCase();

    return {
      shortMode: /krotk|kr[oó]tk|short/.test(hint),
      formalMode: /formal|neutral|bez nerd|without nerd/.test(hint),
      noUpsell: /bez upsell|without upsell|no upsell/.test(hint),
      mentionAddress: /adres|address/.test(hint),
      mentionPackaging: /pakow|package|zabezpiecz|protect/.test(hint),
      mentionDelayCheck: /sprawdz|check|bazelinker|baselinker|system/.test(hint),
    };
  }

  function joinDraft(parts) {
    return parts.filter(Boolean).join("\n\n");
  }

  function buildDraftFromTicket(ticket, operatorHint) {
    const firstName = customerFirstName(ticket);
    const orderLabel =
      ticket?.orderNumber && ticket.orderNumber !== "brak"
        ? `order ${ticket.orderNumber}`
        : "your order";
    const scenario = detectDraftScenario(ticket);
    const hint = detectHintFlags(operatorHint);
    const greeting = `Hello ${firstName},`;
    const signoff = "Best regards,\nIronShield Army Support";

    if (scenario.shippingQuestion) {
      if (hint.shortMode) {
        return joinDraft([
          greeting,
          "Thank you for your message.",
          "Our average fulfillment time is about 5 business days. Shipping time after dispatch depends on the carrier and destination.",
          signoff,
        ]);
      }

      return joinDraft([
        greeting,
        "Thank you for your message.",
        "Our average fulfillment time is about 5 business days. After dispatch, delivery time depends on the carrier and destination, but that transit time comes on top of production.",
        "If you already know which miniatures you want, feel free to send them over and we can help you estimate it a bit more closely.",
        signoff,
      ]);
    }

    if (scenario.tracking || (ticket?.needsBaselinker && hint.mentionDelayCheck)) {
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
      const body = [
        greeting,
        "Thank you for your message, and I am very sorry your miniature arrived damaged.",
        "Yes, absolutely, we can send you a replacement free of charge.",
      ];

      if (hint.mentionPackaging || /package|protect|arrow/i.test(ticket?.preview || "")) {
        body.push("I have also noted the packaging request, so we can take extra care with this replacement.");
      }

      if (!hint.noUpsell) {
        body.push(
          "If you liked the rest of the minis and would like to add anything else from our shop, feel free to let me know and we can include it in the same shipment."
        );
      }

      if (hint.mentionAddress || !hint.shortMode) {
        body.push(`If your shipping address is still the same as in ${orderLabel}, we can move forward from our side.`);
      }

      body.push(signoff);
      return joinDraft(body);
    }

    if (scenario.missing) {
      const body = [
        greeting,
        "Thank you for your message, and I am very sorry about that.",
        "Of course, we can send the missing miniature free of charge.",
      ];

      if (!hint.noUpsell) {
        body.push(
          "If you liked the rest of the minis and would like to add anything else from our shop, feel free to let me know and we can include it in the same shipment."
        );
      }

      if (hint.mentionAddress || !hint.shortMode) {
        body.push(`If your shipping address is still the same as in ${orderLabel}, we can move forward from our side.`);
      }

      body.push(signoff);
      return joinDraft(body);
    }

    return joinDraft([
      greeting,
      "Thank you for your message.",
      "I am checking the details from our side so I can come back to you with the right next step.",
      signoff,
    ]);
  }

  const originalUpdateTicket = updateTicket;
  updateTicket = window.updateTicket = function updateTicketPatched(id, changes, options = {}) {
    const renderNow = options.renderNow !== false;

    if (renderNow) {
      return originalUpdateTicket(id, changes);
    }

    state.tickets = state.tickets.map((ticket) =>
      ticket.id === id ? { ...ticket, ...changes } : ticket
    );

    state.overrides[id] = { ...(state.overrides[id] || {}) };

    MUTABLE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(changes, field)) {
        state.overrides[id][field] = changes[field];
      }
    });

    saveOverrides();
    saveUiState();
  };

  filteredTickets = window.filteredTickets = function filteredTicketsPatched() {
    const term = state.search.trim().toLowerCase();

    return state.tickets
      .filter((ticket) => {
        if (state.filter !== "all" && ticket.status !== state.filter) {
          return false;
        }

        if (!term) {
          return true;
        }

        const haystack = [
          ticket.customerName,
          ticket.customerEmail,
          ticket.subject,
          ticket.orderNumber,
          ticket.preview,
          ticket.summary,
          ticket?.internalCta?.baseLinkerAction || "",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(term);
      })
      .sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
  };

  renderDetail = window.renderDetail = function renderDetailPatched() {
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
    const tags = Array.isArray(ticket.tags) ? ticket.tags : [];

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
          ${tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
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
        <label for="operatorHintEditor">
          <span class="mini-label">Twoja wskazowka do draftu</span>
          <textarea id="operatorHintEditor" class="hint-editor" placeholder="np. krotko, bez upsellu, zapytaj o adres, wspomnij o pakowaniu"></textarea>
        </label>
        <p class="composer-note">
          Tu najlepiej dzialaja krotkie wskazowki operacyjne, a panel wygeneruje z nich nowa wersje odpowiedzi.
        </p>

        <label for="draftEditor">
          <span class="mini-label">Proponowana odpowiedz</span>
          <textarea id="draftEditor"></textarea>
        </label>

        <div class="composer-actions">
          <button id="generateDraftBtn" type="button" class="action-btn primary">Wygeneruj z wskazowki</button>
          <button id="approveBtn" type="button" class="action-btn primary">Zatwierdz draft</button>
          <button id="copyBtn" type="button" class="action-btn">Kopiuj odpowiedz</button>
          <button id="needsBlBtn" type="button" class="action-btn">Oznacz: trzeba BaseLinker</button>
          <button id="blDoneBtn" type="button" class="action-btn secondary">${ticket.baselinkerDone ? "BaseLinker zrobiony" : "Oznacz BaseLinker jako zrobiony"}</button>
          <button id="markSentBtn" type="button" class="action-btn">Oznacz jako wyslane</button>
          <button id="sendBtn" type="button" class="action-btn" disabled>Niedostepne w demo</button>
        </div>
      </article>

      <article class="timeline-card">
        <p class="mini-label">Historia watku</p>
        ${(ticket.timeline || [])
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

    const operatorHintEditor = document.getElementById("operatorHintEditor");
    const draftEditor = document.getElementById("draftEditor");
    operatorHintEditor.value = ticket.operatorHint || "";
    draftEditor.value = ticket.draft || "";

    operatorHintEditor.addEventListener("input", (event) => {
      updateTicket(ticket.id, { operatorHint: event.target.value }, { renderNow: false });
    });

    draftEditor.addEventListener("input", (event) => {
      updateTicket(ticket.id, { draft: event.target.value }, { renderNow: false });
    });

    document.getElementById("generateDraftBtn").addEventListener("click", () => {
      const nextDraft = buildDraftFromTicket(ticket, operatorHintEditor.value);
      draftEditor.value = nextDraft;
      updateTicket(
        ticket.id,
        {
          draft: nextDraft,
          operatorHint: operatorHintEditor.value,
        },
        { renderNow: false }
      );
      toast("Wygenerowano nowa wersje odpowiedzi.");
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
  };

  render();
})();
