# Weryfikacja — `ai-toolkit-package`

Data: 2026-09-07. Wszystkie fazy planu domknięte.

## Faza 1–3 — paczka i instalator

`node scripts/verify-install.js` — **16/16 asercji zielonych** na jednorazowym projekcie
w katalogu tymczasowym:

| Grupa | Co sprawdzone |
| ----- | ------------- |
| instalacja | skill na miejscu, manifest zapisany, blok sentinel dodany, cudza treść nietknięta, wersja z `package.json`, manifest grupowany per skill |
| idempotencja | druga instalacja → dokładnie jeden znacznik BEGIN, notatki sprzed i zza bloku przeżyły |
| guardy | sentinel-injection odrzucony, uszkodzony blok (BEGIN bez END) wykryty wyjątkiem |
| deinstalacja | blok usunięty, treść użytkownika została, pliki skilla usunięte, pusty katalog sprzątnięty, manifest usunięty |

`npm pack --dry-run` → 7 plików, 8.0 kB — dokładnie zawartość `files` z `package.json`.

## Faza 4 — CI/CD

| Przebieg | Wersja | Wynik |
| -------- | ------ | ----- |
| [34156118141](https://github.com/ludio71/ai-toolkit/actions/runs/34156118141) | 0.1.0 | ✅ validate 5 s + publish 6 s |
| [34156245868](https://github.com/ludio71/ai-toolkit/actions/runs/34156245868) | 0.2.0 | ✅ validate + publish, 19 s |

Publikacja uwierzytelniona efemerycznym `GITHUB_TOKEN` — w repo nie ma żadnego trwałego sekretu.

## Faza 5 — konsument end-to-end

Sandbox `ai-toolkit-consumer-demo/`, instalacja **z rejestru**, nie z dysku. Token wstrzyknięty
zmienną `GH_PKG_TOKEN`; w `.npmrc` została sama nazwa zmiennej.

1. `npm install @ludio71/ai-toolkit` (0.1.0) → 2 pliki, blok sentinel doklejony pod istniejącą
   treścią `CLAUDE.md`
2. ręczny dopisek pod blokiem, potem `npm install @ludio71/ai-toolkit@latest` (0.2.0) →
   **3 pliki** (doszedł `references/severity-guide.md`), **jeden** znacznik BEGIN,
   obie własne notatki nietknięte
3. `npx ai-toolkit uninstall` → `.claude/` zniknęło w całości wraz z zagnieżdżonym
   `references/`, w `CLAUDE.md` zostały wyłącznie dwie notatki użytkownika

Punkt 2 jest właściwym dowodem idempotencji: aktualizacja między wersjami podmieniła zawartość
bloku i **dołożyła nowy plik do istniejącego skilla**, nie dotykając niczego poza swoim zakresem.

Punkt 3 potwierdza, że sprzątanie stoi na manifescie, a nie na zgadywaniu po katalogu —
zagnieżdżony `references/` nie został osierocony.

## Potwierdzenie w rejestrze

```
$ gh api user/packages/npm/ai-toolkit --jq '.name, .visibility, .version_count'
ai-toolkit | public | 2

$ gh api user/packages/npm/ai-toolkit/versions
- 0.2.0  2026-09-07T19:36:58Z
- 0.1.0  2026-09-07T19:35:00Z
```

## Uzupełnienie 2026-09-07 — regresja wykryta poza npm

Pytanie „jak zaciągnąć skille do projektu w Pythonie" odsłoniło błąd, którego nie widziała
żadna z dotychczasowych 16 asercji.

`findProjectRoot()` — w tej postaci wzięty z template'u lekcji — szukał korzenia projektu,
idąc w górę do pierwszego katalogu `node_modules`. Przy `npx @ludio71/ai-toolkit install`
pierwszym trafionym `node_modules` jest **cache npx**
(`~/.npm/_npx/<hash>/node_modules/@ludio71/ai-toolkit`), więc skille lądowały w katalogu
tymczasowym i znikały razem z nim. Projekt użytkownika zostawał pusty, a komenda kończyła się
komunikatem o sukcesie.

Błąd trafiał dokładnie w ten scenariusz, dla którego `npx` w ogóle istnieje: projekty bez
`package.json` (Python, Go, Rust). W projekcie npmowym `npm install` działał poprawnie, więc
weryfikacja przez `PROJECT_ROOT` go nie łapała.

Naprawa (`0.2.1`):

- cache npx rozpoznawany po segmencie ścieżki `_npx` i odrzucany jako kandydat na korzeń
- fallback na `INIT_CWD` (katalog wywołania komendy), potem `process.cwd()`
- `postinstall` odpalony w cache npx kończy się bez zapisu — instaluje dopiero jawne
  `ai-toolkit install`
- `uninstall.js` korzysta z tej samej funkcji, bo miał identyczny błąd

Weryfikacja rozszerzona o sekcję 5 (**21 asercji**): rozpoznanie cache npx, instalacja
i deinstalacja w projekcie z `pyproject.toml` zamiast `package.json`. Potwierdzone na żywym
rejestrze — `npx @ludio71/ai-toolkit@latest install` w katalogu Pythonowym układa
`.claude/skills/` i blok w `CLAUDE.md`, nie tworząc `node_modules`.
