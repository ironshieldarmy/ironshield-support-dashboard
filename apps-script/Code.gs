const SUPPORT_CONFIG = {
  brandName: 'IronShield Army',
  supportAddresses: [
    'ironshieldarmy@gmail.com',
    'support@ironshieldarmy.com',
    'office@ironshieldarmy.com',
  ],
  ignoredSenders: [
    'judge.me',
    'account.etsy.com',
    'mail.anthropic.com',
    'magritte.co',
    'google.com',
    'allegro.pl',
    'spring-gds.com',
    'mk-profit.com',
    'heykapak.pl',
    'meshy.ai',
    'confect.io',
    'account-update@amazon.com',
    'myminifactory.com',
  ],
  ignoredSubjectParts: [
    'invoice',
    'faktura',
    'receipt',
    'weekly drop',
    'increase roas',
    'grow your sales',
    'new message for ironshieldarmy',
    'issue with your recent premium creator subscription payment',
    'left a 5 star review',
    'potwierdzenie zamówienia',
    'przesyłka opóźniona',
    'monitoruj ruch',
    'oferta',
    'rozliczenie',
    'płatności',
    'new message from',
  ],
  maxTickets: 12,
  cacheSeconds: 90,
  searchWindowDays: 30,
  overridesPropertyKey: 'support_dashboard_overrides_v1',
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'app';

  if (action === 'tickets') {
    const payload = getDashboardPayload_(Boolean(e.parameter.force));
    return jsonOutput_(payload);
  }

  if (action === 'health') {
    return jsonOutput_({
      ok: true,
      service: 'ironshield-support-dashboard',
      updatedAt: new Date().toISOString(),
    });
  }

  return renderDashboard_();
}

function doPost(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  const body = parseRequestBody_(e);

  try {
    if (action === 'reply') {
      return jsonOutput_(handleReply_(body));
    }

    if (action === 'updateTicket') {
      return jsonOutput_(handleUpdateTicket_(body));
    }

    if (action === 'resetOverrides') {
      return jsonOutput_(handleResetOverrides_());
    }

    return jsonOutput_({ ok: false, error: 'Unknown action.' });
  } catch (error) {
    return jsonOutput_({
      ok: false,
      error: error && error.message ? error.message : 'Unknown server error.',
    });
  }
}

function renderDashboard_() {
  const template = HtmlService.createTemplateFromFile('Dashboard');
  template.bootstrapJson = JSON.stringify({
    apiBaseUrl: ScriptApp.getService().getUrl() || '',
    initialPayload: getDashboardPayload_(false),
    brandName: SUPPORT_CONFIG.brandName,
  });

  return template
    .evaluate()
    .setTitle('IronShield Army - Support War Room')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('Invalid JSON body.');
  }
}

function handleReply_(request) {
  const ticketId = String(request.ticketId || '');
  const body = String(request.body || '').trim();

  if (!ticketId || !body) {
    throw new Error('ticketId and body are required.');
  }

  const payload = getDashboardPayload_(true);
  const ticket = payload.tickets.filter(function (item) {
    return item.id === ticketId;
  })[0];

  if (!ticket) {
    throw new Error('Ticket not found in current queue.');
  }

  if (ticket.needsBaselinker && !ticket.baselinkerDone) {
    throw new Error('This ticket still requires a BaseLinker check before sending.');
  }

  if (ticket.replyMode === 'direct-email') {
    GmailApp.sendEmail(ticket.customerEmail, buildReplySubject_(ticket.subject), body);
  } else {
    var thread = GmailApp.getThreadById(ticket.gmailThreadId);
    if (!thread) {
      throw new Error('Could not load Gmail thread for reply.');
    }
    thread.reply(body);
    thread.markRead();
  }

  updateOverride_(ticketId, {
    status: 'sent',
    unread: false,
    draft: body,
  });

  clearPayloadCache_();

  return {
    ok: true,
    message: 'Reply sent.',
    payload: getDashboardPayload_(true),
  };
}

function handleUpdateTicket_(request) {
  const ticketId = String(request.ticketId || '');
  const changes = request.changes || {};

  if (!ticketId) {
    throw new Error('ticketId is required.');
  }

  updateOverride_(ticketId, changes);
  clearPayloadCache_();

  return {
    ok: true,
    payload: getDashboardPayload_(true),
  };
}

function handleResetOverrides_() {
  PropertiesService.getScriptProperties().deleteProperty(SUPPORT_CONFIG.overridesPropertyKey);
  clearPayloadCache_();

  return {
    ok: true,
    payload: getDashboardPayload_(true),
  };
}

