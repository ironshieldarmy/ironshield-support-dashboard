# IronShield Support Dashboard

To jest darmowy dashboard supportowy do uruchomienia w `Google Apps Script`.

## Co robi

- czyta nowe i aktywne maile klientów z Gmaila
- ignoruje spam, faktury i outreach marketingowy
- pokazuje kolejkę spraw, draft odpowiedzi i CTA operacyjne
- pozwala oznaczać statusy
- pozwala wysyłać odpowiedzi bezpośrednio z panelu

## Jak wdrożyć

1. Zaloguj się na konto Google, do którego wpadają maile `ironshieldarmy@gmail.com`, `support@ironshieldarmy.com` i `office@ironshieldarmy.com`.
2. Wejdź na [script.new](https://script.new/) i utwórz nowy projekt Apps Script.
3. W projekcie utwórz pliki:
   - `Code.gs`
   - `Dashboard.html`
   - `Stylesheet.html`
   - `AppClient.html`
   - `appsscript.json`
4. Wklej do nich zawartość plików z tego folderu `apps-script/`.
5. Zapisz projekt i uruchom dowolną funkcję, np. `doGet`, żeby nadać uprawnienia do Gmaila.
6. W `Deploy -> New deployment` wybierz `Web app`.
7. Ustaw:
   - `Execute as`: `Me`
   - `Who has access`: `Only myself`
8. Otwórz adres wdrożenia i sprawdź panel.

## Ważne uwagi

- Panel działa na bieżąco z aktualną skrzynką, więc nie potrzebuje localhosta.
- Aliasy `support@ironshieldarmy.com` i `office@ironshieldarmy.com` muszą już wpadać do tej samej skrzynki Gmail.
- Klasyfikacja maili jest heurystyczna, więc warto co jakiś czas dopisać nowe wzorce do `Code.gs`.
- Następny logiczny etap to integracja z `BaseLinker API`.
