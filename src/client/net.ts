// Połączenie z serwerem: automatyczne wznawianie po utracie zasięgu lub odświeżeniu strony.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameView } from '../engine/types.ts';
import type { ClientMessage, ServerMessage } from '../server/protocol.ts';

const SESSION_KEY = 'miasteczko-session';

interface Session {
  code: string;
  playerId: string;
  token: string;
}

function loadSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Brak dostępu do pamięci przeglądarki — po odświeżeniu trzeba dołączyć ponownie.
  }
}

export interface Connection {
  online: boolean;
  view: GameView | null;
  host: string;
  code: string;
  joinUrls: string[];
  error: string | null;
  clearError: () => void;
  send: (msg: ClientMessage) => void;
}

export function useConnection(): Connection {
  const wsRef = useRef<WebSocket | null>(null);
  const [online, setOnline] = useState(false);
  const [view, setView] = useState<GameView | null>(null);
  const [meta, setMeta] = useState({ host: '', code: '', joinUrls: [] as string[] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        setOnline(true);
        const s = loadSession();
        if (s) ws.send(JSON.stringify({ t: 'resume', ...s } satisfies ClientMessage));
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as ServerMessage;
        if (msg.t === 'session') saveSession({ code: msg.code, playerId: msg.playerId, token: msg.token });
        else if (msg.t === 'state') {
          setView(msg.view);
          setMeta({ host: msg.host, code: msg.code, joinUrls: msg.joinUrls });
        } else if (msg.t === 'error') setError(msg.message);
        else if (msg.t === 'left') {
          saveSession(null);
          setView(null);
        }
      };
      ws.onclose = () => {
        setOnline(false);
        if (closed) return;
        timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 8000));
      };
    };
    connect();

    // Telefon wybudzony z uśpienia — od razu spróbuj się połączyć.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState === WebSocket.CLOSED) {
        clearTimeout(timer);
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      closed = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    else setError('Brak połączenia z serwerem — spróbuj za chwilę.');
  }, []);

  return { online, view, ...meta, error, clearError: () => setError(null), send };
}
