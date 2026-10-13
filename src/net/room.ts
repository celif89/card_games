// Pokój gry prowadzony przez gospodarza (w jego przeglądarce). Niezależny od sposobu przesyłania wiadomości.
import { GameError, addPlayer, applyAction, createGame, removePlayer, setConnected, startGame, viewFor } from '../engine/engine.ts';
import { botAction, botTradeResponse } from '../engine/bot.ts';
import { MAX_PLAYERS } from '../engine/data.ts';
import type { Action, GameState } from '../engine/types.ts';
import type { ClientMessage, ServerMessage } from './protocol.ts';

export interface Client {
  send(msg: ServerMessage): void;
  close(): void;
}

export interface RoomSnapshot {
  state: GameState;
  tokens: Record<string, string>;
  host: string;
}

const newId = () => crypto.randomUUID();

const BOT_NAMES = ['Robo-Basia', 'Robo-Zenek', 'Robo-Krysia', 'Robo-Mietek'];

// Jak długo bot „myśli” przed ruchem — żeby ludzie widzieli, co się dzieje.
const BOT_DELAY_MS = { action: 900, bid: 400, trade: 600 };

export type Scheduler = (fn: () => void, ms: number) => void;

export class Room {
  private state: GameState;
  private tokens: Record<string, string>;
  readonly host: string;
  private clients = new Map<Client, string>();
  private botPending = false;

  private constructor(
    snapshot: RoomSnapshot,
    private onChange: (s: RoomSnapshot) => void,
    private schedule: Scheduler,
  ) {
    this.state = snapshot.state;
    this.tokens = snapshot.tokens;
    this.host = snapshot.host;
    // Po odtworzeniu z zapisu nikt nie jest jeszcze połączony.
    for (const p of this.state.players) this.state = setConnected(this.state, p.id, false);
  }

  // Nowy pokój: gospodarz od razu jest pierwszym graczem.
  static create(hostName: string, onChange: (s: RoomSnapshot) => void, schedule: Scheduler = (fn, ms) => setTimeout(fn, ms)): { room: Room; hostToken: string } {
    const host = newId();
    const token = newId();
    const room = new Room({ state: addPlayer(createGame(), host, hostName), tokens: { [host]: token }, host }, onChange, schedule);
    room.save();
    return { room, hostToken: token };
  }

  static restore(snapshot: RoomSnapshot, onChange: (s: RoomSnapshot) => void, schedule: Scheduler = (fn, ms) => setTimeout(fn, ms)): Room {
    return new Room(snapshot, onChange, schedule);
  }

  get snapshot(): RoomSnapshot {
    return { state: this.state, tokens: this.tokens, host: this.host };
  }

  handle(client: Client, msg: ClientMessage) {
    try {
      this.dispatch(client, msg);
    } catch (err) {
      if (!(err instanceof GameError)) console.error(err);
      client.send({ t: 'error', message: err instanceof GameError ? err.message : 'Coś poszło nie tak.' });
    }
  }

  disconnect(client: Client) {
    const playerId = this.clients.get(client);
    if (!playerId) return;
    this.clients.delete(client);
    if (![...this.clients.values()].includes(playerId)) {
      this.state = setConnected(this.state, playerId, false);
      this.broadcast();
    }
  }

  // Gospodarz zamyka pokój — wszyscy wracają do ekranu startowego.
  closeAll() {
    for (const client of this.clients.keys()) client.send({ t: 'left' });
    this.clients.clear();
  }

