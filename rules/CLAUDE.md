## Konwencje zespołowe — `@ludio71/ai-toolkit`

Blok zarządzany przez instalator paczki. Treść **wewnątrz** znaczników jest nadpisywana przy
każdej aktualizacji — własne notatki trzymaj poza nimi.

### Zasady, które obowiązują w każdym repo

- **Błąd nigdy nie jest połykany.** `catch`, który loguje i nie propaguje, zamienia awarię
  w cichą odpowiedź sukcesu. Log to nie obsługa błędu.
- **Walidacja na granicy systemu.** Dane z zewnątrz są `unknown`, dopóki nie przejdą schematu.
- **Sekrety wyłącznie ze środowiska.** Żaden token nie wchodzi do repo ani do historii gita.
- **Test opisuje zachowanie, nie implementację.** Nazwa testu ma się czytać jak zdanie
  o systemie, a asercja ma być konkretna.
- **Jedna odpowiedzialność na funkcję.** Jeśli opis wymaga „i", funkcja idzie na pół.

### Review

Przegląd zmian prowadź skillem `code-review` z tej paczki — jest jedynym źródłem kryteriów.
Nie improwizuj własnej listy kontrolnej obok niego.

### Aktualizacja artefaktów

Skille i reguły pochodzą z paczki `@ludio71/ai-toolkit`. Nie edytuj ich w miejscu — poprawka
zrobiona lokalnie zniknie przy najbliższym `npm install`. Zmiany wprowadzasz w repozytorium
źródła prawdy i podbijasz wersję paczki.

### Wersjonowanie

Ma być zgodne z semver.
