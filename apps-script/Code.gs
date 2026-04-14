const CUSTOMER_ADDRESS_POOL = [
  'ironshieldarmy@gmail.com',
  'support@ironshieldarmy.com',
  'office@ironshieldarmy.com',
];

const STATUS_META = {
  new: { label: 'Nowy mail', badgeClass: 'badge-danger' },
  'needs-baselinker': { label: 'Wymaga BaseLinkera', badgeClass: 'badge-warn' },
  ready: { label: 'Gotowe do wysylki', badgeClass: 'badge-accent' },
  waiting: { label: 'Czeka na klienta', badgeClass: '' },
  sent: { label: 'Wyslane', badgeClass: '' },
};

function doGet() {
  return HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setTitle('IronShield Support Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDashboardPayload() {
  const tickets = buildTicketsFromInbox();
  return {
    updatedAt: new Date().toISOString(),
    syncSource: 'gmail-live',
    tickets,
  };
}

function buildTicketsFromInbox() {
  const query = [
    'in:inbox',
    'is:unread',
    '-label:FAKTURY',
    '-category:promotions',
    '-category:social',
    '-category:updates',
    '-from:(noreply OR no-reply)',
    '-subject:(invoice OR faktura)',
  ].join(' ');

  const threads = GmailApp.search(query, 0, 40);
  const tickets = [];

  threads.forEach((thread) => {
    const messages = thread.getMessages();
    const latest = messages[messages.length - 1];
    const payload = classifyCustomerThread(thread, latest);
    if (payload) tickets.push(payload);
  });

  return tickets.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
}

function classifyCustomerThread(thread, message) {
  const from = message.getFrom();
  const subject = message.getSubject() || '(bez tematu)';
  const plainBody = (message.getPlainBody() || '').trim();
  const recipientPool = [message.getTo(), message.getCc(), message.getBcc()].join(' ').toLowerCase();
  const threadBody = `${from} ${subject} ${plainBody}`.toLowerCase();

  if (!isProbablyCustomerMail(from, subject, recipientPool, threadBody)) {
    return null;
  }

  const orderNumberMatch = subject.match(/#?([0-9]{3,6})/);
  const orderNumber = orderNumberMatch ? `#${orderNumberMatch[1]}` : 'brak';
  const needsBaselinker = /(where is|tracking|status|shipped|shipment|tracking number|delivery)/i.test(
    `${subject} ${plainBody}`
  );

  return {
    id: thread.getId(),
    gmailThreadId: thread.getId(),
    replyMessageId: message.getId(),
    status: needsBaselinker ? 'needs-baselinker' : 'ready',
    unread: thread.isUnread(),
    needsBaselinker,
    baselinkerDone: false,
    sendEnabled: true,
    customerName: extractDisplayName(from),
    customerEmail: extractEmail(from),
    subject,
    orderNumber,
    source: extractRecipientTarget(recipientPool),
    language: guessLanguage(subject, plainBody),
    receivedAt: message.getDate().toISOString(),
    preview: plainBody.slice(0, 180) || 'Klient nie zostawil jeszcze tresci w podgladzie.',
    summary: buildSummary(subject, plainBody, needsBaselinker),
    tags: buildTags(subject, plainBody, needsBaselinker),
    draft: buildDraft(extractDisplayName(from), orderNumber, plainBody, needsBaselinker),
    internalCta: {
      orderNumber,
      customerEmail: extractEmail(from),
      baseLinkerAction: buildBaselinkerAction(orderNumber, plainBody, needsBaselinker),
      notes: needsBaselinker
        ? 'Ta sprawa wymaga recznego sprawdzenia statusu zamowienia w BaseLinkerze.'
        : 'Przygotuj dosylke / replacement, jesli temat dotyczy uszkodzenia albo brakujacej figurki.',
    },
    timeline: [
      {
        author: extractDisplayName(from),
        time: Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
        text: plainBody.slice(0, 1000) || '(brak tresci)',
      },
    ],
  };
}

function isProbablyCustomerMail(from, subject, recipientPool, body) {
  const fromEmail = extractEmail(from).toLowerCase();
  const subjectLower = subject.toLowerCase();
  const looksLikeCustomerAddress =
    fromEmail.includes('@gmail.com') ||
    fromEmail.includes('@yahoo.') ||
    fromEmail.includes('@hotmail.') ||
    fromEmail.includes('@outlook.') ||
    fromEmail.includes('@icloud.') ||
    fromEmail.includes('@aol.') ||
    fromEmail.includes('@proton.');

  const orderLike =
    /order\s*#?\d+/i.test(subject) ||
    /mini missing from order/i.test(subject) ||
    /replacement/i.test(subject) ||
    /new customer message on/i.test(subject);

  const explicitlyCustomerTarget = CUSTOMER_ADDRESS_POOL.some((address) => recipientPool.includes(address));

  const obviousBizSpam = /(roas|scale your store|marketing agency|ecommerce growth|lead generation|seo|outsourcing)/i.test(
    `${fromEmail} ${subjectLower} ${body}`
  );

  const invoiceNoise = /(invoice|faktura)/i.test(`${subjectLower} ${body}`);

  return (looksLikeCustomerAddress || orderLike || explicitlyCustomerTarget) && !obviousBizSpam && !invoiceNoise;
}

function extractDisplayName(from) {
  const bracketMatch = from.match(/^(.*)\s*</);
  if (bracketMatch && bracketMatch[1].trim()) return bracketMatch[1].replaceAll('"', '').trim();
  return extractEmail(from).split('@')[0];
}

function extractEmail(from) {
  const angleMatch = from.match(/<([^>]+)>/);
  return (angleMatch ? angleMatch[1] : from).trim();
}

function extractRecipientTarget(recipientPool) {
  const matched = CUSTOMER_ADDRESS_POOL.find((address) => recipientPool.includes(address));
  return matched || 'support inbox';
}

function guessLanguage(subject, body) {
  const polishSignals = /dzie[nń] dobry|cze[sś][cć]|zam[oó]wienie|przesy[lł]ka|figurk|reklamacja/i.test(
    `${subject} ${body}`
  );
  return polishSignals ? 'PL' : 'EN';
}

function buildSummary(subject, body, needsBaselinker) {
  if (needsBaselinker) {
    return 'Klient pyta o status przesylki. Zanim odpowiesz, potrzebny jest reczny check w BaseLinkerze.';
  }

  if (/missing|brak/i.test(`${subject} ${body}`)) {
    return 'Klient zgłasza brakującą figurkę albo element zamówienia. Zwykle kwalifikuje się do darmowej dosyłki.';
  }

  if (/broken|damaged|zlam|po[lł]am/i.test(`${subject} ${body}`)) {
    return 'Klient zgłasza uszkodzenie figurki. Standardowo przygotowujemy replacement i delikatny upsell przy drugiej paczce.';
  }

  return 'Realna wiadomość klienta wymagająca draftu odpowiedzi w tonie IronShield Army.';
}

function buildTags(subject, body, needsBaselinker) {
  const tags = [];
  if (needsBaselinker) tags.push('tracking');
  if (/missing|brak/i.test(`${subject} ${body}`)) tags.push('missing mini');
  if (/broken|damaged|zlam|po[lł]am/i.test(`${subject} ${body}`)) tags.push('damaged mini');
  if (!tags.length) tags.push('customer support');
  return tags;
}

function buildDraft(customerName, orderNumber, body, needsBaselinker) {
  if (needsBaselinker) {
    return [
      `Hello ${customerName},`,
      '',
      'Thank you for your message.',
      '',
      `I am checking the shipping status of order ${orderNumber} so I can give you an accurate update instead of guessing.`,
      'As soon as I verify the latest status in our system, I will get back to you with the next step.',
      '',
      'Best regards,',
      'IronShield Army Support',
    ].join('\n');
  }

  if (/missing|brak/i.test(body)) {
    return [
      `Hello ${customerName},`,
      '',
      'Thank you for reaching out, and I am very sorry about that.',
      '',
      'Of course, we can send the missing miniature free of charge.',
      '',
      'If you liked the rest of the minis and would like to add anything else from our shop, feel free to let me know and we can include it in the same shipment.',
      '',
      'If your shipping address has changed since the original order, just let us know.',
      '',
      'Best regards,',
      'IronShield Army Support',
    ].join('\n');
  }

  return [
    `Hello ${customerName},`,
    '',
    'Thank you for your message, and I am very sorry your miniature arrived damaged.',
    '',
    'Yes, absolutely, we can send you a replacement free of charge.',
    '',
    'If you liked the rest of the minis and would like to add anything else from our shop, feel free to let me know and we can include it in the same shipment.',
    '',
    `If your shipping address is still the same as in order ${orderNumber}, we can move forward from our side.`,
    '',
    'Best regards,',
    'IronShield Army Support',
  ].join('\n');
}

function buildBaselinkerAction(orderNumber, body, needsBaselinker) {
  if (needsBaselinker) {
    return `Sprawdzic aktualny status zamowienia ${orderNumber} i tracking przed wyslaniem finalnej odpowiedzi.`;
  }

  if (/missing|brak/i.test(body)) {
    return `Dodac dosylke do zamowienia ${orderNumber} i ustalic, czego konkretnie brakuje.`;
  }

  return `Dodac replacement do zamowienia ${orderNumber} i przekazac temat na produkcje.`;
}

function sendReply(payload) {
  const ticket = payload || {};
  if (!ticket.replyMessageId || !ticket.draft) {
    throw new Error('Brakuje replyMessageId albo draftu.');
  }

  const original = GmailApp.getMessageById(ticket.replyMessageId);
  original.reply(ticket.draft);

  return {
    ok: true,
    sentAt: new Date().toISOString(),
  };
}
