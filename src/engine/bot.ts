// Boty. `botAction` gra prostą, ale sensowną strategią; `randomAction` wykonuje losowe ruchy (do testów odporności).
// Boty korzystają tylko z informacji jawnych i własnych — nie podglądają cudzych ofert w licytacji.
import {
  BUILDINGS,
  CONTRACTS,
  HIRE_COST,
  LOAN_AMOUNT,
  MARKET_UNITS_PER_ACTION,
  MATERIALS,
  MATERIAL_INFO,
  MAX_CONTRACTS_IN_HAND,
  type Cost,
  type Material,
} from './data.ts';
import {
  buildOptions,
  buildSpace,
  emptyMaterials,
  getPlayer,
  incomePreview,
  lotPrice,
  marketQuote,
  spaceFree,
  type BuildOption,
} from './rules.ts';
import type { Action, Building, GameCore, Lot, Materials, Player, TradeBundle } from './types.ts';

export type Rng = () => number;

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

// Ile rund dochodu jeszcze zostało (bieżąca runda też płaci na koniec).
function roundsLeft(core: GameCore): number {
  return Math.max(0, core.rounds - core.round + 1);
}

// Wartość materiału dla bota: trochę poniżej ceny bazowej (sprzedaż obniża cenę).
function materialWorth(core: GameCore, m: Material): number {
  return Math.max(1, Math.min(core.prices[m], MATERIAL_INFO[m].basePrice) - 0.5);
}

function costWorth(core: GameCore, cost: Cost): number {
  return (cost.money ?? 0) + MATERIALS.reduce((s, m) => s + (cost[m] ?? 0) * materialWorth(core, m), 0);
}

function incomeWorth(core: GameCore, income: { money: number; materials: Materials }): number {
  return income.money + MATERIALS.reduce((s, m) => s + income.materials[m] * materialWorth(core, m), 0);
}

function withBuilding(core: GameCore, lotId: string, owner: string, building: Building | null): GameCore {
  return { ...core, lots: core.lots.map((l) => (l.id === lotId ? { ...l, owner, building } : l)) };
}

// Opłacalność budowy: wartość końcowa + przyszłe dochody + prestiż/nagroda − koszt.
function buildGain(core: GameCore, me: Player, lot: Lot, o: BuildOption): number {
  const building: Building =
    o.building === 'upgrade' ? { type: 'tenement' } : o.building === 'public' ? { type: 'public', contractId: o.contractId } : { type: o.building };
  const built = withBuilding(core, lot.id, me.id, building);
  const before = incomeWorth(core, incomePreview(core, me.id));
  const after = incomeWorth(core, incomePreview(built, me.id));
  const r = roundsLeft(core);
  let value = (after - before) * r;
  if (o.building === 'upgrade') value += BUILDINGS.tenement.value - BUILDINGS.house.value;
  else if (o.building === 'public') {
    const c = CONTRACTS[o.contractId!];
    value += c.rewardMoney + c.rewardPrestige + 3; // +3: unikamy kary za niezrealizowane zlecenie
  } else {
    value += BUILDINGS[o.building].value + (BUILDINGS[o.building].prestige ?? 0) - 2; // −2: działka przestaje być pusta
  }
  return value - costWorth(core, o.cost);
}

interface Plan {
  lot: Lot;
  option: BuildOption;
  gain: number;
  missing: Materials;
  missingCost: number;
}

// Najlepsze budowy możliwe na działkach bota — teraz albo po dokupieniu materiałów.
function plans(core: GameCore, me: Player, lots: Lot[], extra: number): Plan[] {
  const out: Plan[] = [];
  for (const lot of lots) {
    const real = core.lots.find((l) => l.id === lot.id)!;
    const hypothetical = real.owner === me.id ? core : withBuilding(core, lot.id, me.id, real.building);
    for (const o of buildOptions(hypothetical, me.id, lot.id, extra)) {
      const missing = emptyMaterials();
      for (const m of MATERIALS) missing[m] = Math.max(0, (o.cost[m] ?? 0) - me.materials[m]);
      const units = MATERIALS.reduce((s, m) => s + missing[m], 0);
      if (units > MARKET_UNITS_PER_ACTION) continue;
      const missingCost = marketQuote(core.prices, missing, 'buy').total;
      const gain = buildGain(core, me, lot, o) - (missingCost - costWorth(core, { ...missing }));
      out.push({ lot, option: o, gain, missing, missingCost });
    }
  }
  return out.sort((a, b) => b.gain - a.gain);
}

