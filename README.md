# @ludio71/ai-toolkit

Wspólne artefakty AI — skille i reguły — dystrybuowane jako wersjonowana paczka npm
przez **GitHub Packages**. Jedno źródło prawdy zamiast kopiowania `SKILL.md` między repozytoriami.

Uzasadnienie wyboru modelu dystrybucji: [`context/team/distribution-decision.md`](context/team/distribution-decision.md).

## Co jest w paczce

| Artefakt | Trafia do | Opis |
| -------- | --------- | ---- |
| `skills/code-review/SKILL.md` | `.claude/skills/code-review/` | Review wg konwencji zespołowych — rdzeń neutralny + warianty TS/Astro i Python/FastAPI |
| `rules/CLAUDE.md` | blok w `CLAUDE.md` projektu | Reguły obowiązujące w każdym repo |

## Instalacja u konsumenta

Kolejność ma znaczenie: **bez kroku 2 krok 3 kończy się błędem `E401`**, niezależnie od tego,
czy paczka jest publiczna.

**1. Zmapuj scope na GitHub Packages.** W repozytorium konsumenta, plik `.npmrc` (commitowany):

```
@ludio71:registry=https://npm.pkg.github.com
```

Ten plik zawiera **wyłącznie** mapowanie. Token nigdy do niego nie wchodzi.

**2. Uwierzytelnij się.** Rejestr npm GitHub Packages wymaga tokena także dla paczek
publicznych — inaczej niż `ghcr.io` dla obrazów kontenerów. To najczęstsze miejsce, w którym
instalacja się wywraca.

Potrzebujesz tokena GitHuba z uprawnieniem `read:packages`. Jeśli masz `gh`, wypisze go
`gh auth token`.

*Lokalnie, raz na maszynę* — token trafia do twojego `~/.npmrc` (na Windowsie
`C:\Users\<user>\.npmrc`), poza jakimkolwiek repozytorium:

```bash
npm config set "//npm.pkg.github.com/:_authToken" "<TWOJ_TOKEN>"
```

Działa tak samo w `cmd.exe`, PowerShellu i bashu. Sprawdzenie, że podziałało:

```bash
npm view @ludio71/ai-toolkit version
```

> Alternatywa: `npm login --scope=@ludio71 --auth-type=legacy --registry=https://npm.pkg.github.com`
> (username = twój login GitHub, password = **token**, nie hasło do konta).
> Flaga `--auth-type=legacy` jest obowiązkowa: od npm 9 domyślnym trybem jest logowanie przez
> przeglądarkę, którego GitHub Packages nie obsługuje.

*W CI* — token ze zmiennej środowiskowej, doklejany dopiero na czas instalacji:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: 22
    registry-url: "https://npm.pkg.github.com"
    scope: "@ludio71"
- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GH_PKG_TOKEN }}
```

Na platformach buildów, które nie widzą sekretów GitHuba (Cloudflare Pages/Workers, Vercel),
ten sam token trzeba wprowadzić do ich własnego magazynu sekretów — osobno dla środowiska
produkcyjnego i preview.

**3. Zainstaluj.**

```bash
npm install @ludio71/ai-toolkit
```

`postinstall` układa artefakty na miejscu. Ręcznie: `npx ai-toolkit install`.

**Projekt bez `package.json`?** Nie używaj `npm install` — patrz sekcja niżej.

## Projekt bez `package.json` (Python, Go, Rust)

Paczka jest npm-owa, ale artefakty w niej to zwykłe pliki tekstowe — projekt konsumenta
nie musi mieć nic wspólnego z JavaScriptem. Jedyny wymóg to zainstalowany Node (≥20),
żeby uruchomić instalator.

Różnice względem projektu npmowego są dwie:

- **nie** dodajesz zależności do `package.json` — wołasz instalator wprost przez `npx`
- `npm install` byłby tu błędem: utworzyłby `package.json` i `node_modules` w repo, które
  z npm nie ma nic wspólnego

Uwierzytelnienie jest identyczne jak w kroku 2 wyżej i musi być zrobione **przed** instalacją.

```bash
cd ~/projekty/moj-projekt-python      # katalog z pyproject.toml, go.mod, Cargo.toml…
```

Plik `.npmrc` w tym katalogu — jedna linia, bez tokena:

```
@ludio71:registry=https://npm.pkg.github.com
```

Potem instalacja:

```bash
npx @ludio71/ai-toolkit@latest install
```

Efekt:

```text
moj-projekt-python/
├── pyproject.toml
├── CLAUDE.md                      ← blok reguł między znacznikami
└── .claude/
    ├── .ai-toolkit-manifest.json
    └── skills/code-review/
        ├── SKILL.md
        └── references/severity-guide.md
```

W katalogu nie powstaje `node_modules` ani `package.json` — `npx` rozpakowuje paczkę do
własnego cache, a instalator kopiuje z niego pliki do projektu. Aktualizacja to ponowne
`npx @ludio71/ai-toolkit@latest install`, deinstalacja — `npx @ludio71/ai-toolkit uninstall`.

> Ten tryb jest **kopiujący**, nie linkujący: cache `npx` jest ulotny, więc dowiązania
> symboliczne przestałyby działać zaraz po zakończeniu komendy.

Bez lockfile'a nic nie pilnuje aktualności artefaktów — w projekcie npmowym robi to
`npm update`, tutaj musisz sam powtórzyć `install`. Wersję, którą masz u siebie, sprawdzisz
w `.claude/.ai-toolkit-manifest.json`.

## Aktualizacja i deinstalacja

```bash
npm update @ludio71/ai-toolkit   # podbicie wersji
npx ai-toolkit uninstall         # czyste usuniecie
```

Instalator jest **idempotentny**: powtórna instalacja podmienia zawartość bloku między
znacznikami i nie tyka niczego poza nim.

```markdown
<!-- BEGIN @ludio71/ai-toolkit -->
... reguły zespołowe, nadpisywane przy każdej aktualizacji ...
<!-- END @ludio71/ai-toolkit -->
```

Twoje własne notatki w `CLAUDE.md` przetrwają każdy `install` — pod warunkiem, że leżą
**poza** znacznikami.

Deinstalacja czyta `.claude/.ai-toolkit-manifest.json` i usuwa dokładnie te pliki, które
instalator kiedyś dodał — nie zgaduje po zawartości katalogu i nie zależy od tego, czy
`node_modules` wciąż istnieje.

## Rozwój paczki

```bash
npm run validate    # bramka: metadane, frontmatter skilli, zgodnosc nazw
npm run test:e2e    # pelny cykl instalacja -> reinstalacja -> deinstalacja w katalogu tymczasowym
npm pack --dry-run  # co realnie wejdzie do paczki
```

Publikacja idzie z CI na push do `main` (`.github/workflows/publish-ai-toolkit.yml`),
uwierzytelniona efemerycznym `GITHUB_TOKEN`. Wersję podbijasz **wyłącznie** przez
`npm version patch|minor|major` — rejestr odrzuca duplikat wersji błędem 409.

## Dodanie nowego artefaktu

1. Nowy katalog w `skills/<nazwa>/` z `SKILL.md` (pole `name` we frontmatterze musi
   odpowiadać nazwie katalogu — pilnuje tego `npm run validate`)
2. `npm version minor`
3. `git push --follow-tags` — reszta dzieje się w CI
