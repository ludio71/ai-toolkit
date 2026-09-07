---
name: code-review
description: Review code changes against team engineering conventions, testing standards and security expectations. Use when asked to "review code", "check this PR", "review my changes", or "code review".
---

# Code Review

Przegląd zmian pod kątem konwencji z `context/team/` — nie wymyślaj własnego standardu review.
Rdzeń jest niezależny od języka; sekcje stackowe stosujesz tylko wtedy, gdy zmiana ich dotyka.

## Zakres

Domyślnie: `git diff` względem gałęzi bazowej. Gdy podano ścieżkę albo numer PR — ten zakres.
Czytasz też pliki sąsiadujące, jeśli bez nich nie da się ocenić poprawności zmiany.
Nie recenzujesz kodu, którego zmiana nie dotknęła.

## Kategorie

### 1. Nazewnictwo
- Deskryptywny camelCase; skróty tylko `url`, `id`, `api`, `config`
- Booleany z prefiksem `is`, `has`, `should`, `can`
- Funkcje zaczynają się od czasownika (`getUserById`, nie `user`)
- Nazwa pliku odpowiada głównemu eksportowi
- Stałe UPPER_SNAKE_CASE

### 2. Obsługa błędów
- Każda operacja asynchroniczna ma `try/catch` albo `.catch()`
- Komunikat mówi, **która operacja** padła i na jakich danych
- Zero pustych `catch` — minimum log albo rethrow
- **Połknięty błąd to finding krytyczny:** `catch`, który loguje i nie propaguje dalej,
  zamienia błąd w cichą odpowiedź 200
- Sprzątanie zasobów w `finally`

### 3. Typy
- Zero `any` bez komentarza z uzasadnieniem
- `unknown` dla danych z zewnątrz, zawężane type guardem
- Stany modelowane unią rozróżnialną, nie zestawem pól opcjonalnych
- Parametry generyczne mają nazwy (`TUser`, nie `T`)

### 4. Projekt funkcji
- Jedna odpowiedzialność; jeśli w opisie pada „i", funkcja idzie na pół
- Maksymalnie 3 parametry, powyżej — obiekt opcji
- Wczesne wyjścia zamiast zagnieżdżonych warunków
- Funkcje zapytań (`get*`, `find*`, `is*`) są czyste

### 5. Bezpieczeństwo
- Zero sekretów w kodzie — wyłącznie zmienne środowiskowe
- Walidacja wejścia na granicy systemu
- SQL wyłącznie parametryzowany
- Odpowiedź API nie wynosi stack trace'ów ani ścieżek wewnętrznych
- Autoryzacja sprawdzana po stronie serwera, nie tylko ukryciem elementu w UI

### 6. Testy
- Nazwa testu opisuje zachowanie: „returns empty array when no results found"
- Każdy test ma własny setup i teardown; brak zależności od kolejności
- Asercje konkretne: `toEqual(expected)` zamiast `toBeTruthy()`
- Pokryte przypadki brzegowe: puste, null, wartości graniczne, ścieżki błędu

## Sekcje stackowe

Stosuj tę, która odpowiada zmienianym plikom. Obie pomiń dla kodu w innym stacku.

### TypeScript / Astro / Supabase
- Strony SSR: interaktywność żyje w wyspach; stan przed hydratacją nie istnieje
- API routes eksportują `GET`/`POST` wielkimi literami i mają `export const prerender = false`
- Wejście do endpointu walidowane zodem, nie ręcznym `if`-em
- Nowa tabela bez włączonego RLS i polityk per-operacja to finding krytyczny
- Klasy Tailwind łączone helperem `cn()`, nie konkatenacją stringów

### Python / FastAPI
- Adnotacje typów na granicach publicznych; `Any` traktowany jak `any` wyżej
- Wejście i wyjście endpointu opisane modelem pydantic, nie gołym dict
- Zapytania do bazy przez ORM albo parametryzowane; f-string w SQL to finding krytyczny
- Sesje i klienty zamykane przez kontekst menedżer albo zależność FastAPI
- `except Exception` bez ponownego podniesienia wyjątku to połknięty błąd z kategorii 2

## Format wyjścia

Findingi pogrupowane wagą, w kolejności:

```
## Critical
- `src/lib/foo.ts:42` — <co jest złe> → <co zrobić>

## Warning
- ...

## Suggestion
- ...
```

Każdy finding ma odwołanie `plik:linia`, gdy da się je wskazać. Bez findingów — wypisz sekcję
jako pustą, nie pomijaj jej.

Zakończ **jedną** rekomendacją:

- `APPROVE` — brak findingów krytycznych
- `REQUEST CHANGES` — co najmniej jeden finding krytyczny
- `NEEDS DISCUSSION` — zmiana jest poprawna, ale wybór projektowy wymaga decyzji człowieka

## Czego nie robisz

- Nie przepisujesz kodu, którego zmiana nie dotknęła
- Nie zgłaszasz preferencji stylistycznych, które załatwia formatter
- Nie mnożysz findingów o tej samej przyczynie — jeden wpis, lista wystąpień
