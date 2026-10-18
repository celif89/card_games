# Miasteczko S.A. — zasady (wersja robocza 0.1)

> Wszystkie liczby są punktem startowym do testów. Wersja przeglądarkowa
> posłuży do szybkiego sprawdzania balansu.

## 1. Idea

Gracze prowadzą firmy deweloperskie w rozwijającym się miasteczku. Kupują
działki, produkują materiały budowlane, stawiają budynki, które przynoszą
czynsz, i realizują zlecenia miasta. Po ostatniej rundzie wygrywa gracz
z największym majątkiem.

**Długość gry** (1 runda = 1 kwartał) — domyślnie zależy od liczby graczy,
gospodarz może ją zmienić w poczekalni (8, 10, 12 lub 14 rund):

| Graczy | Rund |
|--------|------|
| 2      | 14   |
| 3      | 12   |
| 4      | 10   |

- 2–4 graczy, od 10 lat, 45–60 minut.
- Losowa jest tylko kolejność kart Wiadomości i Zleceń. Zawsze widać kolejne
  2 Wiadomości i 4 Zlecenia, więc da się je zaplanować.
- Każdy gra na swoim urządzeniu: ukryte oferty w licytacji i własne zasoby
  widzi tylko właściciel.

## 2. Plansza — mapa miasteczka 6×6

```
     A   B   C   D   E   F
1    L   L*  Z   Z   G   G
2    L   Z   Z*  Z   Z   G
3    Z   Z*  C*  C*  Z   P*
4    Z   Z   C*  C*  Z*  P*
5    G*  Z   Z   Z*  Z   P*
6    G   Z   Z   Z   L*  L
```

| Symbol | Teren       | Liczba | Cena zakupu |
|--------|-------------|--------|-------------|
| Z      | zwykła      | 19     | 3           |
| L      | las         | 5      | 4           |
| G      | glinianka   | 5      | 4           |
| P      | przemysłowa | 3      | 5           |
| C      | centrum     | 4      | tylko licytacja |

`*` — działka licytowana (patrz §5). W każdej rundzie licytuje się jedną działkę,
w tej kolejności (w krótszej grze tylko tyle pierwszych, ile jest rund; pozostałe
są zwykłymi działkami):
1. C3 · 2. F4 · 3. D3 · 4. A5 · 5. C4 · 6. B1 · 7. D4 · 8. F5 · 9. E4 · 10. F3 · 11. B3 · 12. E6 · 13. C2 · 14. D5

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

**Modernizacja** (akcja Buduj, raz na budynek): budynek produkcyjny daje
**+1 sztukę** materiału co rundę i jest wart **+3** na koniec gry.

| Modernizacja  | Koszt                         | Po modernizacji |
|---------------|-------------------------------|-----------------|
| Tartak II     | 3 monety + 2 cegły            | +3 drewna       |
| Cegielnia II  | 3 monety + 2 drewna           | +3 cegły        |
| Huta II       | 5 monet + 2 cegły + 1 drewno  | +2 stali        |

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
| Boisko      | zwykła           | 2 drewna                       | 4 monety + 5 PP |
| Targowisko  | zwykła           | 3 drewna + 1 cegła             | 8 monet + 10 PP |
| Remiza      | zwykła           | 2 drewna + 2 cegły             | 9 monet + 10 PP |
| Przedszkole | zwykła           | 3 drewna + 2 cegły             | 10 monet + 13 PP |
| Biblioteka  | centrum          | 1 drewno + 3 cegły + 1 stal    | 13 monet + 15 PP |
| Szkoła      | zwykła           | 2 drewna + 3 cegły + 1 stal    | 14 monet + 18 PP |
| Przychodnia | zwykła / centrum | 1 drewno + 2 cegły + 2 stal    | 14 monet + 17 PP |
| Kościół     | zwykła           | 1 drewno + 5 cegieł            | 14 monet + 17 PP |
| Ratusz-filia| centrum          | 2 drewna + 2 cegły + 2 stal    | 16 monet + 19 PP |
| Basen       | zwykła           | 4 cegły + 2 stal               | 17 monet + 20 PP |
| Dworzec     | zwykła           | 3 cegły + 3 stal               | 18 monet + 22 PP |
| Muzeum      | centrum          | 4 cegły + 3 stal               | 20 monet + 25 PP |

### Wielkie inwestycje

Cztery wielkie inwestycje są widoczne od początku gry. **Nie trzeba ich brać
w Ratuszu** — kto zbierze materiały, buduje je akcją Buduj na swojej działce.
Każdą może zbudować tylko jeden gracz (kto pierwszy, ten lepszy). Działają jak
budynek publiczny (+1 czynszu sąsiednim mieszkaniom).

| Inwestycja     | Teren            | Koszt                            | Nagroda           |
|----------------|------------------|----------------------------------|-------------------|
| Stadion        | zwykła           | 6 drewna + 6 cegieł + 2 stal     | 27 monet + 27 PP |
| Szpital        | zwykła / centrum | 2 drewna + 6 cegieł + 4 stal     | 27 monet + 27 PP |
| Uniwersytet    | zwykła           | 4 drewna + 8 cegieł + 2 stal     | 28 monet + 28 PP |
| Ratusz miejski | centrum          | 4 drewna + 6 cegieł + 4 stal     | 30 monet + 30 PP |

## 8. Karty Wiadomości (15 kart, w grze jedna na rundę)

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
| Remont drogi | wszystkie działki kosztują o 1 więcej |
| Rekordowe zamówienia | ceny wszystkich materiałów +1 |
| Nadwyżka cegły | cena cegły −2 |
| Festyn miejski | każdy budynek publiczny daje właścicielowi 2 monety |
| Spokojny kwartał | nic się nie dzieje |

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

Po ostatniej rundzie:

**Wynik = gotówka + wartość budynków + 2 za każdą pustą działkę + prestiż
+ 1 za każde 2 materiały (w dół) + premia za osiedle − 12 za każdą
niespłaconą pożyczkę − 3 za każde niezrealizowane Zlecenie**

**Premia za osiedle:** +1 pkt za każdą działkę w twojej największej grupie
działek stykających się bokami (co najmniej 2 działki). Działka kupiona obok
twojej powiększa osiedle — a działka kupiona przez rywala może je przeciąć.

Remis: wygrywa gracz z większą gotówką.

## 12. Do sprawdzenia w testach

- Czy Dom (zwrot w ok. 5 rund) nie jest zbyt słaby w porównaniu z produkcją
  materiałów na sprzedaż.
- Czy kara za hałas nie jest zbyt złośliwa w grze rodzinnej.
- Nadmiar materiałów: w symulacjach gracze kończą z dużymi zapasami, których nie da się sprzedać.
- Czy 4 Zlecenia na stole przy 4 graczach wystarczą.
