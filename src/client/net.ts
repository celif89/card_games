// Połączenia między graczami bez własnego serwera (WebRTC przez PeerJS).
// Gospodarz prowadzi pokój w swojej przeglądarce, pozostali łączą się z nim bezpośrednio.
import Peer, { type DataConnection, type PeerOptions } from 'peerjs';
import { useSyncExternalStore } from 'react';
import type { GameView } from '../engine/types.ts';
import type { ClientMessage, ServerMessage } from '../net/protocol.ts';
import { Room, type Client, type RoomSnapshot } from '../net/room.ts';

const SESSION_KEY = 'miasteczko-session';
const roomKey = (code: string) => `miasteczko-room-${code}`;
const peerId = (code: string) => `miasteczko-sa-${code.toLowerCase()}`;
const CODE_LETTERS = 'BCDFGHJKLMNPRSTWZ';

// Domyślnie publiczny serwer PeerJS; do testów można wskazać własny (VITE_PEER_HOST=localhost:9000).
const peerOptions: PeerOptions = (() => {
  const custom = import.meta.env.VITE_PEER_HOST as string | undefined;
  if (!custom) return {};
  const [host, port] = custom.split(':');
  return { host, port: Number(port), path: '/', secure: false };
})();

interface Session {
  code: string;
  playerId: string;
  token: string;
  isHost: boolean;
}

export type Status = 'idle' | 'connecting' | 'online' | 'hostLost' | 'offline';

export interface NetState {
  status: Status;
  view: GameView | null;
  host: string;
  code: string;
  error: string | null;
}

const storage = {
  get<T>(key: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Brak pamięci przeglądarki — po odświeżeniu trzeba dołączyć ponownie.
    }
  },
};

const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => CODE_LETTERS[b % CODE_LETTERS.length]).join('');

class Net {
  state: NetState = { status: 'idle', view: null, host: '', code: '', error: null };
  private listeners = new Set<() => void>();
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private room: Room | null = null;
  private localClient: Client | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private retries = 0;
  private pendingJoin: string | null = null;

  constructor() {
    const session = storage.get<Session>(SESSION_KEY);
    if (session?.isHost) {
      const snapshot = storage.get<RoomSnapshot>(roomKey(session.code));
      if (snapshot) this.startHost(session.code, Room.restore(snapshot, (s) => storage.set(roomKey(session.code), s)), session);
      else storage.set(SESSION_KEY, null);
    } else if (session) {
      this.startGuest(session.code);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.wake();
    });
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private update(patch: Partial<NetState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  setError(message: string | null) {
    this.update({ error: message });
  }

  // --- Gospodarz ---

  createGame(name: string) {
    this.reset();
    const code = randomCode();
    const { room, hostToken } = Room.create(name, (s) => storage.set(roomKey(code), s));
    this.startHost(code, room, { code, playerId: room.host, token: hostToken, isHost: true }, true);
  }

  private startHost(code: string, room: Room, session: Session, fresh = false) {
    this.room = room;
    storage.set(SESSION_KEY, session);
    this.update({ status: 'connecting', code });

    this.localClient = { send: (msg) => this.receive(msg), close: () => {} };
    room.handle(this.localClient, { t: 'resume', playerId: session.playerId, token: session.token });

    const peer = new Peer(peerId(code), peerOptions);
    this.peer = peer;
    peer.on('open', () => {
      this.retries = 0;
      this.update({ status: 'online' });
    });
    peer.on('connection', (conn) => {
      const client: Client = { send: (msg) => conn.open && conn.send(msg), close: () => conn.close() };
      conn.on('data', (data) => room.handle(client, data as ClientMessage));
      conn.on('close', () => room.disconnect(client));
      conn.on('error', () => room.disconnect(client));
    });
    peer.on('disconnected', () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && fresh && room.snapshot.state.phase === 'lobby' && room.snapshot.state.players.length === 1) {
        // Kod zajęty przez inną grę — losujemy nowy.
        const name = room.snapshot.state.players[0].name;
        storage.set(roomKey(code), null);
        this.createGame(name);
        return;
      }
      if (['unavailable-id', 'network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
        // Np. po odświeżeniu strony serwer jeszcze pamięta stare połączenie — próbujemy ponownie.
        this.update({ status: 'offline' });
        peer.destroy();
        this.retryTimer = setTimeout(() => this.startHost(code, room, session), this.backoff());
      }
    });
  }

  // --- Gość ---

