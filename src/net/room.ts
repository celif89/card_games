// Pokój gry prowadzony przez gospodarza (w jego przeglądarce). Niezależny od sposobu przesyłania wiadomości.
import { GameError, addPlayer, applyAction, createGame, removePlayer, setConnected, startGame, viewFor } from '../engine/engine.ts';
import type { GameState } from '../engine/types.ts';
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

export class Room {
  private state: GameState;
  private tokens: Record<string, string>;
  readonly host: string;
  private clients = new Map<Client, string>();

  private constructor(snapshot: RoomSnapshot, private onChange: (s: RoomSnapshot) => void) {
    this.state = snapshot.state;
    this.tokens = snapshot.tokens;
    this.host = snapshot.host;
    // Po odtworzeniu z zapisu nikt nie jest jeszcze połączony.
    for (const p of this.state.players) this.state = setConnected(this.state, p.id, false);
  }

  // Nowy pokój: gospodarz od razu jest pierwszym graczem.
  static create(hostName: string, onChange: (s: RoomSnapshot) => void): { room: Room; hostToken: string } {
    const host = newId();
    const token = newId();
    const room = new Room({ state: addPlayer(createGame(), host, hostName), tokens: { [host]: token }, host }, onChange);
    room.save();
    return { room, hostToken: token };
  }

  static restore(snapshot: RoomSnapshot, onChange: (s: RoomSnapshot) => void): Room {
    return new Room(snapshot, onChange);
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
  }

  private save() {
    this.onChange(this.snapshot);
  }
}