function bundleWorth(core: GameCore, b: TradeBundle): number {
  return b.money + MATERIALS.reduce((s, m) => s + b[m] * materialWorth(core, m), 0);
}

export function botTradeResponse(core: GameCore, offer: { give: TradeBundle; get: TradeBundle }): boolean {
  return bundleWorth(core, offer.give) >= bundleWorth(core, offer.get) * 1.15 + 0.5;
}

function lotScore(core: GameCore, me: Player, lot: Lot): number {
  const best = plans(core, { ...me, materials: { wood: 9, brick: 9, steel: 9 } }, [lot], 0)[0];
  return (best?.gain ?? 0) + 2;
}

export function botAction(core: GameCore, playerId: string, rng: Rng = Math.random): Action {
  const me = getPlayer(core, playerId);
  const r = roundsLeft(core);

  if (core.phase === 'setup') {
    const lots = core.lots.filter((l) => !l.owner && l.auctionNo === null && ['Z', 'L', 'G'].includes(l.terrain));
    const prefer = (l: Lot) => (l.terrain === 'G' ? 3 : l.terrain === 'L' ? 2.5 : 2) + rng();
    return { type: 'pickStartLot', lotId: lots.sort((a, b) => prefer(b) - prefer(a))[0].id };
  }

  if (core.phase === 'auction') {
    const lot = core.lots.find((l) => l.id === core.auctionLot)!;
    const worth = lotScore(core, me, lot);
    const bid = Math.floor(worth * (0.45 + rng() * 0.25));
    return { type: 'bid', amount: Math.max(0, Math.min(bid, me.money - 4)) };
  }

  // Faza akcji.
  const slot = buildSpace(core);
  const myLots = core.lots.filter((l) => l.owner === playerId);
  const lastRound = r <= 1;

  // 0. Pod koniec gry spłać pożyczki (każda niespłacona to −12 pkt).
  // Dochód z ostatniej rundy przychodzi już po akcjach, więc spłacamy wcześniej.
  if (me.loans > 0 && me.money >= LOAN_AMOUNT && r <= 3) return { type: 'repay' };

  // 1. Zbuduj od razu, jeśli się opłaca.
  if (slot) {
    const ready = plans(core, me, myLots, slot.extra).filter((p) => p.option.ok && p.gain > 0);
    if (ready.length) {
      const p = ready[0];
      return { type: 'build', lotId: p.lot.id, building: p.option.building, contractId: p.option.contractId };
    }
  }

  // 2. Dokup brakujące materiały do opłacalnej budowy.
  const extra = slot?.extra ?? 1;
  const future = plans(core, me, myLots, extra).filter((p) => p.gain > 1);
  if (spaceFree(core, 'buy') && slot && !lastRound) {
    const p = future.find((pl) => MATERIALS.some((m) => pl.missing[m] > 0) && me.money >= pl.missingCost + (pl.option.cost.money ?? 0));
    if (p) return { type: 'buy', amounts: p.missing };
  }

  // 3. Weź zlecenie, które da się zrealizować.
  if (spaceFree(core, 'townhall') && me.contracts.length < Math.min(1, MAX_CONTRACTS_IN_HAND) && r >= 3) {
    const options = core.openContracts
      .map((cid) => {
        const c = CONTRACTS[cid];
        const lot = myLots.find((l) => !l.building && c.terrains.includes(l.terrain));
        const gain = c.rewardMoney + c.rewardPrestige - costWorth(core, c.cost);
        return { cid, lot, gain };
      })
      .filter((o) => o.lot && o.gain > 2)
      .sort((a, b) => b.gain - a.gain);
    if (options.length) return { type: 'takeContract', contractId: options[0].cid };
  }

  // 4. Kup działkę, gdy nie ma gdzie budować albo jest dużo pieniędzy.
  const emptyLots = myLots.filter((l) => !l.building).length;
  if (spaceFree(core, 'buyLot') && r >= 3 && (emptyLots === 0 || me.money >= 18)) {
    const candidates = core.lots
      .map((l) => ({ lot: l, price: lotPrice(core, l) }))
      .filter((c): c is { lot: Lot; price: number } => c.price !== null && c.price <= me.money - 3)
      .map((c) => ({ ...c, score: lotScore(core, me, c.lot) - c.price + rng() }))
      .filter((c) => c.score > 2)
      .sort((a, b) => b.score - a.score);
    if (candidates.length) return { type: 'buyLot', lotId: candidates[0].lot.id };
  }

  // 5. Sprzedaj nadwyżki (pod koniec gry — wszystko, czego nie zużyjemy).
  if (spaceFree(core, 'sell')) {
    const needed = emptyMaterials();
    const keepFor = r <= 2 ? future.filter((p) => MATERIALS.every((m) => p.missing[m] === 0)).slice(0, 1) : future.slice(0, 2);
    for (const p of keepFor) for (const m of MATERIALS) needed[m] += p.option.cost[m] ?? 0;
    const amounts = emptyMaterials();
    let units = 0;
    for (const m of [...MATERIALS].sort((a, b) => core.prices[b] - core.prices[a])) {
      const surplus = me.materials[m] - needed[m];
      const ok = r <= 2 || core.prices[m] >= MATERIAL_INFO[m].basePrice - 1;
      const n = ok ? Math.max(0, Math.min(surplus, MARKET_UNITS_PER_ACTION - units)) : 0;
      amounts[m] = n;
      units += n;
    }
    if (units > 0) return { type: 'sell', amounts };
  }

  // 6. Pożyczki: spłać pod koniec gry, pożycz gdy brakuje na opłacalną budowę.
  if (me.loans < 1 && r >= 6 && future.length && future[0].gain > 8 && me.money < future[0].missingCost + (future[0].option.cost.money ?? 0)) {
    return { type: 'loan' };
  }

  // 7. Dodatkowy menedżer na początku gry, znacznik pierwszego gracza.
  if (spaceFree(core, 'hire') && !me.hired && r >= 4 && me.money >= HIRE_COST + 6) return { type: 'hire' };
  if (spaceFree(core, 'firstPlayer') && !lastRound) return { type: 'takeFirstPlayer' };

  return { type: 'pass' };
}

