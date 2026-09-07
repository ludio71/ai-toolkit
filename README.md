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

**1. Zmapuj scope na GitHub Packages.** W repozytorium konsumenta, plik `.npmrc` (commitowany):

```
@ludio71:registry=https://npm.pkg.github.com
```

Ten plik zawiera **wyłącznie** mapowanie. Token nigdy do niego nie wchodzi.

**2. Uwierzytelnij się.** Rejestr npm GitHub Packages wymaga tokena także dla paczek publicznych.

Lokalnie — raz na maszynę:

```bash
npm login --scope=@ludio71 --registry=https://npm.pkg.github.com
```

W CI — token ze zmiennej środowiskowej, doklejany dopiero na czas instalacji:

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

## Projekt bez `package.json` (Python, Go, Rust)

Paczka jest npm-owa, ale artefakty w niej to zwykłe pliki tekstowe — projekt konsumenta
nie musi mieć nic wspólnego z JavaScriptem. Potrzebny jest wyłącznie zainstalowany Node
(≥20), żeby uruchomić instalator.

Różnica jest jedna: zamiast dodawać zależność do `package.json`, wołasz instalator wprost.

```bash
cd ~/projekty/moj-projekt-python      # katalog z pyproject.toml, go.mod, Cargo.toml…

printf '@ludio71:registry=https://npm.pkg.github.com\n' > .npmrc
printf '//npm.pkg.github.com/:_authToken=${GH_PKG_TOKEN}\n' >> .npmrc

export GH_PKG_TOKEN="$(gh auth token)"   # albo raz: npm login --scope=@ludio71 …
npx @ludio71/ai-toolkit@latest install
```

Efekt jest identyczny jak w projekcie npmowym:

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
