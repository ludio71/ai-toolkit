# Plan: paczka `@ludio71/ai-toolkit`

Wejście: `m5l4-github-packages-spec-pack.md`, `m5l4-github-packages-spec-cicd.md`,
`m5l4-shared-spec-skill.md`, `m5l4-shared-conventions.md` + 5 template'ów.
Decyzja o modelu: `context/team/distribution-decision.md`.

## Świadome odstępstwa od template'ów

Template'y są punktem startu, nie wzorem do przepisania. Pięć miejsc, w których je zmieniam,
z uzasadnieniem — to jest lista decyzji, których nie podjął za mnie Agent:

1. **Wersja czytana z `package.json`, nie hardkodowana w `install.js`.**
   Template trzyma `PACKAGE_VERSION = "0.1.0"` jako stałą obok `package.json`. Przy pierwszym
   `npm version minor` manifest u konsumenta zacząłby kłamać o zainstalowanej wersji — a manifest
   jest jedynym źródłem prawdy przy deinstalacji. Jedno źródło wersji, `require("./package.json")`.

2. **Manifest grupowany per skill, nie płaska lista ścieżek.**
   Kształt z lekcji (`files.skills.<nazwa>.files[]`) pozwala odpowiedzieć na pytanie „które skille
   są zainstalowane i w jakich plikach", którego płaska lista nie udźwignie. Deinstalacja i tak
   iteruje po plikach, więc koszt zerowy.

3. **Deinstalacja usuwa też opustoszałe katalogi.**
   Template kasuje pliki z manifestu i zostawia puste `.claude/skills/code-review/`. Po roku
   i pięciu wersjach to dokładnie ten „osad po pięciu wersjach skilla", przed którym przestrzega
   lista wymagań z lekcji. Po usunięciu plików czyszczę katalogi skilli, jeśli są puste.

4. **Guard na uszkodzony blok sentinel.**
   `applyRulesBlock` z template'u przy jednym obecnym znaczniku (drugi skasowany ręczną edycją)
   wpada w gałąź „dopisz na koniec" i **duplikuje reguły**. Lekcja nazywa ten przypadek wprost.
   Wykrywam go i przerywam z czytelnym komunikatem, zamiast po cichu produkować drugi blok.

5. **Guard na sentinel-injection.**
   Wzorzec z modelu 3: jeśli sama treść `rules/CLAUDE.md` zawiera znaczniki BEGIN/END, odmawiam
   zapisu. Inaczej przy następnej instalacji podrzucony znacznik zostałby wzięty za prawdziwy
   i zjadł treść użytkownika spoza bloku.

## Fazy

### Faza 1 — szkielet paczki
- `package.json`: `@ludio71/ai-toolkit@0.1.0`, `publishConfig.registry`, `files`, `postinstall`,
  `bin: ai-toolkit`, `engines.node >=20`
- `README.md`: instalacja u konsumenta, `.npmrc`, wariant prywatny z `GH_PKG_TOKEN`
- Weryfikacja: `npm pack --dry-run` listuje dokładnie 6 wpisów z `files`

### Faza 2 — artefakty
- `skills/code-review/SKILL.md`: frontmatter `name` + `description`, 6 kategorii z handoutu,
  severity Critical → Warning → Suggestion, werdykt APPROVE / REQUEST CHANGES / NEEDS DISCUSSION
- Rdzeń neutralny językowo + dwie sekcje stackowe (TypeScript/Astro, Python/FastAPI) — decyzja
  z rozmowy: toolkit ma obsłużyć oba moje repo, a nie tylko to, w którym powstał
- `rules/CLAUDE.md`: krótki blok reguł doklejany do projektu konsumenta

### Faza 3 — instalator i deinstalator
- `install.js` / `uninstall.js` wg template'u + pięć odstępstw wyżej
- Weryfikacja: instalacja dwa razy pod rząd → jeden blok sentinel, dopisek użytkownika nietknięty;
  deinstalacja → katalog i blok znikają, reszta `CLAUDE.md` zostaje

### Faza 4 — CI/CD
- `.github/workflows/publish-ai-toolkit.yml`: job `validate` (frontmatter, zgodność `name`
  z katalogiem, `npm pack --dry-run`) → job `publish` na push do `main`
- `permissions: contents: read, packages: write`, `NODE_AUTH_TOKEN: secrets.GITHUB_TOKEN`
- Weryfikacja: zielony przebieg, paczka widoczna w zakładce Packages

### Faza 5 — dowód end-to-end
- Sandbox `ai-toolkit-consumer-demo/`, `npm install @ludio71/ai-toolkit`
- Weryfikacja: skill na miejscu, blok sentinel w `CLAUDE.md`, manifest zapisany, `uninstall` czyści

### Faza 6 — druga wersja
- Realna zmiana w `SKILL.md` → `npm version minor` → `0.2.0` w rejestrze
- Weryfikacja: lista wersji pokazuje dwie pozycje
