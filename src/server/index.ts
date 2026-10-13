// Serwer gry: serwuje zbudowanego klienta i prowadzi pokoje przez WebSocket.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { GameError, addPlayer, applyAction, createGame, removePlayer, setConnected, startGame, viewFor } from '../engine/engine.ts';
import type { GameState } from '../engine/types.ts';
import type { ClientMessage, ServerMessage } from './protocol.ts';

const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_DIR = resolve(import.meta.dirname, '../../dist/client');
const ROOM_TTL_MS = 12 * 60 * 60 * 1000;

interface Room {
  code: string;
  state: GameState;
  tokens: Map<string, string>;
  host: string;
  touched: number;
}

const rooms = new Map<string, Room>();
const sockets = new Map<WebSocket, { room: Room; playerId: string }>();

function lanUrls(): string[] {
  const urls: string[] = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal) urls.push(`http://${a.address}:${PORT}`);
  }
  return urls;
}

function newRoomCode(): string {
  const letters = 'BCDFGHJKLMNPRSTWZ';
  for (;;) {
    const code = Array.from(randomBytes(4), (b) => letters[b % letters.length]).join('');
    if (!rooms.has(code)) return code;
  }
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room: Room) {
  room.touched = Date.now();
  const urls = lanUrls();
  for (const [ws, info] of sockets) {
    if (info.room !== room) continue;
    send(ws, { t: 'state', view: viewFor(room.state, info.playerId), host: room.host, code: room.code, joinUrls: urls });
  }
}

function attach(ws: WebSocket, room: Room, playerId: string) {
  // Ten sam gracz z nowego połączenia (np. odświeżona karta) — stare połączenie zamykamy.
  for (const [other, info] of sockets) {
    if (other !== ws && info.room === room && info.playerId === playerId) {
      sockets.delete(other);
      other.close();
    }
  }
  sockets.set(ws, { room, playerId });
  room.state = setConnected(room.state, playerId, true);
  send(ws, { t: 'session', code: room.code, playerId, token: room.tokens.get(playerId)! });
  broadcast(room);
}

function handle(ws: WebSocket, msg: ClientMessage) {
  const current = sockets.get(ws);
  switch (msg.t) {
    case 'create': {
      const room: Room = { code: newRoomCode(), state: createGame(), tokens: new Map(), host: '', touched: Date.now() };
      const playerId = randomUUID();
      room.state = addPlayer(room.state, playerId, msg.name);
      room.tokens.set(playerId, randomUUID());
      room.host = playerId;
      rooms.set(room.code, room);
      attach(ws, room, playerId);
      return;
    }
    case 'join': {
      const room = rooms.get(msg.code.trim().toUpperCase());
      if (!room) throw new GameError('Nie ma pokoju o takim kodzie.');
      const playerId = randomUUID();
      room.state = addPlayer(room.state, playerId, msg.name);
      room.tokens.set(playerId, randomUUID());
      attach(ws, room, playerId);
      return;
    }
    case 'resume': {
      const room = rooms.get(msg.code);
      if (!room || room.tokens.get(msg.playerId) !== msg.token) {
        send(ws, { t: 'left' });
        return;
      }
      attach(ws, room, msg.playerId);
      return;
    }
    case 'leave': {
      if (!current) return;
      const { room, playerId } = current;
      sockets.delete(ws);
      if (room.state.phase === 'lobby') {
        room.state = removePlayer(room.state, playerId);
        room.tokens.delete(playerId);
        if (room.host === playerId) room.host = room.state.players[0]?.id ?? '';
        if (!room.state.players.length) rooms.delete(room.code);
      } else {
        room.state = setConnected(room.state, playerId, false);
      }
      send(ws, { t: 'left' });
      broadcast(room);
      return;
    }
    case 'start': {
      if (!current) throw new GameError('Nie jesteś w pokoju.');
      if (current.room.host !== current.playerId) throw new GameError('Grę rozpoczyna gospodarz.');
      current.room.state = startGame(current.room.state);
      broadcast(current.room);
      return;
    }
    case 'action': {
      if (!current) throw new GameError('Nie jesteś w pokoju.');
      current.room.state = applyAction(current.room.state, current.playerId, msg.action);
      broadcast(current.room);
      return;
    }
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(CLIENT_DIR, path);
  try {
    if (!file.startsWith(CLIENT_DIR) || !(await stat(file)).isFile()) file = join(CLIENT_DIR, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Brak zbudowanego klienta. Uruchom: npm run build');
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      handle(ws, JSON.parse(String(data)) as ClientMessage);
    } catch (err) {
      const message = err instanceof GameError ? err.message : 'Coś poszło nie tak.';
      if (!(err instanceof GameError)) console.error(err);
      send(ws, { t: 'error', message });
    }
  });
  ws.on('close', () => {
    const info = sockets.get(ws);
    if (!info) return;
    sockets.delete(ws);
    info.room.state = setConnected(info.room.state, info.playerId, false);
    broadcast(info.room);
  });
});

setInterval(() => {
  for (const [code, room] of rooms) if (Date.now() - room.touched > ROOM_TTL_MS) rooms.delete(code);
}, 60 * 60 * 1000).unref();

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏙️  Miasteczko S.A. działa na porcie ${PORT}`);
  console.log(`   Na tym komputerze:  http://localhost:${PORT}`);
  for (const url of lanUrls()) console.log(`   W domowej sieci:    ${url}`);
  console.log('');
});