  private dispatch(client: Client, msg: ClientMessage) {
    const playerId = this.clients.get(client);
    switch (msg.t) {
      case 'join': {
        const id = newId();
        this.state = addPlayer(this.state, id, msg.name);
        this.tokens[id] = newId();
        this.attach(client, id);
        return;
      }
      case 'resume': {
        if (!msg.playerId || this.tokens[msg.playerId] !== msg.token) {
          client.send({ t: 'left' });
          return;
        }
        this.attach(client, msg.playerId);
        return;
      }
      case 'leave': {
        if (!playerId) return;
        this.clients.delete(client);
        if (this.state.phase === 'lobby' && playerId !== this.host) {
          this.state = removePlayer(this.state, playerId);
          delete this.tokens[playerId];
        } else {
          this.state = setConnected(this.state, playerId, false);
        }
        client.send({ t: 'left' });
        this.broadcast();
        return;
      }
      case 'addBot': {
        if (playerId !== this.host) throw new GameError('Boty dodaje gospodarz.');
        if (this.state.players.length >= MAX_PLAYERS) throw new GameError('W grze jest już komplet graczy.');
        const taken = new Set(this.state.players.map((p) => p.name));
        const name = BOT_NAMES.find((n) => !taken.has(n)) ?? `Robo-${this.state.players.length + 1}`;
        this.state = addPlayer(this.state, newId(), name, true);
        this.broadcast();
        return;
      }
      case 'removeBot': {
        if (playerId !== this.host) throw new GameError('Boty usuwa gospodarz.');
        if (!this.state.players.find((p) => p.id === msg.playerId)?.bot) throw new GameError('To nie jest bot.');
        this.state = removePlayer(this.state, msg.playerId);
        this.broadcast();
        return;
      }
      case 'start': {
        if (playerId !== this.host) throw new GameError('Grę rozpoczyna gospodarz.');
        this.state = startGame(this.state);
        this.broadcast();
        return;
      }
      case 'action': {
        if (!playerId) throw new GameError('Nie jesteś w tym pokoju.');
        this.state = applyAction(this.state, playerId, msg.action);
        this.broadcast();
        return;
      }
    }
  }

  private attach(client: Client, playerId: string) {
    // Ten sam gracz z nowego połączenia (np. odświeżona strona) — stare zamykamy.
    for (const [other, id] of this.clients) {
      if (other !== client && id === playerId) {
        this.clients.delete(other);
        other.close();
      }
    }
    this.clients.set(client, playerId);
    this.state = setConnected(this.state, playerId, true);
    client.send({ t: 'session', playerId, token: this.tokens[playerId] });
    this.broadcast();
  }

  private broadcast() {
    for (const [client, playerId] of this.clients) {
      client.send({ t: 'state', view: viewFor(this.state, playerId), host: this.host });
    }
    this.save();
    this.runBots();
  }

  // Ruch, który powinien teraz wykonać któryś z botów (albo null).
  private nextBotMove(): { playerId: string; action: Action; delay: number } | null {
    const s = this.state;
    const isBot = (id: string | null) => !!id && !!s.players.find((p) => p.id === id)?.bot;
    const trade = s.trades.find((t) => isBot(t.to));
    if (trade) {
      return { playerId: trade.to, action: { type: 'respondTrade', tradeId: trade.id, accept: botTradeResponse(s, trade) }, delay: BOT_DELAY_MS.trade };
    }
    if (s.phase === 'auction') {
      const bot = s.players.find((p) => p.bot && !s.bidders.includes(p.id));
      return bot ? { playerId: bot.id, action: botAction(s, bot.id), delay: BOT_DELAY_MS.bid } : null;
    }
    if ((s.phase === 'setup' || s.phase === 'actions') && isBot(s.currentPlayer)) {
      return { playerId: s.currentPlayer!, action: botAction(s, s.currentPlayer!), delay: BOT_DELAY_MS.action };
    }
    return null;
  }

  private runBots() {
    if (this.botPending) return;
    const first = this.nextBotMove();
    if (!first) return;
    this.botPending = true;
    this.schedule(() => {
      this.botPending = false;
      // Stan mógł się zmienić w międzyczasie — liczymy ruch od nowa.
      const move = this.nextBotMove();
      if (!move) return;
      try {
        this.state = applyAction(this.state, move.playerId, move.action);
      } catch (err) {
        console.error('Bot wykonał niedozwolony ruch', move, err);
        const fallback: Action | null =
          this.state.phase === 'auction' ? { type: 'bid', amount: 0 } : this.state.phase === 'actions' ? { type: 'pass' } : null;
        if (!fallback) return;
        this.state = applyAction(this.state, move.playerId, fallback);
      }
      this.broadcast();
    }, first.delay);
  }

  private save() {
    this.onChange(this.snapshot);
  }
}
