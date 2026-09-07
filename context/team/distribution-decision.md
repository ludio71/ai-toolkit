---
doc: distribution-decision
lesson: m5l4
created: 2026-09-07
---

# Wybór modelu dystrybucji artefaktów AI

Zadanie 1 z M5L4: przyłożenie tabeli decyzyjnej z lekcji do własnego kontekstu.

## Pierwszy wiersz tabeli: kto jest odbiorcą

Odbiorcą jestem **ja sam, pracujący w wielu niezależnych repozytoriach**:

| Repo | Stack | Gdzie żyje |
| ---- | ----- | ---------- |
| `kompas-polityczny` | Astro 6 SSR, React 19, TypeScript, Supabase, Cloudflare Workers | GitHub (`ludio71`) |
| `unirag/backend` | Python, FastAPI, Qdrant, SQLAlchemy | firmowy GitLab (RITS) |
| `chat` | TypeScript | lokalnie / GitHub |
| projekty kursowe (`m5l1`, `ai-toolkit`) | mieszane | GitHub |

To jest dokładnie sytuacja multi-repo z wprowadzenia do lekcji, tylko w skali jednej osoby.
Problem jest realny i mierzalny: `10x-e2e`, reguły z `CLAUDE.md` i konwencje review istnieją
dziś w `kompas-polityczny` w wersji, której żaden inny projekt nie widzi. Kiedy dopracowuję
regułę w jednym repo, pozostałe zostają na starej wersji i nikt — łącznie ze mną — nie wie,
która jest obowiązująca. Kopiuj-wklej między repo już się wydarzył i już się rozjechał.

Skala jest mała, ale **problem jest ten sam co zespołowy**: brak jednego źródła prawdy,
brak wersjonowania, brak kontrolowanej deinstalacji.

## Decyzja: Model 1 — GitHub Packages

Wybieram model 1, bo to **rejestr, który już mam**: repozytoria kursowe i prywatne stoją na
GitHubie, konto ma `write:packages`, a całe „stawianie infrastruktury" to jedno pole
`publishConfig` w `package.json` plus workflow publikujący na efemerycznym `GITHUB_TOKEN`.
Koszt uruchomienia bliski zeru, koszt utrzymania to wyłącznie token do odczytu tam, gdzie
konsument stoi poza GitHub Actions.

Model 2 (CodeArtifact + Terraform) odrzucam, bo **nie mam konta AWS w tym kontekście, a rejestr
jako zasób nie potrzebuje ode mnie zarządzania na poziomie polityk IAM**. ~70 linii Terraformu
i bootstrap OIDC kupiłyby mi kontrolę, której nie użyję.

Model 3 (API + CLI) odrzucam, bo jego dwa uzasadnienia — wielość stacków u odbiorców i
dawkowanie treści w czasie — u mnie nie występują. Nie muszę nikomu odbierać dostępu ani
wydawać artefaktów porcjami. Zbudowanie pełnego produktu z auth i podpisami Ed25519 byłoby
klasyczną „dystrybucją pod CV" z ostatniej sekcji lekcji.

## Uczciwe zastrzeżenie: GitLab

`unirag` żyje na firmowym GitLabie i **nie zaciągnie paczki z GitHub Packages** bez tokena
i mapowania scope po stronie firmowego CI. To nie unieważnia wyboru: model pozostaje ten sam
(rejestr, który zespół już ma), zmienia się tylko jego instancja — GitLab Package Registry
przyjmuje paczki npm tym samym `npm publish`, różni się endpointem i sposobem uwierzytelnienia.
`SKILL.md` jest przenośny, więc migracja kanału nie dotyka treści artefaktów.

Świadomie tego **nie** buduję teraz: PoC dowodzi mechanizmu na jednym rejestrze, a nie na dwóch.

## Zadanie 2 (`/10x-shape` → `/10x-prd` → `/10x-roadmap`) — pominięte

Zadanie 2 lekcji jest warunkowe: „jeśli decyzja jest niepewna". Nie jest — odbiorca jest znany,
a odpowiedź na pierwszy wiersz tabeli rozstrzyga wybór jednoznacznie. Rozpisywanie PRD pod
decyzję, która zajmuje akapit, byłoby ceremonią bez treści.
