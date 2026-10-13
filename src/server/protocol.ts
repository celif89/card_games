import type { Action, GameView } from '../engine/types.ts';

export type ClientMessage =
  | { t: 'create'; name: string }
  | { t: 'join'; code: string; name: string }
  | { t: 'resume'; code: string; playerId: string; token: string }
  | { t: 'leave' }
  | { t: 'start' }
  | { t: 'action'; action: Action };

export type ServerMessage =
  | { t: 'session'; code: string; playerId: string; token: string }
  | { t: 'state'; view: GameView; host: string; code: string; joinUrls: string[] }
  | { t: 'error'; message: string }
  | { t: 'left' };
