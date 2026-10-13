import { useEffect, useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '../engine/data.ts';
import { useConnection, type Connection } from './net.ts';
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

export function App() {
  const conn = useConnection();
  const { error, clearError } = conn;

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 4000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  return (
    <>
      {!conn.online && <div className="offline">Łączenie z serwerem…</div>}
      {error && (
        <div className="toast" onClick={clearError}>
          {error}
        </div>
      )}
      {!conn.view ? <Home conn={conn} /> : conn.view.phase === 'lobby' ? <Lobby conn={conn} /> : <Game conn={conn} />}
    </>
  );
}

function Home({ conn }: { conn: Connection }) {
  const [name, setName] = useState(storedName);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('pokoj') ?? '');
  const [rules, setRules] = useState(false);

  const remember = () => {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      // bez zapamiętywania imienia
    }
  };

  return (
    <div className="home">
      <h1>🏙️ Miasteczko S.A.</h1>
      <p className="subtitle">Rodzinna gra o budowaniu miasteczka</p>
      <label>
        Twoje imię
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="np. Ania" />
      </label>
      <button
        className="primary"
        disabled={!name.trim()}
        onClick={() => {
          remember();
          conn.send({ t: 'create', name });
        }}
      >
        Załóż nową grę
      </button>
      <div className="divider">albo dołącz do gry</div>
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
      <button
        disabled={!name.trim() || code.length !== 4}
        onClick={() => {
          remember();
          conn.send({ t: 'join', code, name });
        }}
      >
        Dołącz
      </button>
      <button className="link" onClick={() => setRules(true)}>
        📖 Zasady gry
      </button>
      {rules && <RulesModal onClose={() => setRules(false)} />}
    </div>
  );
}

function Lobby({ conn }: { conn: Connection }) {
  const view = conn.view!;
  const isHost = conn.host === view.me;
  const n = view.players.length;
  const urls = conn.joinUrls.length ? conn.joinUrls : [location.origin];

  return (
    <div className="home lobby">
      <h1>🏙️ Miasteczko S.A.</h1>
      <div className="room-code">
        <span>Kod pokoju</span>
        <strong>{conn.code}</strong>
      </div>
      <p className="hint">
        Na innych urządzeniach otwórz{' '}
        {urls.map((u) => (
          <code key={u}>{u}</code>
        ))}{' '}
        i wpisz kod.
      </p>
      <h2>
        Gracze ({n}/{MAX_PLAYERS})
      </h2>
      <ul className="lobby-players">
        {view.players.map((p) => (
          <li key={p.id}>
            <span className="dot" style={{ background: p.color }} />
            {p.name}
            {p.id === conn.host && <em> (gospodarz)</em>}
            {p.id === view.me && <em> (ty)</em>}
            {!p.connected && <em> — rozłączony</em>}
          </li>
        ))}
      </ul>
      {isHost ? (
        <button className="primary" disabled={n < MIN_PLAYERS} onClick={() => conn.send({ t: 'start' })}>
          {n < MIN_PLAYERS ? `Czekamy na graczy (min. ${MIN_PLAYERS})` : 'Rozpocznij grę'}
        </button>
      ) : (
        <p>Czekamy, aż gospodarz rozpocznie grę…</p>
      )}
      <button className="link" onClick={() => conn.send({ t: 'leave' })}>
        Opuść pokój
      </button>
    </div>
  );
}