  joinGame(code: string, name: string) {
    this.reset();
    this.pendingJoin = name;
    this.startGuest(code.trim().toUpperCase());
  }

  private startGuest(code: string) {
    this.update({ status: 'connecting', code });
    const peer = new Peer(peerOptions);
    this.peer = peer;
    peer.on('open', () => this.connectToHost(code));
    peer.on('disconnected', () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        if (this.pendingJoin !== null) {
          this.reset();
          this.update({ error: 'Nie ma gry o takim kodzie. Sprawdź kod albo poproś gospodarza o nowy link.' });
          return;
        }
        this.update({ status: 'hostLost' });
        this.retryTimer = setTimeout(() => this.connectToHost(code), this.backoff());
        return;
      }
      if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
        this.update({ status: 'offline' });
        peer.destroy();
        this.retryTimer = setTimeout(() => this.startGuest(code), this.backoff());
      }
    });
  }

  private connectToHost(code: string) {
    if (!this.peer || this.peer.destroyed) return;
    this.conn?.close();
    const conn = this.peer.connect(peerId(code), { reliable: true });
    this.conn = conn;
    conn.on('open', () => {
      this.retries = 0;
      this.update({ status: 'online' });
      const session = storage.get<Session>(SESSION_KEY);
      if (this.pendingJoin !== null) conn.send({ t: 'join', name: this.pendingJoin } satisfies ClientMessage);
      else if (session) conn.send({ t: 'resume', playerId: session.playerId, token: session.token } satisfies ClientMessage);
    });
    conn.on('data', (data) => this.receive(data as ServerMessage));
    conn.on('close', () => {
      if (this.conn !== conn || !this.peer || this.peer.destroyed) return;
      this.update({ status: 'hostLost' });
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this.connectToHost(code), this.backoff());
    });
  }

  // --- Wspólne ---

  send(msg: ClientMessage) {
    if (this.room && this.localClient) {
      const client = this.localClient;
      queueMicrotask(() => this.room?.handle(client, msg));
    } else if (this.conn?.open) {
      this.conn.send(msg);
    } else {
      this.update({ error: 'Brak połączenia z gospodarzem gry — spróbuj za chwilę.' });
    }
  }

  // Wyjście z pokoju. Gospodarz zamyka pokój dla wszystkich.
  leave() {
    if (this.room) {
      const { room, peer } = this;
      storage.set(roomKey(this.state.code), null);
      storage.set(SESSION_KEY, null);
      this.peer = null;
      this.reset();
      room.closeAll();
      // Chwila na dostarczenie wiadomości do gości, zanim zamkniemy połączenia.
      setTimeout(() => peer?.destroy(), 500);
    } else if (this.conn?.open) {
      this.send({ t: 'leave' });
    } else {
      storage.set(SESSION_KEY, null);
      this.reset();
    }
  }

  private receive(msg: ServerMessage) {
    switch (msg.t) {
      case 'session':
        this.pendingJoin = null;
        // Kod z linku zaproszenia nie jest już potrzebny w adresie.
        if (location.search) history.replaceState(null, '', location.pathname);
        if (!this.room) storage.set(SESSION_KEY, { code: this.state.code, playerId: msg.playerId, token: msg.token, isHost: false });
        return;
      case 'state':
        this.update({ view: msg.view, host: msg.host });
        return;
      case 'error':
        if (this.pendingJoin !== null) this.reset();
        this.update({ error: msg.message });
        return;
      case 'left':
        storage.set(SESSION_KEY, null);
        this.reset();
        return;
    }
  }

  private backoff() {
    return Math.min(1000 * 2 ** this.retries++, 8000);
  }

  private wake() {
    if (this.room || !this.peer) return;
    if (this.peer.destroyed || this.peer.disconnected || !this.conn?.open) {
      clearTimeout(this.retryTimer);
      this.retries = 0;
      const code = this.state.code;
      this.peer.destroy();
      this.peer = null;
      this.startGuest(code);
    }
  }

  private reset() {
    clearTimeout(this.retryTimer);
    this.retries = 0;
    this.pendingJoin = null;
    const peer = this.peer;
    this.peer = null;
    this.conn = null;
    this.room = null;
    this.localClient = null;
    peer?.destroy();
    this.update({ status: 'idle', view: null, host: '', code: '' });
  }
}

const net = new Net();

export function useNet(): NetState {
  return useSyncExternalStore(net.subscribe, () => net.state);
}

export { net };

export function inviteLink(code: string): string {
  return `${location.origin}${location.pathname}?pokoj=${code}`;
}
