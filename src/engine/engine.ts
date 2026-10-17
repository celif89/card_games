// Silnik gry: stan + akcje. Każda akcja zwraca nowy stan albo rzuca GameError.
import {
  ACTION_SPACES,
  AUCTION_ORDER,
  BUILDINGS,
  CONTRACTS,
  HIRE_COST,
  LOAN_AMOUNT,
  MAP,
  MARKET_UNITS_PER_ACTION,
  MATERIALS,
  MATERIAL_INFO,
  MAX_CONTRACTS_IN_HAND,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NEWS,
  OPEN_CONTRACTS,
  PLAYER_COLORS,
  PRICE_MAX,
  PRICE_MIN,
  ROUND_OPTIONS,
  defaultRounds,
  START_MANAGERS,
  START_MATERIALS,
  START_MONEY,
  TERRAIN_INFO,
  type ActionSpaceId,
  type Cost,
  type Material,
  type NewsId,
} from './data.ts';
import {
  buildingName,
  buildOptions,
  buildSpace,
  canPay,
  getLot,
  getPlayer,
  incomePreview,
  lotPrice,
  marketQuote,
  scoreFor,
  spaceFree,
  turnOrder,
} from './rules.ts';
import type { Action, GameState, GameView, Lot, Materials, Player, TradeBundle } from './types.ts';

export class GameError extends Error {}

const fail = (msg: string): never => {
  throw new GameError(msg);
};

export type Rng = () => number;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptySpaces(): Record<ActionSpaceId, string[]> {
  return Object.fromEntries(ACTION_SPACES.map((s) => [s.id, []])) as unknown as Record<ActionSpaceId, string[]>;
}

function createLots(): Lot[] {
  const lots: Lot[] = [];
  MAP.forEach((row, y) =>
    [...row].forEach((terrain, x) => {
      const id = `${'ABCDEF'[x]}${y + 1}`;
      lots.push({
        id,
        x,
        y,
        terrain: terrain as Lot['terrain'],
        owner: null,
        building: null,
        auctionNo: null,
        auctionUnsold: false,
      });
    }),
  );
  return lots;
}

export function createGame(rng: Rng = Math.random): GameState {
  const contractDeck = shuffle(Object.keys(CONTRACTS), rng);
  const openContracts = contractDeck.splice(0, OPEN_CONTRACTS);
  return {
    phase: 'lobby',
    round: 0,
    rounds: 0,
    roundsSetting: null,
    players: [],
    firstPlayer: 0,
    nextFirstPlayer: null,
    currentPlayer: null,
    setupQueue: [],
    lots: createLots(),
    prices: { wood: MATERIAL_INFO.wood.basePrice, brick: MATERIAL_INFO.brick.basePrice, steel: MATERIAL_INFO.steel.basePrice },
    currentNews: null,
    newsPreview: [],
    openContracts,
    contractDeckCount: contractDeck.length,
    actionSpaces: emptySpaces(),
    auctionLot: null,
    bidders: [],
    lastAuction: null,
    buildsThisRound: {},
    trades: [],
    nextTradeId: 1,
    log: [],
    scores: null,
    secret: {
      bids: {},
      newsDeck: shuffle(Object.keys(NEWS) as NewsId[], rng),
      contractDeck,
    },
  };
}

function log(s: GameState, text: string, player?: string, lot?: string) {
  s.log.push({ round: s.round, text, player, lot });
  if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
}

export function addPlayer(state: GameState, id: string, name: string, bot = false): GameState {
  if (state.phase !== 'lobby') fail('Gra już się rozpoczęła.');
  if (state.players.length >= MAX_PLAYERS) fail('W grze jest już komplet graczy.');
  if (state.players.some((p) => p.id === id)) fail('Ten gracz już jest w grze.');
  const s = structuredClone(state);
  s.players.push({
    id,
    name: name.trim().slice(0, 20) || `Gracz ${s.players.length + 1}`,
    color: PLAYER_COLORS[s.players.length],
    money: START_MONEY,
    materials: { ...START_MATERIALS },
    prestige: 0,
    loans: 0,
    managers: START_MANAGERS,
    managersLeft: 0,
    hired: false,
    contracts: [],
    connected: true,
    bot,
  });
  return s;
}

