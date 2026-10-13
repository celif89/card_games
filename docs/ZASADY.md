# Miasteczko S.A. — zasady (wersja robocza 0.1)

> Wszystkie liczby są punktem startowym do testów. Wersja przeglądarkowa
> posłuży do szybkiego sprawdzania balansu.

## 1. Idea

Gracze prowadzą firmy deweloperskie w rozwijającym się miasteczku. Kupują
działki, produkują materiały budowlane, stawiają budynki, które przynoszą
czynsz, i realizują zlecenia miasta. Po **8 rundach** (2 lata po 4 kwartały)
wygrywa gracz z największym majątkiem.

- 2–4 graczy, od 10 lat, 45–60 minut.
- Losowa jest tylko kolejność kart Wiadomości i Zleceń. Zawsze widać kolejne
  2 Wiadomości i 4 Zlecenia, więc da się je zaplanować.
- Każdy gra na swoim urządzeniu: ukryte oferty w licytacji i własne zasoby
  widzi tylko właściciel.

## 2. Plansza — mapa miasteczka 6×6

```
     A   B   C   D   E   F
1    L   L*  Z   Z   G   G
2    L   Z   Z   Z   Z   G
3    Z   Z   C*  C*  Z   P
4    Z   Z   C*  C*  Z   P*
5    G*  Z   Z   Z   Z   P*
6    G   Z   Z   Z   L   L
```

| Symbol | Teren       | Liczba | Cena zakupu |
|--------|-------------|--------|-------------|
| Z      | zwykła      | 19     | 3           |
| L      | las         | 5      | 4           |
| G      | glinianka   | 5      | 4           |
| P      | przemysłowa | 3      | 5           |
| C      | centrum     | 4      | tylko licytacja |

`*` — działka licytowana (patrz §5). Kolejność licytacji:
1. C3 · 2. F4 · 3. D3 · 4. A5 · 5. C4 · 6. B1 · 7. D4 · 8. F5

**Sąsiedztwo** = pola stykające się bokiem (bez skosów).

## 3. Materiały i rynek

| Materiał | Cena bazowa | Produkuje |
|----------|-------------|-----------|
| Drewno   | 3           | Tartak    |
| Cegła    | 4           | Cegielnia |
| Stal     | 6           | Huta      |

- Każdy materiał ma tor ceny **1–10**.
- **Sprzedaż:** za każdą sztukę dostajesz aktualną cenę, potem cena spada o 1
  (minimum 1).
- **Kupno:** za każdą sztukę płacisz aktualną cenę, potem cena rośnie o 1
  (maksimum 10).
- Na końcu rundy każda cena przesuwa się o 1 w stronę ceny bazowej.

## 4. Budynki

| Budynek     | Teren            | Koszt                          | Efekt co rundę    | Wartość na koniec |
|-------------|------------------|--------------------------------|-------------------|-------------------|
| Tartak      | las              | 4 monety + 1 cegła             | +2 drewna         | 3 |
| Cegielnia   | glinianka        | 4 monety + 2 drewna            | +2 cegły          | 3 |
| Huta        | przemysłowa      | 6 monet + 2 cegły + 1 drewno   | +1 stal           | 4 |
| Dom         | zwykła / centrum | 2 drewna + 1 cegła             | czynsz 2          | 4 |
| Kamienica   | zwykła / centrum | 1 drewno + 3 cegły + 1 stal    | czynsz 4          | 8 |
| Biurowiec   | centrum          | 3 cegły + 3 stal               | czynsz 7          | 14 |
| Park        | zwykła           | 3 monety                       | — (patrz niżej)   | 0, ale +2 prestiżu |

**Rozbudowa:** Dom można przebudować na Kamienicę za 2 cegły + 1 stal
(akcja Buduj).

**Urbanistyka** (dotyczy budynków wszystkich graczy):
- Dom/Kamienica obok **Parku**: czynsz +1.
- Dom/Kamienica obok **budynku publicznego** (ze Zlecenia): czynsz +1.
- Dom/Kamienica obok **Cegielni lub Huty**: czynsz −1 (hałas, minimum 0).
- Budynek mieszkalny lub Biurowiec w **centrum**: czynsz +1.

## 5. Przebieg rundy

1. **Wiadomości.** Odkryj kartę Wiadomości (jej efekt działa w tej rundzie).
   Dwie kolejne karty są widoczne cały czas.
2. **Licytacja.** Licytowana jest działka z kolejnym numerem. Każdy gracz
   w tajemnicy wpisuje ofertę (0 lub więcej monet). Oferty są odkrywane
   jednocześnie. Wygrywa najwyższa i płaci ją bankowi. Przy remisie wygrywa
   gracz wcześniejszy w kolejności tury. Jeśli wszyscy dali 0, działka trafia
   do zwykłej sprzedaży za 6 monet.
3. **Akcje.** Zaczynając od pierwszego gracza, każdy po kolei stawia
   **jednego** menedżera na wolnym polu akcji i od razu ją wykonuje. Kto nie
   ma już menedżerów, pasuje.
4. **Dochód.** Budynki produkują materiały, mieszkania i biurowce płacą
   czynsz.
5. **Koszty i porządki.** Każda pożyczka kosztuje 1 monetę odsetek. Ceny na
   rynku wracają o 1 w stronę bazowej. Menedżerowie wracają do graczy.

## 6. Pola akcji

