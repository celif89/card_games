// Czyste funkcje pomocnicze — używane przez silnik i przez klienta (podglądy, podpowiedzi).
import {
  ACTION_SPACES,
  BUILDINGS,
  CONTRACTS,
  EMPTY_LOT_VALUE,
  LOAN_PENALTY,
  MATERIALS,
  PRICE_MAX,
  PRICE_MIN,
  TERRAIN_INFO,
  UNFINISHED_CONTRACT_PENALTY,
  UNSOLD_AUCTION_LOT_PRICE,
  UPGRADE_COST,
  type ActionSpaceId,
  type BuildingType,
  type Cost,
  type Material,
} from './data.ts';
import type { GameCore, Lot, Materials, Player, ScoreLine } from './types.ts';

export const emptyMaterials = (): Materials => ({ wood: 0, brick: 0, steel: 0 });

export function getPlayer(core: GameCore, id: string): Player {
  const p = core.players.find((pl) => pl.id === id);
  if (!p) throw new Error(`Nieznany gracz ${id}`);
  return p;
}

export function getLot(core: GameCore, id: string): Lot | undefined {
  return core.lots.find((l) => l.id === id);
}

export function neighbors(core: GameCore, lot: Lot): Lot[] {
  return core.lots.filter((l) => Math.abs(l.x - lot.x) + Math.abs(l.y - lot.y) === 1);
}

export function turnOrder(core: GameCore): string[] {
  const n = core.players.length;
  return core.players.map((_, i) => core.players[(core.firstPlayer + i) % n].id);
}

export function rentOf(core: GameCore, lot: Lot): number {
  const b = lot.building;
  if (!b || b.type === 'public') return 0;
  const info = BUILDINGS[b.type];
  if (!info.rent) return 0;
  let rent = info.rent;
  if (lot.terrain === 'C') rent += 1;
  if (b.type === 'house' && core.currentNews === 'housingSubsidy') rent += 1;
  if (info.residential) {
    const around = neighbors(core, lot).map((l) => l.building?.type);
    if (around.includes('park')) rent += 1;
    if (around.includes('public')) rent += 1;
    if (around.some((t) => t && t !== 'public' && BUILDINGS[t].noisy)) rent -= 1;
  }
  return Math.max(0, rent);
}

export function productionOf(core: GameCore, lot: Lot): Partial<Materials> {
  const b = lot.building;
  if (!b || b.type === 'public') return {};
  if (b.type === 'steelworks' && core.currentNews === 'strike') return {};
  return BUILDINGS[b.type].produces ?? {};
}

// Cena zakupu działki akcją „Kup działkę”, albo null gdy nie jest na sprzedaż.
export function lotPrice(core: GameCore, lot: Lot): number | null {
  if (lot.owner) return null;
  if (lot.auctionNo !== null) return lot.auctionUnsold ? UNSOLD_AUCTION_LOT_PRICE : null;
  if (lot.terrain === 'Z' && core.currentNews === 'busLine') return 2;
  const price = TERRAIN_INFO[lot.terrain].price;
  return price !== null && core.currentNews === 'roadworks' ? price + 1 : price;
}

export function canPay(player: Player, cost: Cost): boolean {
  if ((cost.money ?? 0) > player.money) return false;
  return MATERIALS.every((m) => (cost[m] ?? 0) <= player.materials[m]);
}

export function addMoney(cost: Cost, extra: number): Cost {
  return extra ? { ...cost, money: (cost.money ?? 0) + extra } : cost;
}

export function formatCost(cost: Cost): string {
  const parts: string[] = [];
  if (cost.money) parts.push(`${cost.money} 💰`);
  const icons: Record<Material, string> = { wood: '🪵', brick: '🧱', steel: '🔩' };
  for (const m of MATERIALS) if (cost[m]) parts.push(`${cost[m]} ${icons[m]}`);
  return parts.length ? parts.join(' + ') : 'za darmo';
}

export function spaceCapacity(core: GameCore, id: ActionSpaceId): number {
  const def = ACTION_SPACES.find((s) => s.id === id)!;
  const cap = def.capacity[core.players.length <= 2 ? 0 : 1];
  return cap ?? Infinity;
}

export function spaceFree(core: GameCore, id: ActionSpaceId): boolean {
  return core.actionSpaces[id].length < spaceCapacity(core, id);
}