export function removePlayer(state: GameState, id: string): GameState {
  if (state.phase !== 'lobby') fail('Nie można opuścić rozpoczętej gry.');
  const s = structuredClone(state);
  s.players = s.players.filter((p) => p.id !== id);
  s.players.forEach((p, i) => (p.color = PLAYER_COLORS[i]));
  return s;
}

export function setConnected(state: GameState, id: string, connected: boolean): GameState {
  const s = structuredClone(state);
  const p = s.players.find((pl) => pl.id === id);
  if (p && !p.bot) p.connected = connected;
  return s;
}

export function setRounds(state: GameState, rounds: number | null): GameState {
  if (state.phase !== 'lobby') fail('Długość gry ustawia się przed startem.');
  if (rounds !== null && !ROUND_OPTIONS.includes(rounds)) fail('Nieprawidłowa liczba rund.');
  return { ...state, roundsSetting: rounds };
}

export function startGame(state: GameState, rng: Rng = Math.random): GameState {
  if (state.phase !== 'lobby') fail('Gra już się rozpoczęła.');
  if (state.players.length < MIN_PLAYERS) fail(`Potrzeba co najmniej ${MIN_PLAYERS} graczy.`);
  const s = structuredClone(state);
  s.rounds = s.roundsSetting ?? defaultRounds(s.players.length);
  AUCTION_ORDER.slice(0, s.rounds).forEach((id, i) => (getLot(s, id)!.auctionNo = i + 1));
  s.firstPlayer = Math.floor(rng() * s.players.length);
  s.phase = 'setup';
  s.setupQueue = turnOrder(s).reverse();
  s.currentPlayer = s.setupQueue[0];
  log(s, `Gra rozpoczęta! Pierwszy gracz: ${s.players[s.firstPlayer].name}. Wybierzcie działki startowe (w odwrotnej kolejności).`);
  return s;
}

function startRound(s: GameState) {
  s.round += 1;
  s.currentNews = s.secret.newsDeck.shift() ?? null;
  const remaining = s.rounds - s.round;
  s.newsPreview = s.secret.newsDeck.slice(0, Math.min(2, remaining));
  s.buildsThisRound = Object.fromEntries(s.players.map((p) => [p.id, 0]));
  s.actionSpaces = emptySpaces();
  for (const p of s.players) p.managersLeft = p.managers;

  if (s.currentNews) {
    log(s, `📰 ${NEWS[s.currentNews].name}: ${NEWS[s.currentNews].text}`);
    const shift: Partial<Record<NewsId, [Material, number]>> = {
      boom: ['brick', 2],
      renovation: ['wood', 2],
      steelImport: ['steel', -2],
      brickGlut: ['brick', -2],
    };
    const eff = shift[s.currentNews];
    if (eff) s.prices[eff[0]] = clampPrice(s.prices[eff[0]] + eff[1]);
    if (s.currentNews === 'highDemand') for (const m of MATERIALS) s.prices[m] = clampPrice(s.prices[m] + 1);
  }

  const auctionLotId = s.lots.find((l) => l.auctionNo === s.round)?.id;
  if (auctionLotId) {
    s.phase = 'auction';
    s.auctionLot = auctionLotId;
    s.bidders = [];
    s.secret.bids = {};
    s.currentPlayer = null;
    const lot = getLot(s, auctionLotId)!;
    log(s, `🔨 Licytacja działki ${lot.id} (${TERRAIN_INFO[lot.terrain].name}). Wpiszcie ukryte oferty.`);
  } else {
    beginActions(s);
  }
}

function beginActions(s: GameState) {
  s.phase = 'actions';
  s.auctionLot = null;
  s.currentPlayer = turnOrder(s)[0];
  log(s, `Runda ${s.round}: tura ${getPlayer(s, s.currentPlayer).name}.`);
}

const clampPrice = (p: number) => Math.max(PRICE_MIN, Math.min(PRICE_MAX, p));