| Akcja | Miejsca (2 gr. / 3–4 gr.) | Co robi |
|-------|---------------------------|---------|
| Kup działkę | 1 / 2 | kup 1 wolną działkę po cenie z tabeli |
| Buduj | 1 / 2 | zbuduj lub rozbuduj 1 budynek na swojej działce |
| Buduj (drugie pole) | 1 / 1 | jak wyżej, ale kosztuje 1 monetę więcej |
| Sprzedaj | 1 / 2 | sprzedaj do 4 sztuk materiałów |
| Kup materiały | 1 / 1 | kup do 4 sztuk materiałów |
| Ratusz | 1 / 2 | weź 1 z 4 widocznych Zleceń (najwyżej 2 na ręce) |
| Bank | bez limitu | weź pożyczkę 10 monet albo spłać pożyczkę (10 monet) |
| Biuro kadr | 1 / 1 | zatrudnij 4. menedżera za 6 monet (raz na grę) |
| Pierwszy gracz | 1 / 1 | weź znacznik pierwszego gracza i 1 monetę |

Każdy gracz zaczyna z **3 menedżerami**.

## 7. Zlecenia miasta (budynki publiczne)

Na stole leżą 4 odkryte karty. Wzięte Zlecenie realizujesz akcją Buduj na
swojej działce właściwego typu. Nagrodę dostajesz od razu. Budynek publiczny
podnosi czynsz sąsiednim mieszkaniom wszystkich graczy. Niezrealizowane
Zlecenie na koniec gry: −3 prestiżu.

| Zlecenie    | Teren            | Koszt                          | Nagroda             |
|-------------|------------------|--------------------------------|---------------------|
| Boisko      | zwykła           | 2 drewna                       | 2 monety + 2 PP |
| Remiza      | zwykła           | 2 drewna + 2 cegły             | 5 monet + 3 PP |
| Przedszkole | zwykła           | 3 drewna + 2 cegły             | 6 monet + 4 PP |
| Szkoła      | zwykła           | 2 drewna + 3 cegły + 1 stal    | 8 monet + 5 PP |
| Przychodnia | zwykła / centrum | 1 drewno + 2 cegły + 2 stal    | 8 monet + 5 PP |
| Biblioteka  | centrum          | 1 drewno + 3 cegły + 1 stal    | 6 monet + 6 PP |
| Basen       | zwykła           | 4 cegły + 2 stal               | 9 monet + 6 PP |
| Dworzec     | zwykła           | 3 cegły + 3 stal               | 10 monet + 7 PP |
| Ratusz-filia| centrum          | 2 drewna + 2 cegły + 2 stal    | 8 monet + 7 PP |
| Kościół     | zwykła           | 1 drewno + 5 cegieł            | 7 monet + 6 PP |
| Targowisko  | zwykła           | 3 drewna + 1 cegła             | 5 monet + 3 PP |
| Muzeum      | centrum          | 4 cegły + 3 stal               | 10 monet + 9 PP |

## 8. Karty Wiadomości (10 kart, w grze 8)

| Karta | Efekt w tej rundzie |
|-------|---------------------|
| Boom budowlany | cena cegły +2 |
| Sezon remontów | cena drewna +2 |
| Tania stal z importu | cena stali −2 |
| Dotacja mieszkaniowa | każdy Dom daje czynsz +1 |
| Strajk w hucie | Huty nic nie produkują |
| Niskie stopy | brak odsetek od pożyczek |
| Nowa linia autobusowa | działki zwykłe kosztują 2 |
| Podatek od nieruchomości | płacisz 1 monetę za każde pełne 3 budynki |
| Konkurs architektoniczny | gracz, który w tej rundzie postawi najwięcej budynków, dostaje 3 PP (remis: wszyscy remisujący) |
| Dzień otwarty | każdy Park daje właścicielowi 2 monety |

## 9. Handel między graczami

W fazie akcji gracze mogą w każdej chwili wymieniać się monetami
i materiałami na dowolnych warunkach. Działek i Zleceń nie można przekazywać.
W aplikacji odbywa się to przez ofertę wymiany, którą druga strona akceptuje
albo odrzuca.

## 10. Start gry

- Każdy gracz dostaje: 15 monet, 2 drewna, 1 cegłę i 3 menedżerów.
- Pierwszy gracz zostaje wylosowany. Potem, **w odwrotnej kolejności**, każdy
  bierze za darmo 1 działkę zwykłą, las albo gliniankę (ale nie działkę
  licytowaną).
- Odkryj 4 Zlecenia i 2 pierwsze Wiadomości (podgląd).

## 11. Koniec gry i punktacja

Po 8 rundach:

**Wynik = gotówka + wartość budynków + 2 za każdą pustą działkę + prestiż
+ 1 za każde 2 materiały (w dół) − 12 za każdą niespłaconą pożyczkę
− 3 za każde niezrealizowane Zlecenie**

Remis: wygrywa gracz z większą gotówką.

## 12. Do sprawdzenia w testach

- Czy Dom (zwrot w ok. 5 rund) nie jest zbyt słaby w porównaniu z produkcją
  materiałów na sprzedaż.
- Czy 8 rund to nie za mało, żeby postawić Biurowiec.
- Czy kara za hałas nie jest zbyt złośliwa w grze rodzinnej.
- Czy 4 Zlecenia na stole przy 4 graczach wystarczą.
