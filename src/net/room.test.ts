import { describe, expect, it } from 'vitest';
import { Room, type Client, type RoomSnapshot } from './room.ts';
import type { ServerMessage } from './protocol.ts';

function fakeClient() {
  const inbox: ServerMessage[] = [];
  const client: Client & { inbox: ServerMessage[]; closed: boolean } = {
    inbox,
    closed: false,
    send: (m) => inbox.push(m),
    close: () => (client.closed = true),
  };
  return client;
}

const last = <T extends ServerMessage['t']>(c: { inbox: ServerMessage[] }, t: T) =>
  [...c.inbox].reverse().find((m) => m.t === t) as Extract<ServerMessage, { t: T }> | undefined;

function setup() {
  let saved: RoomSnapshot | null = null;
  const { room, hostToken } = Room.create('Ania', (s) => (saved = s));
  const host = fakeClient();
  room.handle(host, { t: 'resume', playerId: room.host, token: hostToken });
  return { room, host, hostToken, saved: () => saved! };
}

describe('pokój gry', () => {
  it('gość dołącza i dostaje sesję oraz stan', () => {
    const { room, host } = setup();
    const guest = fakeClient();
    room.handle(guest, { t: 'join', name: 'Tomek' });
    expect(last(guest, 'session')?.token).toBeTruthy();
    expect(last(guest, 'state')?.view.players.map((p) => p.name)).toEqual(['Ania', 'Tomek']);
    expect(last(host, 'state')?.view.players).toHaveLength(2);
  });

  it('tylko gospodarz może rozpocząć grę', () => {
    const { room } = setup();
    const guest = fakeClient();
    room.handle(guest, { t: 'join', name: 'Tomek' });
    room.handle(guest, { t: 'start' });
    expect(last(guest, 'error')?.message).toContain('gospodarz');
  });

  it('gracz wraca po rozłączeniu dzięki tokenowi, a stare połączenie jest zamykane', () => {
    const { room, host } = setup();
    const guest = fakeClient();
    room.handle(guest, { t: 'join', name: 'Tomek' });
    const session = last(guest, 'session')!;
    room.handle(host, { t: 'start' });

    const again = fakeClient();
    room.handle(again, { t: 'resume', playerId: session.playerId, token: session.token });
    expect(guest.closed).toBe(true);
    expect(last(again, 'state')?.view.phase).toBe('setup');

    const intruder = fakeClient();
    room.handle(intruder, { t: 'resume', playerId: session.playerId, token: 'zły' });
    expect(last(intruder, 'left')).toBeTruthy();
  });

  it('stan pokoju jest zapisywany i można go odtworzyć', () => {
    const { room, host, hostToken, saved } = setup();
    const guest = fakeClient();
    room.handle(guest, { t: 'join', name: 'Tomek' });
    room.handle(host, { t: 'start' });

    const restored = Room.restore(structuredClone(saved()), () => {});
    const host2 = fakeClient();
    restored.handle(host2, { t: 'resume', playerId: restored.host, token: hostToken });
    const view = last(host2, 'state')!.view;
    expect(view.phase).toBe('setup');
    expect(view.players.find((p) => p.name === 'Tomek')?.connected).toBe(false);
  });
});
