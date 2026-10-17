// Samouczek: karta z podpowiedziami, która prowadzi gracza przez pierwszą grę z botem.
import { useEffect, useState, type ReactNode } from 'react';
import type { GameView } from '../engine/types.ts';
import { net, storage, TUTORIAL_STEP_KEY } from './net.ts';

interface Step {
  title: string;
  body: ReactNode;
  // Element do podświetlenia (selektor CSS).
  target?: string;
  // Krok kończy się sam, gdy warunek jest spełniony. Bez warunku — przycisk „Dalej”.
  done?: (view: GameView) => boolean;
  task?: string;
}

const me = (v: GameView) => v.players.find((p) => p.id === v.me)!;
const myLots = (v: GameView) => v.lots.filter((l) => l.owner === v.me);

const STEPS: Step[] = [
  {
    title: 'Witaj w Miasteczku S.A.!',
    body: (
      <>
        <p>Prowadzisz firmę deweloperską. Przez <b>kilkanaście rund</b> (w samouczku 10) kupujesz działki, produkujesz materiały i stawiasz budynki.</p>
        <p>
          Wygrywa ten, kto na końcu ma największy majątek: <b>gotówka + wartość budynków + prestiż</b>. Grasz z botem Robo-Basią.
        </p>
      </>
    ),
  },
  {
    title: 'Plansza',
    target: '.board',
    body: (
      <>
        <p>
          Kolory to rodzaje terenu. Na <b>zwykłej</b> (jasnozielonej) stawia się domy, w <b>lesie</b> tartak, na <b>gliniance</b> cegielnię, na
          terenie <b>przemysłowym</b> hutę. Żółte <b>centrum</b> jest najcenniejsze.
        </p>
        <p>Działki z młotkiem 🔨 są licytowane — po jednej na rundę.</p>
      </>
    ),
  },
  {
    title: 'Wybierz działkę startową',
    target: '.lot.pickable',
    task: 'Kliknij pulsującą działkę, a potem „Wybierz jako działkę startową”. Na początek polecam zwykłą (jasnozieloną) — postawisz na niej Dom.',
    body: <p>Każdy gracz dostaje na start jedną działkę za darmo.</p>,
    done: (v) => myLots(v).length > 0,
  },
  {
    title: 'Twoje zasoby',
    target: '.topbar-res',
    body: (
      <>
        <p>
          Na górze ekranu zawsze widzisz swoje zasoby: 💰 monety, 🪵 drewno, 🧱 cegłę, 🔩 stal, ⭐ prestiż i 👔 menedżerów (ilu jeszcze możesz
          użyć w tej rundzie).
        </p>
        <p>Na start masz 2 drewna i 1 cegłę — dokładnie tyle, ile kosztuje Dom.</p>
      </>
    ),
  },
  {
    title: 'Wiadomości',
    target: '.news',
    body: (
      <p>
        Każda runda ma swoją wiadomość, np. „cegła drożeje”. Widzisz też <b>dwie kolejne</b> — w tej grze nic nie spada z nieba, więc możesz się
        przygotować.
      </p>
    ),
  },
  {
    title: 'Licytacja',
    target: '.auction',
    task: 'Ustaw ofertę przyciskami − / + i kliknij „Złóż ofertę”. Możesz zaoferować 0.',
    body: (
      <p>
        Na początku rundy licytowana jest jedna działka. Każdy wpisuje ofertę <b>w tajemnicy</b>, potem wszystkie są odkrywane naraz. Wygrywa
        najwyższa. Uwaga: wydane monety przydadzą się później!
      </p>
    ),
    done: (v) => v.phase !== 'auction' && v.round >= 1 && v.phase !== 'setup',
  },
  {
    title: 'Faza akcji i menedżerowie',
    target: '.spaces',
    body: (
      <>
        <p>
          Teraz gracze na zmianę wykonują akcje. Masz <b>3 menedżerów</b> — każdy to jedna akcja. Kropki przy polu pokazują wolne miejsca: kto
          pierwszy zajmie pole, ten blokuje je innym.
        </p>
        <p>Akcje z działkami (kupno, budowa) wykonujesz, klikając działkę na planszy.</p>
      </>
    ),
  },
  {
    title: 'Zbuduj pierwszy budynek',
    target: '.lot[data-mine]',
    task: 'Gdy przyjdzie twoja tura, kliknij swoją działkę (z obwódką w twoim kolorze) i wybierz budynek, np. Dom.',
    body: (
      <p>
        Dom kosztuje 2 🪵 + 1 🧱 i co rundę przynosi 2 💰 czynszu. Tartak i cegielnia produkują materiały — później możesz je{' '}
        <b>zmodernizować</b> (+1 produkcji).
      </p>
    ),
    done: (v) => myLots(v).some((l) => l.building),
  },
  {
    title: 'Brawo, pierwszy budynek!',
    target: '.lot[data-mine]',
    body: (
      <p>
        Liczba w rogu działki (np. <b>+2💰</b>) pokazuje, ile budynek da na koniec rundy. Budynki zostają do końca gry i liczą się do wyniku.
      </p>
    ),
  },
  {
    title: 'Rynek',
    target: '.market',
    body: (
      <>
        <p>Materiały kupujesz i sprzedajesz na rynku (pola „Sprzedaj” i „Kup materiały”, do 4 sztuk naraz).</p>
        <p>
          Każda <b>sprzedana</b> sztuka obniża cenę o 1, każda <b>kupiona</b> podnosi o 1. Jeśli wszyscy sprzedają cegłę — cegła tanieje. Co
          rundę ceny wracają powoli do normy.
        </p>
      </>
    ),
  },
  {
    title: 'Kolejne działki',
    target: '.lot[data-forsale]',
    body: (
      <p>
        Żeby się rozwijać, potrzebujesz więcej działek. Kliknij wolną działkę i „Kup” (zwykła kosztuje 3, las i glinianka 4). Najlepiej buduj
        sąsiadujące budynki — patrz następny krok.
      </p>
    ),
  },
  {
    title: 'Sąsiedztwo ma znaczenie',
    target: '.board',
    body: (
      <ul>
        <li>Dom lub Kamienica obok 🌳 Parku albo budynku publicznego: czynsz <b>+1</b>.</li>
        <li>Mieszkanie w centrum: czynsz <b>+1</b>.</li>
        <li>Mieszkanie obok 🧱 Cegielni albo 🏭 Huty (hałas): czynsz <b>−1</b>.</li>
        <li>
          🏘️ <b>Osiedle</b>: na koniec gry +1 pkt za każdą działkę w twojej największej grupie stykających się działek. Kupuj działki obok
          siebie!
        </li>
      </ul>
    ),
  },
  {
    title: 'Zlecenia miasta',
    target: '.contracts',
    body: (
      <p>
        Miasto zamawia budynki publiczne (szkoła, basen…). Bierzesz zlecenie polem „Ratusz”, a budujesz je akcją Buduj na swojej działce. Za
        realizację dostajesz monety i prestiż. Uwaga: niezrealizowane zlecenie na koniec gry to −3 pkt.
      </p>
    ),
  },
  {
    title: 'Bank i inne pola',
    target: '.spaces',
    body: (
      <ul>
        <li>
          <b>Bank</b>: pożyczka 10 💰. Każda runda kosztuje 1 💰 odsetek, a niespłacona pożyczka na koniec to −12 pkt.
        </li>
        <li>
          <b>Biuro kadr</b>: 4. menedżer od następnej rundy (6 💰).
        </li>
        <li>
          <b>Pierwszy gracz</b>: w następnej rundzie ruszasz się pierwszy i zajmujesz najlepsze pola.
        </li>
      </ul>
    ),
  },
  {
    title: 'Koniec rundy',
    target: '.spaces',
    task: 'Wykorzystaj pozostałych menedżerów (np. kup działkę, sprzedaj materiały) albo kliknij „Pasuję do końca rundy”.',
    body: <p>Gdy wszyscy wykorzystają menedżerów, budynki produkują materiały i płacą czynsz, a zaczyna się następna runda.</p>,
    done: (v) => v.round >= 2,
  },
  {
    title: 'Dochód przyszedł!',
    target: '.log',
    body: (
      <p>
        W dzienniku widzisz, co kto zarobił i zrobił — każdy wpis ma pasek w kolorze gracza. Ostatnie ruchy są też na górze ekranu, a działka,
        na której ktoś właśnie coś zrobił, błyska na planszy.
      </p>
    ),
  },
  {
    title: 'Handel',
    target: '.trades-panel',
    body: (
      <p>
        W każdej chwili fazy akcji możesz zaproponować wymianę innemu graczowi: monety i materiały na dowolnych warunkach. Nie zużywa to
        menedżera. Robo-Basia przyjmie tylko korzystną dla niej ofertę 😉
      </p>
    ),
  },
  {
    title: 'Dalej już sam!',
    body: (
      <>
        <p>Znasz już wszystkie zasady. Dokończ grę z Robo-Basią — po ostatniej rundzie zobaczysz tabelę wyników.</p>
        <p>
          Pełne zasady są zawsze pod <b>📖 Zasady</b> na górze ekranu. Powodzenia!
        </p>
      </>
    ),
  },
];

