import { describe, expect, it } from 'vitest';
import { addPlayer, applyAction, createGame, setRounds, startGame, viewFor } from './engine.ts';
import { botAction, randomAction } from './bot.ts';
import { getLot, getPlayer, marketQuote, rentOf, turnOrder } from './rules.ts';
import type { GameState } from './types.ts';

// Deterministyczny generator liczb losowych do testów.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function newGame(players = 2, seed = 1): GameState {
  let s = createGame(seeded(seed));
  for (let i = 0; i < players; i++) s = addPlayer(s, `p${i}`, `Gracz ${i}`);
  return startGame(s, seeded(seed));
}

function pickStartLots(s: GameState, lots: string[]): GameState {
  for (const lotId of lots) s = applyAction(s, s.currentPlayer!, { type: 'pickStartLot', lotId });
  return s;
}

function allBid(s: GameState, amounts: number[]): GameState {
  s.players.forEach((p, i) => (s = applyAction(s, p.id, { type: 'bid', amount: amounts[i] ?? 0 })));
  return s;
}

describe('przebieg gry', () => {
  it('wybór działek startowych odbywa się w odwrotnej kolejności i rozpoczyna licytację', () => {
    let s = newGame(3);
    const order = turnOrder(s);
    expect(s.currentPlayer).toBe(order[2]);
    s = pickStartLots(s, ['C1', 'D1', 'E2']);
    expect(s.phase).toBe('auction');
    expect(s.round).toBe(1);
    expect(s.auctionLot).toBe('C3');
    expect(getLot(s, 'C1')!.owner).toBe(order[2]);
  });

  it('nie pozwala wybrać działki licytowanej na start', () => {
    const s = newGame();
    expect(() => applyAction(s, s.currentPlayer!, { type: 'pickStartLot', lotId: 'C3' })).toThrow();
  });

  it('licytacja: oferty są ukryte, wygrywa najwyższa, remis wygrywa wcześniejszy w kolejności', () => {
    let s = pickStartLots(newGame(), ['C1', 'D1']);
    const [first, second] = turnOrder(s);
    s = applyAction(s, first, { type: 'bid', amount: 5 });
    const view = viewFor(s, second);
    expect(view.bidders).toEqual([first]);
    expect(view.myBid).toBeNull();
    expect(JSON.stringify(view)).not.toContain('"bids"');
    s = applyAction(s, second, { type: 'bid', amount: 5 });
    expect(s.phase).toBe('actions');
    expect(getLot(s, 'C3')!.owner).toBe(first);
    expect(getPlayer(s, first).money).toBe(10);
  });

  it('brak ofert: działka trafia do sprzedaży za 6', () => {
    let s = pickStartLots(newGame(), ['C1', 'D1']);
    s = allBid(s, [0, 0]);
    expect(getLot(s, 'C3')!.auctionUnsold).toBe(true);
    s = applyAction(s, s.currentPlayer!, { type: 'buyLot', lotId: 'C3' });
    expect(getLot(s, 'C3')!.owner).not.toBeNull();
  });

  it('budowa Domu zużywa materiały, a czynsz wpływa na koniec rundy', () => {
    let s = pickStartLots(newGame(), ['C1', 'D1']);
    s = allBid(s, [0, 0]);
    const me = s.currentPlayer!;
    const lot = s.lots.find((l) => l.owner === me)!;
    s = applyAction(s, me, { type: 'build', lotId: lot.id, building: 'house' });
    expect(getPlayer(s, me).materials).toEqual({ wood: 0, brick: 0, steel: 0 });
    // Wszyscy pasują — koniec rundy.
    while (s.phase === 'actions' && s.round === 1) s = applyAction(s, s.currentPlayer!, { type: 'pass' });
    expect(s.round).toBe(2);
    expect(getPlayer(s, me).money).toBeGreaterThanOrEqual(15 + 2);
  });

  it('drugie pole Buduj kosztuje 1 monetę więcej', () => {
    let s = pickStartLots(newGame(), ['C1', 'D1']);
    s = allBid(s, [0, 0]);
    const a = s.currentPlayer!;
    s = applyAction(s, a, { type: 'build', lotId: s.lots.find((l) => l.owner === a)!.id, building: 'house' });
    const b = s.currentPlayer!;
    const before = getPlayer(s, b).money;
    s = applyAction(s, b, { type: 'build', lotId: s.lots.find((l) => l.owner === b)!.id, building: 'house' });
    expect(getPlayer(s, b).money).toBe(before - 1);
    expect(s.actionSpaces.build2).toEqual([b]);
  });

  it('nie można działać poza kolejką', () => {
    let s = pickStartLots(newGame(), ['C1', 'D1']);
    s = allBid(s, [0, 0]);
    const other = s.players.find((p) => p.id !== s.currentPlayer)!.id;
    expect(() => applyAction(s, other, { type: 'loan' })).toThrow('kolej');
  });

  it('handel: oferta i akceptacja przenoszą zasoby', () => {
    let s = pickStartLots(newGame(), ['C1', 'D1']);
    s = allBid(s, [0, 0]);
    s = applyAction(s, 'p0', { type: 'offerTrade', to: 'p1', give: { wood: 2 }, get: { money: 5 } });
    s = applyAction(s, 'p1', { type: 'respondTrade', tradeId: s.trades[0].id, accept: true });
    expect(getPlayer(s, 'p0').materials.wood).toBe(0);
    expect(getPlayer(s, 'p1').materials.wood).toBe(4);
    expect(getPlayer(s, 'p0').money).toBe(20);
    expect(s.trades).toHaveLength(0);
  });
});

