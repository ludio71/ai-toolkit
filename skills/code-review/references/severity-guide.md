# Jak przypisać wagę findingowi

Waga nie jest miarą tego, jak bardzo coś przeszkadza czytającemu. Jest odpowiedzią
na jedno pytanie: **co się stanie, jeśli ta zmiana pojedzie na produkcję taka, jaka jest.**

## Critical — zablokuj merge

Kod działa źle albo otwiera dziurę. Skutek jest widoczny dla użytkownika lub atakującego:

- połknięty wyjątek — awaria wraca do klienta jako sukces
- brak autoryzacji po stronie serwera, gdy UI tylko ukrywa element
- SQL sklejany stringiem z danych wejściowych
- sekret w kodzie albo w historii gita
- nowa tabela bez RLS w projekcie, który na RLS polega
- test, który nie może paść — asercja tautologiczna albo `toBeTruthy()` na czymkolwiek

## Warning — napraw przed merge, ale to nie jest awaria

Kod działa dla przypadku, który autor miał w głowie, i psuje się poza nim:

- brak obsługi przypadku brzegowego: pusta lista, `null`, wartość graniczna
- `any` bez uzasadnienia na granicy, przez którą płyną dane z zewnątrz
- funkcja robiąca dwie rzeczy, których nazwa nie zapowiada
- test zależny od kolejności wykonania albo od stanu po innym teście

## Suggestion — do rozważenia, nie blokuje

Zmiana jest poprawna, a uwaga dotyczy czytelności albo spójności z resztą repo.
Jeśli nie potrafisz wskazać, co konkretnie zyskuje czytelnik, to nie jest finding — odpuść.

## Zasada rozstrzygająca

Przy wahaniu między dwoma poziomami zadaj pytanie: *czy potrafię opisać konkretny scenariusz
— wejście i wynik — w którym to zawodzi?* Jeśli tak, waga jest wyższa. Jeśli nie, jest niższa
albo to w ogóle nie jest finding.
