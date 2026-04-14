# Private API Contract

Ten plik opisuje minimalny kontrakt dla prywatnego backendu, do którego później podepniemy prawdziwe maile i akcje operacyjne.

## Cel

Publiczny dashboard na `GitHub Pages` ma umieć:

- pobrać listę aktualnych spraw supportowych,
- pokazać draft odpowiedzi,
- pokazać CTA do `BaseLinkera`,
- odświeżać się bez publikowania prawdziwych danych klientów do repozytorium.

## Jak przełączyć dashboard z demo na API

W pliku `support-config.js` ustaw:

```js
window.__IRONSHIELD_SUPPORT_CONFIG__ = {
  mode: "remote",
  remoteDataUrl: "https://twoj-prywatny-adres.pl/support-api/tickets",
  refreshIntervalMs: 60 * 1000,
  labels: {
    mode: "Prywatne API",
    features: "Live queue + draft + CTA",
    nextStep: "Reply + BaseLinker actions",
  },
};
```

## Endpoint

`GET /support-api/tickets`

Wymagania:

- odpowiedź `Content-Type: application/json`
- włączony `CORS` dla domeny dashboardu, jeśli API stoi na innym hostingu
- żadnych sekretów po stronie frontendu

## Przykładowa odpowiedź

```json
{
  "updatedAt": "2026-04-14T19:20:00+02:00",
  "syncSource": "private-api",
  "tickets": [
    {
      "id": "ticket-4108",
      "status": "ready",
      "unread": true,
      "needsBaselinker": false,
      "baselinkerDone": false,
      "sendEnabled": false,
      "customerName": "Aria North",
      "customerEmail": "aria.north@example.com",
      "subject": "Mini missing from order",
      "orderNumber": "#4108",
      "source": "support@ironshieldarmy.com",
      "language": "EN",
      "receivedAt": "2026-04-14T10:34:14+02:00",
      "preview": "Brakuje figurki Moonblade Ranger.",
      "summary": "Brak figurki w zamówieniu, bez potrzeby sprawdzania trackingu.",
      "tags": ["missing mini", "free resend"],
      "draft": "Hello Aria, ...",
      "internalCta": {
        "orderNumber": "#4108",
        "customerEmail": "aria.north@example.com",
        "baseLinkerAction": "Dodac dosylke: Moonblade Ranger.",
        "notes": "Nie dodawac drugiej podstawki."
      },
      "timeline": [
        {
          "author": "Aria",
          "time": "2026-04-14 10:34",
          "text": "One mini is missing from order #4108."
        }
      ]
    }
  ]
}
```

## Pola wymagane

- `updatedAt`
- `syncSource`
- `tickets[]`
- `tickets[].id`
- `tickets[].status`
- `tickets[].customerName`
- `tickets[].customerEmail`
- `tickets[].subject`
- `tickets[].orderNumber`
- `tickets[].receivedAt`
- `tickets[].summary`
- `tickets[].draft`
- `tickets[].internalCta.orderNumber`
- `tickets[].internalCta.customerEmail`
- `tickets[].internalCta.baseLinkerAction`
- `tickets[].internalCta.notes`

## Statusy wspierane przez dashboard

- `new`
- `needs-baselinker`
- `ready`
- `waiting`
- `sent`

## Następny etap

Po samym odczycie listy ticketów będziemy mogli dołożyć kolejne endpointy:

- `POST /support-api/reply`
- `POST /support-api/mark-sent`
- `POST /support-api/baselinker-action`

Na ten moment dashboard jest gotowy na `GET /support-api/tickets`.
