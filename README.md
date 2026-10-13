# Miasteczko S.A.

Rodzinna gra strategiczno-ekonomiczna (2–4 graczy, od 10 lat, ok. 45–60 min),
w której prawie nic nie zależy od losu. Najpierw wersja przeglądarkowa
(każdy gracz na swoim urządzeniu), docelowo także planszówka.

- [Zasady gry (wersja robocza 0.1)](docs/ZASADY.md)

## Jak zagrać w domu

Potrzebny jest komputer z zainstalowanym [Node.js](https://nodejs.org) (wersja 22 lub nowsza),
który będzie serwerem gry. Telefony i inne komputery łączą się z nim przez domowe Wi-Fi.

```bash
npm install     # tylko za pierwszym razem
npm start       # buduje grę i uruchamia serwer na porcie 3000
```

Serwer wypisze adresy, np. `http://192.168.1.23:3000`. Otwórz ten adres
na każdym urządzeniu w tej samej sieci Wi-Fi. Jedna osoba zakłada grę,
a pozostali wpisują 4-literowy kod pokoju.

Po odświeżeniu strony albo wybudzeniu telefonu gra sama wraca do pokoju.

## Dla programisty

```bash
npm run dev        # serwer + klient z automatycznym przeładowaniem (http://localhost:5173)
npm test           # testy silnika, w tym symulacja pełnych gier rozgrywanych przez boty
npm run typecheck  # sprawdzenie typów TypeScript
```

Struktura:

- `src/engine/` — zasady gry jako czyste funkcje (bez interfejsu). Tu zmienia się liczby i balans.
  - `data.ts` — wszystkie stałe: mapa, budynki, zlecenia, wiadomości, pola akcji.
  - `engine.ts` — przebieg gry i akcje graczy.
  - `rules.ts` — obliczenia: czynsz, ceny, opcje budowy, punktacja.
  - `bot.ts` — prosty bot (na razie do testów).
- `src/server/` — serwer Node.js: pokoje, WebSocket, ukrywanie ofert w licytacji.
- `src/client/` — interfejs w React.