function getDashboardPayload_(forceRefresh) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'support_dashboard_payload_v1';

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    syncSource: 'apps-script-gmail',
    tickets: buildActionableTickets_(),
  };

  cache.put(cacheKey, JSON.stringify(payload), SUPPORT_CONFIG.cacheSeconds);
  return payload;
}

function clearPayloadCache_() {
  CacheService.getScriptCache().remove('support_dashboard_payload_v1');
}

function buildActionableTickets_() {
  const query = 'in:inbox newer_than:' + SUPPORT_CONFIG.searchWindowDays + 'd -label:FAKTURY';
  const threads = GmailApp.search(query, 0, 80);
  const overrides = getOverrides_();
  const tickets = [];

  for (var i = 0; i < threads.length; i += 1) {
    if (tickets.length >= SUPPORT_CONFIG.maxTickets) {
      break;
    }

    const ticket = buildTicketFromThread_(threads[i], overrides);
    if (ticket) {
      tickets.push(ticket);
    }
  }

  tickets.sort(function (a, b) {
    if (a.unread !== b.unread) {
      return a.unread ? -1 : 1;
    }
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });

  return tickets.slice(0, SUPPORT_CONFIG.maxTickets);
}

function buildTicketFromThread_(thread, overrides) {
  const messages = thread.getMessages();
  if (!messages.length) {
    return null;
  }

  const latestMessage = messages[messages.length - 1];
  const latestContext = extractMessageContext_(latestMessage, thread.getFirstMessageSubject());

  if (!latestContext.isCustomerMessage) {
    return null;
  }

  if (shouldIgnoreContext_(latestContext)) {
    return null;
  }

  if (looksLikeThankYouOnly_(latestContext.body)) {
    return null;
  }

  const orderNumber = extractOrderNumber_(latestContext.subject + '\n' + latestContext.body);
  const issue = classifyIssue_(latestContext.subject, latestContext.body, orderNumber);
  if (!issue.actionable) {
    return null;
  }

  const ticketId = buildTicketId_(thread.getId(), orderNumber, latestContext.customerEmail);
  const override = overrides[ticketId] || {};
  const timeline = buildTimeline_(messages);

  const ticket = {
    id: ticketId,
    gmailThreadId: thread.getId(),
    replyMessageId: latestMessage.getId(),
    replyMode: latestContext.replyMode,
    status: issue.status,
    unread: thread.isUnread(),
    needsBaselinker: issue.needsBaselinker,
    baselinkerDone: false,
    sendEnabled: !issue.needsBaselinker,
    customerName: latestContext.customerName,
    customerEmail: latestContext.customerEmail,
    subject: latestContext.subject,
    orderNumber: orderNumber || 'brak',
    source: latestContext.source,
    language: detectLanguage_(latestContext.body),
    receivedAt: latestMessage.getDate().toISOString(),
    preview: issue.preview,
    summary: issue.summary,
    tags: issue.tags,
    draft: issue.draft,
    internalCta: {
      orderNumber: orderNumber || 'brak',
      customerEmail: latestContext.customerEmail,
      baseLinkerAction: issue.baseLinkerAction,
      notes: issue.notes,
    },
    timeline: timeline,
  };

  return mergeOverride_(ticket, override);
}

function extractMessageContext_(message, fallbackSubject) {
  const subject = message.getSubject() || fallbackSubject || '(No Subject)';
  const body = cleanupBody_(message.getPlainBody() || '');
  const fromEmail = normalizeEmail_(message.getFrom());
  const fromName = extractNameFromHeader_(message.getFrom());
  const contactForm = parseContactForm_(subject, body);
  const isContactForm = Boolean(contactForm);

  if (isContactForm) {
    return {
      subject: subject,
      body: contactForm.comment,
      source: 'Shopify Contact Form',
      customerName: contactForm.name || 'Customer',
      customerEmail: contactForm.email || 'brak',
      isCustomerMessage: true,
      replyMode: 'direct-email',
      fromEmail: fromEmail,
    };
  }

  const isCustomerMessage = !isFromUs_(fromEmail) && !looksLikeNotificationOnly_(subject, fromEmail);

  return {
    subject: subject,
    body: body,
    source: guessSource_(subject, fromEmail),
    customerName: fromName || fromEmail || 'Customer',
    customerEmail: fromEmail || 'brak',
    isCustomerMessage: isCustomerMessage,
    replyMode: 'thread-reply',
    fromEmail: fromEmail,
  };
}

