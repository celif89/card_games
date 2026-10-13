import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { MAX_PLAYERS, MIN_PLAYERS } from '../engine/data.ts';
import type { GameView } from '../engine/types.ts';
import { inviteLink, net, useNet, type Status } from './net.ts';
import { Game } from './Game.tsx';
import { RulesModal } from './Rules.tsx';

const NAME_KEY = 'miasteczko-name';

function storedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

const STATUS_TEXT: Partial<Record<Status, string>> = {
  connecting: 'Łączenie…',
  offline: 'Brak połączenia z internetem — próbuję ponownie…',
  hostLost: 'Gospodarz gry jest niedostępny — czekam, aż wróci…',
};

export function App() {
  const state = useNet();
  const { error, view, status } = state;

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => net.setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const banner = STATUS_TEXT[status];
  return (
    <>
      {banner && <div className="offline">{banner}</div>}
      {error && (
        <div className="toast" onClick={() => net.setError(null)}>
          {error}
        </div>
      )}
      {!view ? <Home busy={status === 'connecting'} /> : view.phase === 'lobby' ? <Lobby view={view} code={state.code} host={state.host} /> : <Game view={view} />}
    </>
  );
}

function Home({ busy }: { busy: boolean }) {
  const [name, setName] = useState(storedName);
  const [code, setCode] = useState(() => (new URLSearchParams(location.search).get('pokoj') ?? '').toUpperCase());
  const [rules, setRules] = useState(false);
  const invited = code.length === 4;

  const remember = () => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      // bez zapamiętywania imienia
    }
  };

  const join = (
    <button
      className={invited ? 'primary' : ''}
      disabled={busy || !name.trim() || code.length !== 4}
      onClick={() => {
        remember();
        net.joinGame(code, name);
      }}
    >
      Dołącz do gry {invited ? code : ''}
    </button>
  );

  return (
    <div className="home">
      <h1>🏙️ Miasteczko S.A.</h1>
      <p className="subtitle">Rodzinna gra o budowaniu miasteczka</p>
      <label>
        Twoje imię
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="np. Ania" />
      </label>
      {invited ? (
        join
      ) : (
        <button
          className="primary"
          disabled={busy || !name.trim()}
          onClick={() => {
            remember();
            net.createGame(name);
          }}
        >
          Załóż nową grę
        </button>
      )}
      <div className="divider">{invited ? 'albo' : 'albo dołącz do gry'}</div>
      {invited ? (
        <button
          disabled={busy || !name.trim()}
          onClick={() => {
            remember();
            history.replaceState(null, '', location.pathname);
            net.createGame(name);
          }}
        >
          Załóż własną, nową grę
        </button>
      ) : (
        <>
          <label>
            Kod pokoju
            <input
              value={code}
              maxLength={4}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="np. KRAB"
              className="code-input"
            />
          </label>
          {join}
        </>
      )}
      <button className="link" onClick={() => setRules(true)}>
        📖 Zasady gry
      </button>
      {rules && <RulesModal onClose={() => setRules(false)} />}
    </div>
  );
}

function QrCode({ text }: { text: string }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  }, [text]);
  return <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Lobby({ view, code, host }: { view: GameView; code: string; host: string }) {
  const isHost = host === view.me;
  const n = view.players.length;
  const link = inviteLink(code);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Miasteczko S.A.', text: `Dołącz do gry w Miasteczko S.A. (kod ${code})`, url: link });
        return;
      } catch {
        // anulowano udostępnianie — skopiujemy link
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      net.setError('Nie udało się skopiować — przepisz kod pokoju.');
    }
  };

  return (
    <div className="home lobby">
      <h1>🏙️ Miasteczko S.A.</h1>
      <div className="room-code">
        <span>Kod pokoju</span>
        <strong>{code}</strong>
      </div>
      {isHost && (
        <>
          <p className="hint center">Pozostali gracze skanują kod QR telefonem albo otwierają link:</p>
          <QrCode text={link} />
          <button onClick={share}>{copied ? '✅ Skopiowano link' : '📤 Wyślij link do gry'}</button>
        </>
      )}
      <h2>
        Gracze ({n}/{MAX_PLAYERS})
      </h2>
      <ul className="lobby-players">
        {view.players.map((p) => (
          <li key={p.id}>
            <span className="dot" style={{ background: p.color }} />
            {p.name}
            {p.id === host && <em> (gospodarz)</em>}
            {p.id === view.me && <em> (ty)</em>}
            {!p.connected && <em> — rozłączony</em>}
          </li>
        ))}
      </ul>
      {isHost ? (
        <>
          <button className="primary" disabled={n < MIN_PLAYERS} onClick={() => net.send({ t: 'start' })}>
            {n < MIN_PLAYERS ? `Czekamy na graczy (min. ${MIN_PLAYERS})` : 'Rozpocznij grę'}
          </button>
          <p className="hint">Jesteś gospodarzem: gra działa w twojej przeglądarce. Nie zamykaj tej karty do końca gry.</p>
        </>
      ) : (
        <p>Czekamy, aż gospodarz rozpocznie grę…</p>
      )}
      <button className="link" onClick={() => net.leave()}>
        {isHost ? 'Zamknij pokój' : 'Opuść pokój'}
      </button>
    </div>
  );
}
