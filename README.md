# IronShield Support Dashboard

Repozytorium zawiera dashboard supportowy dla `IronShield Army`.

## Co jest w środku

- `index.html`, `app.js`, `styles.css`, `support-data.js` - publiczny dashboard demo pod `GitHub Pages`
- `apps-script/` - zachowany wcześniejszy eksperyment z `Google Apps Script`

## Jak tego używać

Najważniejsze pliki dla obecnego kierunku to katalog główny repozytorium.

Publiczna wersja:

- działa jako statyczny dashboard demo na `GitHub Pages`
- pokazuje bezpieczne, fikcyjne dane demonstracyjne
- nie czyta Gmaila i nie wysyła maili bezpośrednio

## Konfiguracja trybu pracy

- `support-config.js` steruje tym, czy dashboard działa jako publiczne demo, czy czyta prywatne API.
- Domyślnie ustawione jest:
  - `mode: "demo"`
  - `remoteDataUrl: ""`
- Kiedy będziemy przełączać dashboard na prawdziwy backend, zmienimy tylko:
  - `mode: "remote"`
  - `remoteDataUrl` na adres prywatnego endpointu JSON

Dokładny kontrakt odpowiedzi backendu jest opisany w [private-api-contract.md](/Users/User/Documents/New project/private-api-contract.md).

## GitHub Pages

1. Wejdź do repozytorium na GitHubie.
2. Otwórz `Settings`.
3. Wejdź w `Pages`.
4. W sekcji `Build and deployment` ustaw:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
5. Kliknij `Save`.

Po chwili dashboard będzie dostępny pod adresem w stylu:

`https://ironshieldarmy.github.io/ironshield-support-dashboard/`

## Ważne bezpieczeństwo

- Nie wrzucaj prawdziwych maili klientów, numerów zamówień ani danych z Gmaila do publicznego repozytorium.
- `support-data.js` w tej wersji ma zawierać tylko dane demo albo zanonimizowane przykłady.
- Prawdziwy live support powinien wrócić dopiero po postawieniu prywatnego backendu.
- Nie wkładaj żadnych sekretów, tokenów ani prawdziwych haseł do `support-config.js`, bo to plik publiczny.
- Jeśli używasz blokady wejścia w `support-config.js`, traktuj ją tylko jako publiczny front-end gate do szybkiego ograniczenia dostępu, a nie jako realne zabezpieczenie.
- Prawdziwa ochrona tego panelu wymaga prywatnego hostingu albo serwerowego logowania.

## Cel kolejnego etapu

- prywatny backend do czytania Gmaila poza publicznym repo
- podpięcie `BaseLinker API`
- automatyczne tworzenie dosyłek i replacementów
- pełny workflow supportowy w jednym panelu