export function randomAction(core: GameCore, playerId: string, rng: Rng = Math.random): Action {
  const p = getPlayer(core, playerId);

  if (core.phase === 'setup') {
    const lots = core.lots.filter((l) => !l.owner && l.auctionNo === null && ['Z', 'L', 'G'].includes(l.terrain));
    return { type: 'pickStartLot', lotId: pick(lots, rng).id };
  }
  if (core.phase === 'auction') {
    return { type: 'bid', amount: Math.floor(rng() * (Math.min(p.money, 10) + 1)) };
  }

  const candidates: Action[] = [];
  const slot = buildSpace(core);
  if (slot) {
    for (const lot of core.lots.filter((l) => l.owner === playerId)) {
      for (const o of buildOptions(core, playerId, lot.id, slot.extra)) {
        if (o.ok) candidates.push({ type: 'build', lotId: lot.id, building: o.building, contractId: o.contractId });
      }
    }
  }
  candidates.push(...candidates);

  if (spaceFree(core, 'buyLot')) {
    for (const lot of core.lots) {
      const price = lotPrice(core, lot);
      if (price !== null && price <= p.money) candidates.push({ type: 'buyLot', lotId: lot.id });
    }
  }
  const owned = MATERIALS.filter((m) => p.materials[m] > 0);
  if (spaceFree(core, 'sell') && owned.length) {
    const m = pick(owned, rng);
    candidates.push({ type: 'sell', amounts: { [m]: Math.min(p.materials[m], MARKET_UNITS_PER_ACTION) } });
  }
  if (spaceFree(core, 'buy')) {
    const m = pick(MATERIALS, rng);
    if (core.prices[m] * 2 + 1 <= p.money) candidates.push({ type: 'buy', amounts: { [m]: 2 } });
  }
  if (spaceFree(core, 'townhall') && p.contracts.length < 2 && core.openContracts.length) {
    candidates.push({ type: 'takeContract', contractId: pick(core.openContracts, rng) });
  }
  if (spaceFree(core, 'hire') && !p.hired && p.money >= 6) candidates.push({ type: 'hire' });
  if (spaceFree(core, 'firstPlayer')) candidates.push({ type: 'takeFirstPlayer' });
  if (p.loans > 0 && p.money >= 15) candidates.push({ type: 'repay' });
  if (p.money < 4 && p.loans < 2) candidates.push({ type: 'loan' });

  return candidates.length ? pick(candidates, rng) : { type: 'pass' };
}