function resolveAuction(s: GameState) {
  const lot = getLot(s, s.auctionLot!)!;
  const order = turnOrder(s);
  let winner: string | null = null;
  let best = 0;
  for (const pid of order) {
    const bid = s.secret.bids[pid] ?? 0;
    if (bid > best) {
      best = bid;
      winner = pid;
    }
  }
  s.lastAuction = { lotId: lot.id, bids: { ...s.secret.bids }, winner };
  const reveal = order.map((pid) => `${getPlayer(s, pid).name}: ${s.secret.bids[pid] ?? 0}`).join(', ');
  if (winner) {
    const p = getPlayer(s, winner);
    p.money -= best;
    lot.owner = winner;
    log(s, `🔨 Oferty: ${reveal}. Działkę ${lot.id} wygrywa ${p.name} za ${best}.`, p.id, lot.id);
  } else {
    lot.auctionUnsold = true;
    log(s, `🔨 Oferty: ${reveal}. Nikt nie licytował — działkę ${lot.id} można kupić za 6.`);
  }
  s.secret.bids = {};
  s.bidders = [];
  beginActions(s);
}

function pay(s: GameState, p: Player, cost: Cost) {
  p.money -= cost.money ?? 0;
  for (const m of MATERIALS) p.materials[m] -= cost[m] ?? 0;
}

// Płatność obowiązkowa (odsetki, podatek): brak pieniędzy = utrata prestiżu.
function payForced(s: GameState, p: Player, amount: number, what: string) {
  if (amount <= 0) return;
  if (p.money >= amount) {
    p.money -= amount;
    return;
  }
  const missing = amount - p.money;
  p.money = 0;
  p.prestige -= missing;
  log(s, `${p.name} nie ma czym zapłacić (${what}) — traci ${missing} PP.`, p.id);
}

function useManager(s: GameState, p: Player, space: ActionSpaceId) {
  s.actionSpaces[space].push(p.id);
  p.managersLeft -= 1;
}

function advanceTurn(s: GameState) {
  const order = turnOrder(s);
  const idx = order.indexOf(s.currentPlayer!);
  for (let i = 1; i <= order.length; i++) {
    const pid = order[(idx + i) % order.length];
    if (getPlayer(s, pid).managersLeft > 0) {
      s.currentPlayer = pid;
      return;
    }
  }
  endRound(s);
}

function endRound(s: GameState) {
  s.currentPlayer = null;
  s.trades = [];
  for (const p of s.players) {
    const income = incomePreview(s, p.id);
    p.money += income.money;
    for (const m of MATERIALS) p.materials[m] += income.materials[m];
    const parts = [`+${income.money} 💰`, ...MATERIALS.filter((m) => income.materials[m]).map((m) => `+${income.materials[m]} ${MATERIAL_INFO[m].icon}`)];
    log(s, `💵 ${p.name}: dochód ${parts.join(', ')}.`, p.id);
  }
  for (const p of s.players) {
    if (s.currentNews !== 'lowRates') payForced(s, p, p.loans, 'odsetki');
    if (s.currentNews === 'propertyTax') {
      const count = s.lots.filter((l) => l.owner === p.id && l.building).length;
      payForced(s, p, Math.floor(count / 3), 'podatek');
    }
  }
  if (s.currentNews === 'archContest') {
    const best = Math.max(...Object.values(s.buildsThisRound));
    if (best > 0) {
      for (const p of s.players) {
        if (s.buildsThisRound[p.id] === best) {
          p.prestige += 3;
          log(s, `🏆 ${p.name} wygrywa konkurs architektoniczny (+3 PP).`, p.id);
        }
      }
    }
  }
  for (const m of MATERIALS) {
    const base = MATERIAL_INFO[m].basePrice;
    s.prices[m] += Math.sign(base - s.prices[m]);
  }
  if (s.nextFirstPlayer !== null) {
    s.firstPlayer = s.nextFirstPlayer;
    s.nextFirstPlayer = null;
  }
  for (const p of s.players) p.managersLeft = 0;

  if (s.round >= s.rounds) {
    s.phase = 'gameOver';
    s.currentNews = null;
    s.newsPreview = [];
    s.scores = s.players
      .map((p) => scoreFor(s, p))
      .sort((a, b) => b.total - a.total || b.money - a.money);
    log(s, `🏁 Koniec gry! Wygrywa ${getPlayer(s, s.scores[0].playerId).name} (${s.scores[0].total} pkt).`);
    return;
  }
  startRound(s);
}