function shouldIgnoreContext_(context) {
  const email = (context.fromEmail || '').toLowerCase();
  const subject = (context.subject || '').toLowerCase();

  for (var i = 0; i < SUPPORT_CONFIG.ignoredSenders.length; i += 1) {
    if (email.indexOf(SUPPORT_CONFIG.ignoredSenders[i]) !== -1) {
      return true;
    }
  }

  for (var j = 0; j < SUPPORT_CONFIG.ignoredSubjectParts.length; j += 1) {
    if (subject.indexOf(SUPPORT_CONFIG.ignoredSubjectParts[j]) !== -1) {
      return true;
    }
  }

  return false;
}

function looksLikeNotificationOnly_(subject, fromEmail) {
  const subjectLower = String(subject || '').toLowerCase();
  const emailLower = String(fromEmail || '').toLowerCase();

  if (subjectLower.indexOf('you have a new message from') !== -1) {
    return true;
  }

  if (emailLower.indexOf('store+83540476237@t.shopifyemail.com') !== -1) {
    return true;
  }

  return false;
}

function parseContactForm_(subject, body) {
  if (String(subject || '').toLowerCase().indexOf('new customer message') === -1) {
    return null;
  }

  const nameMatch = body.match(/Name:\s*([\s\S]*?)\n\s*Email:/i);
  const emailMatch = body.match(/Email:\s*([^\n\r]+)/i);
  const commentMatch = body.match(/Comment:\s*([\s\S]*)$/i);

  return {
    name: cleanupSingleLine_(nameMatch ? nameMatch[1] : 'Customer'),
    email: cleanupSingleLine_(emailMatch ? emailMatch[1] : 'brak'),
    comment: cleanupBody_(commentMatch ? commentMatch[1] : ''),
  };
}