function loadStep(): number {
  return storage.get<number>(TUTORIAL_STEP_KEY) ?? 0;
}

export function Coach({ view }: { view: GameView }) {
  const [step, setStep] = useState(loadStep);
  const [collapsed, setCollapsed] = useState(false);
  const current = STEPS[step];

  const go = (n: number) => {
    storage.set(TUTORIAL_STEP_KEY, n);
    setStep(n);
    setCollapsed(false);
  };

  // Krok z warunkiem kończy się sam.
  useEffect(() => {
    if (current?.done?.(view)) go(step + 1);
  }, [view, step]);

  // Podświetlenie wskazanego elementu.
  useEffect(() => {
    if (!current?.target || collapsed) return;
    const els = [...document.querySelectorAll(current.target)];
    els.forEach((el) => el.classList.add('coach-target'));
    return () => els.forEach((el) => el.classList.remove('coach-target'));
  }, [step, collapsed, view, current?.target]);

  // Przewiń do podświetlonego elementu tylko przy zmianie kroku (nie przy każdym ruchu bota).
  useEffect(() => {
    if (!current?.target || collapsed) return;
    document.querySelector(current.target)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [step, collapsed]);

  if (!current || view.phase === 'gameOver') return null;
  if (collapsed) {
    return (
      <button className="coach-pill" onClick={() => setCollapsed(false)}>
        🎓 Samouczek ({step + 1}/{STEPS.length})
      </button>
    );
  }

  const waiting = !!current.done;
  return (
    <aside className="coach" role="dialog" aria-label="Samouczek">
      <div className="coach-head">
        <small>
          🎓 Samouczek · {step + 1}/{STEPS.length}
        </small>
        <button className="link" onClick={() => setCollapsed(true)} aria-label="Zwiń samouczek">
          zwiń
        </button>
      </div>
      <h4>{current.title}</h4>
      {current.body}
      {current.task && <p className="coach-task">👉 {current.task}</p>}
      <div className="row coach-buttons">
        {step > 0 && <button onClick={() => go(step - 1)}>← Wstecz</button>}
        {waiting ? (
          <button className="link" onClick={() => go(step + 1)}>
            Pomiń ten krok
          </button>
        ) : step < STEPS.length - 1 ? (
          <button className="primary" onClick={() => go(step + 1)}>
            Dalej →
          </button>
        ) : (
          <button className="primary" onClick={() => go(STEPS.length)}>
            Zamknij samouczek
          </button>
        )}
      </div>
      {step === 0 && (
        <button className="link" onClick={() => confirm('Zakończyć samouczek i wrócić do ekranu startowego?') && net.leave()}>
          Wyjdź z samouczka
        </button>
      )}
    </aside>
  );
}