// Które pole „Buduj” zajmie gracz i ile dopłaci.
export function buildSpace(core: GameCore): { space: ActionSpaceId; extra: number } | null {
  if (spaceFree(core, 'build')) return { space: 'build', extra: 0 };
  if (spaceFree(core, 'build2')) return { space: 'build2', extra: 1 };
  return null;
}

export interface BuildOption {
  building: BuildingType | 'upgrade';
  contractId?: string;
  label: string;
  icon: string;
  cost: Cost;
  ok: boolean;
  reason?: string;
}

export function buildOptions(core: GameCore, playerId: string, lotId: string, extra: number): BuildOption[] {
  const lot = getLot(core, lotId);
  const player = getPlayer(core, playerId);
  if (!lot || lot.owner !== playerId) return [];
  const options: BuildOption[] = [];
  const check = (cost: Cost): Pick<BuildOption, 'ok' | 'reason'> =>
    canPay(player, cost) ? { ok: true } : { ok: false, reason: 'Brakuje zasobów' };

  if (lot.building) {
    if (lot.building.type === 'house') {
      const cost = addMoney(UPGRADE_COST, extra);
      options.push({ building: 'upgrade', label: 'Rozbuduj na Kamienicę', icon: BUILDINGS.tenement.icon, cost, ...check(cost) });
    }
    return options;
  }
  for (const [type, info] of Object.entries(BUILDINGS) as [Exclude<BuildingType, 'public'>, (typeof BUILDINGS)['house']][]) {
    if (!info.terrains.includes(lot.terrain)) continue;
    const cost = addMoney(info.cost, extra);
    options.push({ building: type, label: info.name, icon: info.icon, cost, ...check(cost) });
  }
  for (const cid of player.contracts) {
    const c = CONTRACTS[cid];
    if (!c.terrains.includes(lot.terrain)) continue;
    const cost = addMoney(c.cost, extra);
    options.push({ building: 'public', contractId: cid, label: `${c.name} (zlecenie)`, icon: c.icon, cost, ...check(cost) });
  }
  return options;
}

// Wycena transakcji na rynku: każda sztuka zmienia cenę o 1.
export function marketQuote(
  prices: Record<Material, number>,
  amounts: Partial<Materials>,
  side: 'sell' | 'buy',
): { total: number; prices: Record<Material, number> } {
  const next = { ...prices };
  let total = 0;
  for (const m of MATERIALS) {
    for (let i = 0; i < (amounts[m] ?? 0); i++) {
      total += next[m];
      next[m] = side === 'sell' ? Math.max(PRICE_MIN, next[m] - 1) : Math.min(PRICE_MAX, next[m] + 1);
    }
  }
  return { total, prices: next };
}

export function buildingValue(lot: Lot): number {
  const b = lot.building;
  if (!b || b.type === 'public') return 0;
  return BUILDINGS[b.type].value;
}

export function scoreFor(core: GameCore, player: Player): ScoreLine {
  const owned = core.lots.filter((l) => l.owner === player.id);
  const buildings = owned.reduce((s, l) => s + buildingValue(l), 0);
  const emptyLots = owned.filter((l) => !l.building).length * EMPTY_LOT_VALUE;
  const matCount = MATERIALS.reduce((s, m) => s + player.materials[m], 0);
  const materials = Math.floor(matCount / 2);
  const loans = -player.loans * LOAN_PENALTY;
  const contracts = -player.contracts.length * UNFINISHED_CONTRACT_PENALTY;
  return {
    playerId: player.id,
    money: player.money,
    buildings,
    emptyLots,
    prestige: player.prestige,
    materials,
    loans,
    contracts,
    total: player.money + buildings + emptyLots + player.prestige + materials + loans + contracts,
  };
}

// Podgląd dochodu gracza w bieżącej rundzie (bez kosztów).
export function incomePreview(core: GameCore, playerId: string): { money: number; materials: Materials } {
  const materials = emptyMaterials();
  let money = 0;
  for (const lot of core.lots) {
    if (lot.owner !== playerId) continue;
    money += rentOf(core, lot);
    if (lot.building?.type === 'park' && core.currentNews === 'openDay') money += 2;
    if (lot.building?.type === 'public' && core.currentNews === 'festival') money += 2;
    const prod = productionOf(core, lot);
    for (const m of MATERIALS) materials[m] += prod[m] ?? 0;
  }
  return { money, materials };
}