function classifyIssue_(subject, body, orderNumber) {
  const text = (subject + '\n' + body).toLowerCase();
  const itemName = extractItemName_(subject, body);

  if (containsAny_(text, ['missing', 'did not receive', "didn't receive", 'replacement', 'broken', 'damaged', 'snapped'])) {
    const isDamaged = containsAny_(text, ['broken', 'damaged', 'snapped']);
    const itemLabel = itemName || (isDamaged ? 'the damaged miniature' : 'the missing miniature');
    return {
      actionable: true,
      status: 'ready',
      needsBaselinker: false,
      preview: isDamaged
        ? 'Klient zgłasza uszkodzoną figurkę i oczekuje replacementu.'
        : 'Klient zgłasza brakującą figurkę lub gratis w paczce.',
      summary: isDamaged
        ? 'Typowa reklamacja transportowa. Można zaproponować darmowy replacement i dopytać, czy klient chce dorzucić coś jeszcze do paczki.'
        : 'Brakująca figurka albo gratis w paczce. To nadaje się do szybkiej dosyłki bez wspominania o kosztach po Twojej stronie.',
      tags: isDamaged ? ['damaged mini', 'replacement'] : ['missing item', 'free resend'],
      draft:
        'Hello,\n\nThank you for your message, and I am very sorry about the issue with ' +
        itemLabel +
        '.\n\nOf course, we can send ' +
        itemLabel +
        ' to you free of charge.\n\nIf you liked the rest of the miniatures and would like to add anything else from our shop, feel free to let me know and we can include it in the same shipment.\n\nIf your shipping address is still the same as on order ' +
        (orderNumber || 'number not provided') +
        ', we can move forward from our side.\n\nBest regards,\nIronShield Army Support',
      baseLinkerAction: isDamaged
        ? 'Dodac replacement: ' + itemLabel + '.'
        : 'Dodac dosylke: ' + itemLabel + '.',
      notes: isDamaged
        ? 'Reklamacja transportowa. Produkcja replacementu i wysylka po naszej stronie.'
        : 'Dosylka brakujacej pozycji bez ruszania glownego zamowienia.',
    };
  }

  if (
    containsAny_(text, [
      'where is my order',
      'tracking',
      'in transit',
      'current location',
      'shipping update',
      'order shipped',
      'delivery',
      'not yet received',
      'delay',
      'how much longer',
      'when will it ship',
      'when they will ship',
    ])
  ) {
    return {
      actionable: true,
      status: 'needs-baselinker',
      needsBaselinker: true,
      preview: 'Klient pyta o status przesylki albo opoznienie i potrzebny jest realny status z systemu.',
      summary:
        'To jest sprawa trackingowa. Nie wolno zgadywać, tylko najpierw sprawdzić BaseLinker i dopiero potem odpisać klientowi.',
      tags: ['tracking', 'manual check'],
      draft:
        'Hello,\n\nThank you for your message, and I am sorry for the delay.\n\nI am checking the current shipping status of your order right now so I can give you an accurate update instead of guessing. As soon as I verify the latest tracking information, I will get back to you with the next step.\n\nBest regards,\nIronShield Army Support',
      baseLinkerAction:
        'Sprawdzic status przesylki i ostatni tracking w BaseLinkerze przed wyslaniem finalnej odpowiedzi.',
      notes: 'To mail typu where is my order. Bez sprawdzenia systemu nie wysylac finalu.',
    };
  }

  if (containsAny_(text, ['payment', 'credit card', 'checkout', 'paid', 'balance'])) {
    return {
      actionable: true,
      status: 'waiting',
      needsBaselinker: false,
      preview: 'Klient ma problem z platnoscia lub chce potwierdzenia transakcji.',
      summary:
        'To nie jest typowa reklamacja, ale wymaga sprawdzenia sklepu lub operatora płatności i krótkiej odpowiedzi uspokajającej klienta.',
      tags: ['payment issue'],
      draft:
        'Hello,\n\nThank you for your message.\n\nI am checking what happened with the payment on our side so I can confirm whether the order went through correctly. As soon as I verify it, I will get back to you with the next step.\n\nBest regards,\nIronShield Army Support',
      baseLinkerAction:
        'Sprawdzic status platnosci i zamowienia w sklepie / systemie platnosci przed finalnym mailem.',
      notes: 'Nie wysylac w ciemno potwierdzenia platnosci bez sprawdzenia.',
    };
  }

  if (containsAny_(text, ['custom', 'commission', 'painted', 'paint job'])) {
    return {
      actionable: true,
      status: 'waiting',
      needsBaselinker: false,
      preview: 'Lead sprzedazowy: klient pyta o custom albo figurke malowana.',
      summary:
        'To bardziej szansa sprzedażowa niż support. Trzeba złapać brief, skalę i zakres malowania zamiast od razu iść w replacement.',
      tags: ['custom inquiry', 'lead'],
      draft:
        'Hello,\n\nThank you for your message and for reaching out to us.\n\nA custom miniature or a painted version is definitely something we can discuss. The final price depends on the model complexity, the scale, and how detailed the paint job should be, so the best next step would be for you to send us the reference image together with the scale you want.\n\nOnce we have that, we can give you a more realistic estimate.\n\nBest regards,\nIronShield Army Support',
      baseLinkerAction:
        'Brak akcji w BaseLinkerze. Trzeba przygotowac estymacje albo przekierowac klienta do procesu custom quotes.',
      notes: 'Lead handlowy, nie standardowa reklamacja.',
    };
  }

  return {
    actionable: true,
    status: 'new',
    needsBaselinker: false,
    preview: 'Nowy mail klienta wymagajacy recznego spojrzenia supportu.',
    summary:
      'Sprawa nie wpadła w gotowy szablon. Dashboard pokazuje ją jako nową, żebyś zdecydował, czy potrzebny jest BaseLinker, dosyłka czy zwykła odpowiedź.',
    tags: ['manual review'],
    draft:
      'Hello,\n\nThank you for your message.\n\nI am reviewing the details of your case right now so I can get back to you with the correct next step as quickly as possible.\n\nBest regards,\nIronShield Army Support',
    baseLinkerAction: 'Przeczytac mail recznie i zdecydowac, czy potrzebna jest dosylka, tracking czy zwykla odpowiedz.',
    notes: 'Fallback dla tematow, ktorych nie rozpoznal klasyfikator.',
  };
}

