# Apps Script Deployment

Ten folder zawiera wersję dashboardu przygotowaną do wdrożenia jako `Google Apps Script Web App`.

## Jak wdrożyć

1. Otwórz [script.new](https://script.new/) na koncie Google, które ma dostęp do Gmaila sklepu.
2. Utwórz nowy projekt, np. `IronShield Support Dashboard`.
3. Skopiuj zawartość plików:
   - `Code.gs`
   - `Dashboard.html`
   - `Stylesheet.html`
   - `AppClient.html`
4. W `Ustawienia projektu` włącz pokazanie pliku `appsscript.json` i wklej tam manifest z tego folderu.
5. Uruchom ręcznie funkcję `doGet`, żeby nadać uprawnienia.
6. Wybierz `Wdróż -> Nowe wdrożenie -> Aplikacja internetowa`.
7. Ustaw:
   - `Wykonuj jako`: `Ja`
   - `Kto ma dostęp`: `Tylko ja`
8. Zapisz link do wdrożenia.

## Co robi ta wersja

- czyta nieprzeczytane maile klientów z Gmaila,
- filtruje większość marketingu i wiadomości biznesowych,
- buduje listę zgłoszeń do dashboardu,
- pokazuje draft odpowiedzi,
- pozwala wysłać reply z poziomu Apps Script,
- pokazuje CTA do ręcznej akcji w `BaseLinkerze`.

## Uwaga

To był etap przejściowy. Jeśli `Google Apps Script` na Twoim koncie blokuje otwieranie `Web App`, aktualny kierunek projektu to publiczny frontend na `GitHub Pages` + prywatny backend poza repozytorium.
