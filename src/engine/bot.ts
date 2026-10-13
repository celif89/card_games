// Prosty bot: wybiera losową sensowną akcję. Służy do testów i w przyszłości do gry z komputerem.
import { MARKET_UNITS_PER_ACTION, MATERIALS } from './data.ts';
import { buildOptions, buildSpace, getPlayer, lotPrice, spaceFree } from './rules.ts';
import type { Action, GameCore } from './types.ts';
import type { Rng } from './engine.ts';

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

export function botAction(core: GameCore, playerId: string, rng: Rng = Math.random): Action {
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
  // Budowanie jest najważniejsze — dodajemy je kilka razy, żeby bot częściej budował.
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