function buildTimeline_(messages) {
  const start = Math.max(0, messages.length - 3);
  const items = [];

  for (var i = start; i < messages.length; i += 1) {
    const msg = messages[i];
    items.push({
      author: isFromUs_(normalizeEmail_(msg.getFrom())) ? 'IronShield' : extractNameFromHeader_(msg.getFrom()),
      time: Utilities.formatDate(msg.getDate(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
      text: truncateText_(cleanupBody_(msg.getPlainBody() || ''), 260),
    });
  }

  return items;
}

function getOverrides_() {
  const raw = PropertiesService.getScriptProperties().getProperty(
    SUPPORT_CONFIG.overridesPropertyKey
  );

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function updateOverride_(ticketId, changes) {
  const allowed = ['status', 'unread', 'needsBaselinker', 'baselinkerDone', 'draft', 'sendEnabled', 'internalCta'];
  const overrides = getOverrides_();
  const current = overrides[ticketId] || {};

  for (var i = 0; i < allowed.length; i += 1) {
    const field = allowed[i];
    if (Object.prototype.hasOwnProperty.call(changes, field)) {
      current[field] = changes[field];
    }
  }

  overrides[ticketId] = current;
  PropertiesService.getScriptProperties().setProperty(
    SUPPORT_CONFIG.overridesPropertyKey,
    JSON.stringify(overrides)
  );
}

function mergeOverride_(ticket, override) {
  const merged = JSON.parse(JSON.stringify(ticket));
  const fields = ['status', 'unread', 'needsBaselinker', 'baselinkerDone', 'draft', 'sendEnabled', 'internalCta'];

  for (var i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    if (Object.prototype.hasOwnProperty.call(override, field)) {
      merged[field] = override[field];
    }
  }

  if (merged.needsBaselinker && !merged.baselinkerDone) {
    merged.sendEnabled = false;
  }

  if (merged.baselinkerDone) {
    merged.sendEnabled = true;
  }

  if (merged.status === 'sent') {
    merged.unread = false;
  }

  return merged;
}

function buildReplySubject_(subject) {
  if (/new customer message/i.test(subject)) {
    return 'Re: Your message to IronShield Army';
  }
  return /^re:/i.test(subject) ? subject : 'Re: ' + subject;
}

function buildTicketId_(threadId, orderNumber, email) {
  if (orderNumber && orderNumber !== 'brak') {
    return ('order-' + orderNumber + '-' + email).toLowerCase().replace(/[^a-z0-9#@.-]/g, '-');
  }
  return ('thread-' + threadId).toLowerCase();
}

function extractOrderNumber_(text) {
  const match = String(text || '').match(/order\s*#?\s*(\d{3,6})/i);
  if (match) {
    return '#' + match[1];
  }
  return '';
}

function extractItemName_(subject, body) {
  const lines = String(body || '')
    .split(/\n+/)
    .map(cleanupSingleLine_)
    .filter(Boolean);

  for (var i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.length > 8 && containsAny_(line.toLowerCase(), ['missing', 'broken', 'damaged', 'replacement'])) {
      return truncateText_(line.replace(/^(it looks like|upon receiving|the only things missing are|i didn.t receive)/i, '').trim(), 120);
    }
  }

  if (/mini missing from order/i.test(subject)) {
    return 'the missing miniature';
  }

  return '';
}

function cleanupBody_(body) {
  return String(body || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter(function (line) {
      const trimmed = line.trim();
      return trimmed && trimmed.indexOf('>') !== 0 && trimmed.indexOf('On ') !== 0;
    })
    .join('\n')
    .trim();
}

function cleanupSingleLine_(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function truncateText_(text, limit) {
  const clean = cleanupSingleLine_(text);
  if (clean.length <= limit) {
    return clean;
  }
  return clean.slice(0, limit - 1) + '…';
}

function containsAny_(text, parts) {
  for (var i = 0; i < parts.length; i += 1) {
    if (text.indexOf(parts[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function looksLikeThankYouOnly_(text) {
  const clean = cleanupSingleLine_(text).toLowerCase();
  if (!clean) {
    return false;
  }

  if (containsAny_(clean, ['thank you', 'thanks', 'ty very much']) && !containsAny_(clean, ['but', '?', 'order', 'missing', 'broken', 'damaged', 'where'])) {
    return true;
  }

  return false;
}

function detectLanguage_(text) {
  const clean = String(text || '').toLowerCase();
  if (/[ąćęłńóśźż]/.test(clean)) {
    return 'PL';
  }
  if (/[äöüß]/.test(clean)) {
    return 'DE';
  }
  if (/[а-яё]/i.test(clean)) {
    return 'RU';
  }
  return 'EN';
}

function isFromUs_(email) {
  const lower = String(email || '').toLowerCase();
  for (var i = 0; i < SUPPORT_CONFIG.supportAddresses.length; i += 1) {
    if (lower === SUPPORT_CONFIG.supportAddresses[i]) {
      return true;
    }
  }
  return lower.indexOf('ironshield') !== -1;
}

function normalizeEmail_(header) {
  const match = String(header || '').match(/<([^>]+)>/);
  if (match) {
    return match[1].trim().toLowerCase();
  }
  const emailMatch = String(header || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return emailMatch ? emailMatch[0].trim().toLowerCase() : '';
}

function extractNameFromHeader_(header) {
  const raw = String(header || '');
  const cleaned = raw.replace(/<[^>]+>/g, '').replace(/["']/g, '').trim();
  return cleaned || normalizeEmail_(header) || 'Customer';
}

function guessSource_(subject, email) {
  if (String(subject || '').toLowerCase().indexOf('new customer message') !== -1) {
    return 'Shopify Contact Form';
  }
  if (String(email || '').toLowerCase().indexOf('@etsy') !== -1) {
    return 'Etsy';
  }
  return 'Gmail';
}