describe('długość gry', () => {
  it('domyślnie 14 rund dla 2 graczy, 12 dla 3 i 10 dla 4', () => {
    expect(newGame(2).rounds).toBe(14);
    expect(newGame(3).rounds).toBe(12);
    expect(newGame(4).rounds).toBe(10);
  });

  it('gospodarz może wybrać długość, a licytowanych działek jest tyle, ile rund', () => {
    for (const rounds of [8, 14]) {
      let s = createGame(seeded(3));
      s = addPlayer(addPlayer(s, 'a', 'A'), 'b', 'B');
      s = startGame(setRounds(s, rounds), seeded(3));
      expect(s.rounds).toBe(rounds);
      expect(s.lots.filter((l) => l.auctionNo !== null)).toHaveLength(rounds);
      expect(s.secret.newsDeck.length).toBeGreaterThanOrEqual(rounds);
    }
    expect(() => setRounds(createGame(), 9)).toThrow();
  });
});

describe('zasady pomocnicze', () => {
  it('rynek: każda sztuka zmienia cenę o 1', () => {
    expect(marketQuote({ wood: 3, brick: 4, steel: 6 }, { wood: 3 }, 'sell')).toEqual({
      total: 3 + 2 + 1,
      prices: { wood: 1, brick: 4, steel: 6 },
    });
    expect(marketQuote({ wood: 3, brick: 4, steel: 9 }, { steel: 3 }, 'buy').total).toBe(9 + 10 + 10);
  });

  it('czynsz uwzględnia park, budynek publiczny, hałas i centrum', () => {
    const s = newGame();
    const set = (id: string, type: any) => (getLot(s, id)!.building = { type });
    set('C2', 'house');
    expect(rentOf(s, getLot(s, 'C2')!)).toBe(2);
    set('B2', 'park');
    set('D2', 'public');
    expect(rentOf(s, getLot(s, 'C2')!)).toBe(4);
    set('E2', 'house');
    set('F2', 'brickworks');
    expect(rentOf(s, getLot(s, 'E2')!)).toBe(2); // 2 + publiczny obok − hałas
    set('C3', 'office');
    expect(rentOf(s, getLot(s, 'C3')!)).toBe(8);
  });
});

describe('symulacja', () => {
  function play(n: number, seed: number, pickBot: (i: number) => typeof botAction) {
    const rng = seeded(seed * 97 + n);
    let s = newGame(n, seed);
    let steps = 0;
    while (s.phase !== 'gameOver') {
      const actor = s.phase === 'auction' ? s.players.find((p) => !s.bidders.includes(p.id))!.id : s.currentPlayer!;
      const idx = s.players.findIndex((p) => p.id === actor);
      s = applyAction(s, actor, pickBot(idx)(s, actor, rng));
      expect(++steps).toBeLessThan(600);
    }
    return s;
  }

  function checkSane(s: GameState, n: number) {
    expect(s.round).toBe(s.rounds);
    expect(s.scores).toHaveLength(n);
    for (const p of s.players) {
      expect(p.money).toBeGreaterThanOrEqual(0);
      expect(Object.values(p.materials).every((v) => v >= 0)).toBe(true);
    }
    for (const price of Object.values(s.prices)) expect(price).toBeGreaterThanOrEqual(1);
  }

  it.each([2, 3, 4])('losowe boty rozgrywają pełną grę na %i graczy', (n) => {
    for (let seed = 1; seed <= 20; seed++) checkSane(play(n, seed, () => randomAction), n);
  });

  it.each([2, 3, 4])('boty ze strategią rozgrywają pełną grę na %i graczy', (n) => {
    for (let seed = 1; seed <= 10; seed++) checkSane(play(n, seed, () => botAction), n);
  });

  it('bot ze strategią wygrywa z losowym', () => {
    let wins = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = play(2, seed, (i) => (i === 0 ? botAction : randomAction));
      if (s.scores![0].playerId === 'p0') wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(16);
  });
});