function normalizeAmounts(amounts: Partial<Materials>): Materials {
  const out = { wood: 0, brick: 0, steel: 0 };
  for (const m of MATERIALS) {
    const v = amounts[m] ?? 0;
    if (!Number.isInteger(v) || v < 0) fail('Nieprawidłowa ilość.');
    out[m] = v;
  }
  return out;
}

function normalizeBundle(b: Partial<TradeBundle>): TradeBundle {
  const money = b.money ?? 0;
  if (!Number.isInteger(money) || money < 0) fail('Nieprawidłowa kwota.');
  return { money, ...normalizeAmounts(b) };
}

const bundleEmpty = (b: TradeBundle) => b.money === 0 && MATERIALS.every((m) => b[m] === 0);
const hasBundle = (p: Player, b: TradeBundle) => p.money >= b.money && MATERIALS.every((m) => p.materials[m] >= b[m]);

function transfer(from: Player, to: Player, b: TradeBundle) {
  from.money -= b.money;
  to.money += b.money;
  for (const m of MATERIALS) {
    from.materials[m] -= b[m];
    to.materials[m] += b[m];
  }
}

export function applyAction(state: GameState, playerId: string, action: Action): GameState {
  const s = structuredClone(state);
  const p = s.players.find((pl) => pl.id === playerId) ?? fail('Nie jesteś graczem w tej grze.');

  // Handel — poza kolejką, tylko w fazie akcji.
  if (action.type === 'offerTrade' || action.type === 'respondTrade' || action.type === 'cancelTrade') {
    if (s.phase !== 'actions') fail('Handlować można tylko w fazie akcji.');
    if (action.type === 'offerTrade') {
      if (action.to === p.id) fail('Nie możesz handlować sam ze sobą.');
      const other = getPlayer(s, action.to);
      const give = normalizeBundle(action.give);
      const get = normalizeBundle(action.get);
      if (bundleEmpty(give) && bundleEmpty(get)) fail('Oferta jest pusta.');
      if (!hasBundle(p, give)) fail('Nie masz tego, co oferujesz.');
      s.trades.push({ id: s.nextTradeId++, from: p.id, to: other.id, give, get });
      log(s, `🤝 ${p.name} składa ofertę wymiany graczowi ${other.name}.`, p.id);
    } else {
      const t = s.trades.find((tr) => tr.id === action.tradeId) ?? fail('Ta oferta już nie istnieje.');
      if (action.type === 'cancelTrade') {
        if (t.from !== p.id) fail('To nie twoja oferta.');
      } else {
        if (t.to !== p.id) fail('Ta oferta nie jest do ciebie.');
        if (action.accept) {
          const from = getPlayer(s, t.from);
          if (!hasBundle(from, t.give)) fail(`${from.name} nie ma już tego, co oferował.`);
          if (!hasBundle(p, t.get)) fail('Nie masz tego, o co prosi oferta.');
          transfer(from, p, t.give);
          transfer(p, from, t.get);
          log(s, `🤝 ${p.name} i ${from.name} dobili targu.`, p.id);
        } else {
          log(s, `${p.name} odrzuca ofertę gracza ${getPlayer(s, t.from).name}.`, p.id);
        }
      }
      s.trades = s.trades.filter((tr) => tr.id !== t.id);
    }
    return s;
  }

  if (action.type === 'pickStartLot') {
    if (s.phase !== 'setup') fail('To nie jest moment na wybór działki startowej.');
    if (s.currentPlayer !== p.id) fail('Poczekaj na swoją kolej.');
    const lot = getLot(s, action.lotId) ?? fail('Nie ma takiej działki.');
    if (lot.owner || lot.auctionNo !== null || !['Z', 'L', 'G'].includes(lot.terrain))
      fail('Na start wybierz wolną działkę zwykłą, las albo gliniankę (nie licytowaną).');
    lot.owner = p.id;
    log(s, `${p.name} wybiera działkę startową ${lot.id} (${TERRAIN_INFO[lot.terrain].name}).`, p.id, lot.id);
    s.setupQueue.shift();
    if (s.setupQueue.length) s.currentPlayer = s.setupQueue[0];
    else startRound(s);
    return s;
  }

  if (action.type === 'bid') {
    if (s.phase !== 'auction') fail('Teraz nie ma licytacji.');
    if (!Number.isInteger(action.amount) || action.amount < 0) fail('Oferta musi być liczbą całkowitą ≥ 0.');
    if (action.amount > p.money) fail('Nie masz tyle pieniędzy.');
    s.secret.bids[p.id] = action.amount;
    if (!s.bidders.includes(p.id)) s.bidders.push(p.id);
    if (s.bidders.length === s.players.length) resolveAuction(s);
    return s;
  }

  if (s.phase !== 'actions') fail('Teraz nie można wykonywać akcji.');
  if (s.currentPlayer !== p.id) fail('Poczekaj na swoją kolej.');
  if (p.managersLeft <= 0) fail('Nie masz wolnych menedżerów.');

  switch (action.type) {
    case 'pass': {
      p.managersLeft = 0;
      log(s, `${p.name} pasuje do końca rundy.`, p.id);
      break;
    }
    case 'buyLot': {
      if (!spaceFree(s, 'buyLot')) fail('Pole „Kup działkę” jest zajęte.');
      const lot = getLot(s, action.lotId) ?? fail('Nie ma takiej działki.');
      const price = lotPrice(s, lot) ?? fail('Ta działka nie jest na sprzedaż.');
      if (p.money < price) fail('Nie masz tyle pieniędzy.');
      p.money -= price;
      lot.owner = p.id;
      useManager(s, p, 'buyLot');
      log(s, `${p.name} kupuje działkę ${lot.id} za ${price}.`, p.id, lot.id);
      break;
    }
    case 'build': {
      const slot = buildSpace(s) ?? fail('Oba pola „Buduj” są zajęte.');
      const lot = getLot(s, action.lotId) ?? fail('Nie ma takiej działki.');
      if (lot.owner !== p.id) fail('To nie twoja działka.');
      const option = buildOptions(s, p.id, lot.id, slot.extra).find(
        (o) => o.building === action.building && (o.building !== 'public' || o.contractId === action.contractId),
      ) ?? fail('Tego nie można tu zbudować.');
      if (!canPay(p, option.cost)) fail('Brakuje zasobów.');
      pay(s, p, option.cost);
      useManager(s, p, slot.space);
      s.buildsThisRound[p.id] = (s.buildsThisRound[p.id] ?? 0) + 1;
      if (action.building === 'upgrade') {
        lot.building = { type: 'tenement' };
        log(s, `${p.name} rozbudowuje Dom na Kamienicę (${lot.id}).`, p.id, lot.id);
      } else if (action.building === 'modernize') {
        lot.building = { ...lot.building!, level: 2 };
        log(s, `${p.name} modernizuje ${buildingName(lot.building)} (${lot.id}).`, p.id, lot.id);
      } else if (action.building === 'public') {
        const c = CONTRACTS[action.contractId!];
        lot.building = { type: 'public', contractId: action.contractId };
        p.contracts = p.contracts.filter((cid) => cid !== action.contractId);
        p.money += c.rewardMoney;
        p.prestige += c.rewardPrestige;
        log(s, `${p.name} buduje ${c.name} (${lot.id}): +${c.rewardMoney} 💰, +${c.rewardPrestige} PP.`, p.id, lot.id);
      } else {
        const info = BUILDINGS[action.building];
        lot.building = { type: action.building };
        p.prestige += info.prestige ?? 0;
        log(s, `${p.name} buduje ${info.name} (${lot.id}).`, p.id, lot.id);
      }
      break;
    }
    case 'sell':
    case 'buy': {
      const space = action.type;
      if (!spaceFree(s, space)) fail('To pole akcji jest zajęte.');
      const amounts = normalizeAmounts(action.amounts);
      const units = MATERIALS.reduce((sum, m) => sum + amounts[m], 0);
      if (units === 0) fail('Wybierz co najmniej 1 sztukę.');
      if (units > MARKET_UNITS_PER_ACTION) fail(`Najwyżej ${MARKET_UNITS_PER_ACTION} sztuki na akcję.`);
      const quote = marketQuote(s.prices, amounts, space);
      if (space === 'sell') {
        if (MATERIALS.some((m) => amounts[m] > p.materials[m])) fail('Nie masz tylu materiałów.');
        for (const m of MATERIALS) p.materials[m] -= amounts[m];
        p.money += quote.total;
      } else {
        if (quote.total > p.money) fail('Nie masz tyle pieniędzy.');
        for (const m of MATERIALS) p.materials[m] += amounts[m];
        p.money -= quote.total;
      }
      s.prices = quote.prices;
      useManager(s, p, space);
      const what = MATERIALS.filter((m) => amounts[m]).map((m) => `${amounts[m]} ${MATERIAL_INFO[m].icon}`).join(', ');
      log(s, `${p.name} ${space === 'sell' ? 'sprzedaje' : 'kupuje'} ${what} za ${quote.total}.`, p.id);
      break;
    }
    case 'takeContract': {
      if (!spaceFree(s, 'townhall')) fail('Pole „Ratusz” jest zajęte.');
      if (p.contracts.length >= MAX_CONTRACTS_IN_HAND) fail(`Możesz mieć najwyżej ${MAX_CONTRACTS_IN_HAND} zlecenia.`);
      if (!s.openContracts.includes(action.contractId)) fail('Tego zlecenia nie ma na stole.');
      s.openContracts = s.openContracts.filter((c) => c !== action.contractId);
      const next = s.secret.contractDeck.shift();
      if (next) s.openContracts.push(next);
      s.contractDeckCount = s.secret.contractDeck.length;
      p.contracts.push(action.contractId);
      useManager(s, p, 'townhall');
      log(s, `${p.name} bierze zlecenie: ${CONTRACTS[action.contractId].name}.`, p.id);
      break;
    }
    case 'loan': {
      p.money += LOAN_AMOUNT;
      p.loans += 1;
      useManager(s, p, 'bank');
      log(s, `${p.name} bierze pożyczkę ${LOAN_AMOUNT}.`, p.id);
      break;
    }
    case 'repay': {
      if (p.loans === 0) fail('Nie masz pożyczek.');
      if (p.money < LOAN_AMOUNT) fail('Nie masz tyle pieniędzy.');
      p.money -= LOAN_AMOUNT;
      p.loans -= 1;
      useManager(s, p, 'bank');
      log(s, `${p.name} spłaca pożyczkę.`, p.id);
      break;
    }
    case 'hire': {
      if (!spaceFree(s, 'hire')) fail('Pole „Biuro kadr” jest zajęte.');
      if (p.hired) fail('Już zatrudniłeś dodatkowego menedżera.');
      if (p.money < HIRE_COST) fail('Nie masz tyle pieniędzy.');
      p.money -= HIRE_COST;
      p.hired = true;
      p.managers += 1;
      useManager(s, p, 'hire');
      log(s, `${p.name} zatrudnia 4. menedżera.`, p.id);
      break;
    }
    case 'takeFirstPlayer': {
      if (!spaceFree(s, 'firstPlayer')) fail('Pole „Pierwszy gracz” jest zajęte.');
      p.money += 1;
      s.nextFirstPlayer = s.players.indexOf(p);
      useManager(s, p, 'firstPlayer');
      log(s, `${p.name} zacznie następną rundę jako pierwszy (+1 💰).`, p.id);
      break;
    }
    default:
      fail('Nieznana akcja.');
  }
  advanceTurn(s);
  return s;
}

export function viewFor(state: GameState, playerId: string): GameView {
  const { secret, ...core } = state;
  return { ...structuredClone(core), me: playerId, myBid: secret.bids[playerId] ?? null };
}

