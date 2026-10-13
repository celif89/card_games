import type { Action, GameView } from '../engine/types.ts';

// Wiadomości od gracza do gospodarza pokoju.
export type ClientMessage =
  | { t: 'join'; name: string }
  | { t: 'resume'; playerId: string; token: string }
  | { t: 'leave' }
  | { t: 'start' }
  | { t: 'action'; action: Action };

// Wiadomości od gospodarza pokoju do gracza.
export type ServerMessage =
  | { t: 'session'; playerId: string; token: string }
  | { t: 'state'; view: GameView; host: string }
  | { t: 'error'; message: string }
  | { t: 'left' };
