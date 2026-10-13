# Miasteczko S.A.

Rodzinna gra strategiczno-ekonomiczna (2–4 graczy, od 10 lat, ok. 45–60 min),
w której prawie nic nie zależy od losu. Najpierw wersja przeglądarkowa
(każdy gracz na swoim urządzeniu), docelowo także planszówka.

**Zagraj:** https://celif89.github.io/card_games/

- [Zasady gry (wersja robocza 0.1)](docs/ZASADY.md)

## Jak zagrać

**Pierwszy raz?** Na ekranie startowym kliknij **🎓 Samouczek** — zagrasz z botem, a karta z podpowiedziami
przeprowadzi cię przez pierwszą rundę krok po kroku.

1. Jedna osoba (gospodarz) otwiera grę i klika „Załóż nową grę”.
2. Pozostali skanują telefonem kod QR z ekranu gospodarza albo otwierają wysłany link.
3. Gospodarz klika „Rozpocznij grę”.

Chcesz zagrać sam albo w mniejszym gronie? W poczekalni kliknij **🤖 Dodaj bota** (do 4 graczy łącznie).
Boty grają w przeglądarce gospodarza, więc taka gra działa nawet bez internetu.

Nic nie trzeba instalować. Gra działa w przeglądarce gospodarza, a pozostali łączą się z nim
bezpośrednio (WebRTC), więc **gospodarz nie może zamknąć karty z grą** do końca rozgrywki.
Odświeżenie strony, także u gospodarza, nie przerywa gry. Potrzebny jest internet.

## Dla programisty

```bash
npm install
npm run dev        # gra z automatycznym przeładowaniem (http://localhost:5173)
npm test           # testy silnika i pokoju, w tym symulacja pełnych gier rozgrywanych przez boty
npm run typecheck  # sprawdzenie typów TypeScript
npm run build      # wersja do publikacji w katalogu dist/
```

Każdy push na gałąź `main` (albo `claude/elegant-planck-3t9lrh`) publikuje grę
na GitHub Pages (`.github/workflows/pages.yml`).

Struktura:

- `src/engine/` — zasady gry jako czyste funkcje (bez interfejsu). Tu zmienia się liczby i balans.
  - `data.ts` — wszystkie stałe: mapa, budynki, zlecenia, wiadomości, pola akcji.
  - `engine.ts` — przebieg gry i akcje graczy.
  - `rules.ts` — obliczenia: czynsz, ceny, opcje budowy, punktacja.
  - `bot.ts` — boty: strategiczny (`botAction`) i losowy (`randomAction`, do testów odporności).
- `src/net/` — pokój gry prowadzony przez gospodarza: gracze, tokeny powrotu, ukrywanie ofert w licytacji.
- `src/client/` — interfejs w React oraz połączenia PeerJS (`net.ts`).

Do łączenia graczy służy darmowy publiczny serwer PeerJS (tylko do zestawienia połączenia).
Na potrzeby testów można wskazać własny: `VITE_PEER_HOST=127.0.0.1:9000 npm run build`.
