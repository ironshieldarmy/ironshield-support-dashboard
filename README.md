# IronShield Support Dashboard

Repozytorium zawiera dashboard supportowy dla `IronShield Army`.

## Co jest w środku

- `apps-script/` - gotowa wersja do wdrożenia w `Google Apps Script`
- `index.html`, `app.js`, `styles.css`, `support-data.js` - lokalny prototyp dashboardu

## Jak tego używać

Najważniejszy folder to `apps-script/`.

Tam znajdziesz:

- backend do czytania Gmaila i wysyłania odpowiedzi
- frontend dashboardu
- manifest Apps Script
- instrukcję wdrożenia w `apps-script/README.md`

## Cel kolejnego etapu

- podpięcie `BaseLinker API`
- automatyczne tworzenie dosyłek i replacementów
- pełny workflow supportowy w jednym panelu
