// Stałe gry: mapa, budynki, zlecenia, wiadomości. Liczby zgodne z docs/ZASADY.md.

export type Material = 'wood' | 'brick' | 'steel';
export const MATERIALS: Material[] = ['wood', 'brick', 'steel'];

export type Terrain = 'Z' | 'L' | 'G' | 'P' | 'C';

export type BuildingType =
  | 'sawmill'
  | 'brickworks'
  | 'steelworks'
  | 'house'
  | 'tenement'
  | 'office'
  | 'park'
  | 'public';

export type Cost = { money?: number } & Partial<Record<Material, number>>;

// Długość gry do wyboru w poczekalni; domyślnie zależy od liczby graczy.
export const ROUND_OPTIONS = [8, 10, 12, 14];
export const defaultRounds = (players: number) => (players <= 2 ? 14 : players === 3 ? 12 : 10);
export const START_MONEY = 15;
export const START_MATERIALS: Record<Material, number> = { wood: 2, brick: 1, steel: 0 };
export const START_MANAGERS = 3;
export const HIRE_COST = 6;
export const LOAN_AMOUNT = 10;
export const LOAN_PENALTY = 12;
export const MAX_CONTRACTS_IN_HAND = 2;
export const UNFINISHED_CONTRACT_PENALTY = 3;
export const MARKET_UNITS_PER_ACTION = 4;
export const UNSOLD_AUCTION_LOT_PRICE = 6;
export const EMPTY_LOT_VALUE = 2;

export const MATERIAL_INFO: Record<Material, { name: string; icon: string; basePrice: number }> = {
  wood: { name: 'Drewno', icon: '🪵', basePrice: 3 },
  brick: { name: 'Cegła', icon: '🧱', basePrice: 4 },
  steel: { name: 'Stal', icon: '🔩', basePrice: 6 },
};
export const PRICE_MIN = 1;
export const PRICE_MAX = 10;

export const TERRAIN_INFO: Record<Terrain, { name: string; price: number | null }> = {
  Z: { name: 'Zwykła', price: 3 },
  L: { name: 'Las', price: 4 },
  G: { name: 'Glinianka', price: 4 },
  P: { name: 'Przemysłowa', price: 5 },
  C: { name: 'Centrum', price: null },
};

// Wiersze 1–6, kolumny A–F.
export const MAP: string[] = [
  'LLZZGG',
  'LZZZZG',
  'ZZCCZP',
  'ZZCCZP',
  'GZZZZP',
  'GZZZLL',
];

// Działki licytowane, w kolejności rund (w grze licytuje się tyle pierwszych, ile jest rund).
export const AUCTION_ORDER: string[] = ['C3', 'F4', 'D3', 'A5', 'C4', 'B1', 'D4', 'F5', 'E4', 'F3', 'B3', 'E6', 'C2', 'D5'];

export interface BuildingInfo {
  name: string;
  icon: string;
  terrains: Terrain[];
  cost: Cost;
  produces?: Partial<Record<Material, number>>;
  rent?: number;
  value: number;
  prestige?: number;
  residential?: boolean;
  noisy?: boolean;
}

export const BUILDINGS: Record<Exclude<BuildingType, 'public'>, BuildingInfo> = {
  sawmill: { name: 'Tartak', icon: '🪚', terrains: ['L'], cost: { money: 4, brick: 1 }, produces: { wood: 2 }, value: 3 },
  brickworks: { name: 'Cegielnia', icon: '🧱', terrains: ['G'], cost: { money: 4, wood: 2 }, produces: { brick: 2 }, value: 3, noisy: true },
  steelworks: { name: 'Huta', icon: '🏭', terrains: ['P'], cost: { money: 6, brick: 2, wood: 1 }, produces: { steel: 1 }, value: 4, noisy: true },
  house: { name: 'Dom', icon: '🏠', terrains: ['Z', 'C'], cost: { wood: 2, brick: 1 }, rent: 2, value: 4, residential: true },
  tenement: { name: 'Kamienica', icon: '🏢', terrains: ['Z', 'C'], cost: { wood: 1, brick: 3, steel: 1 }, rent: 4, value: 8, residential: true },
  office: { name: 'Biurowiec', icon: '🏙️', terrains: ['C'], cost: { brick: 3, steel: 3 }, rent: 7, value: 14 },
  park: { name: 'Park', icon: '🌳', terrains: ['Z'], cost: { money: 3 }, value: 0, prestige: 2 },
};

export const UPGRADE_COST: Cost = { brick: 2, steel: 1 };

// Modernizacja budynku produkcyjnego (raz na budynek): +1 produkcji, +3 do wartości na koniec gry.
export type ProductionType = 'sawmill' | 'brickworks' | 'steelworks';
export const MODERNIZATION: Record<ProductionType, { cost: Cost; extraProduction: number; extraValue: number }> = {
  sawmill: { cost: { money: 3, brick: 2 }, extraProduction: 1, extraValue: 3 },
  brickworks: { cost: { money: 3, wood: 2 }, extraProduction: 1, extraValue: 3 },
  steelworks: { cost: { money: 5, brick: 2, wood: 1 }, extraProduction: 1, extraValue: 3 },
};
export const isProduction = (t: BuildingType): t is ProductionType => t in MODERNIZATION;

// Premia na koniec gry za największe osiedle (grupę stykających się bokami działek).
export const DISTRICT_POINTS_PER_LOT = 1;

export interface ContractInfo {
  name: string;
  icon: string;
  terrains: Terrain[];
  cost: Cost;
  rewardMoney: number;
  rewardPrestige: number;
}

// Nagroda ≈ 1,3 × wartość materiałów po cenie bazowej (+1).
export const CONTRACTS: Record<string, ContractInfo> = {
  boisko: { name: 'Boisko', icon: '⚽', terrains: ['Z'], cost: { wood: 2 }, rewardMoney: 4, rewardPrestige: 5 },
  remiza: { name: 'Remiza', icon: '🚒', terrains: ['Z'], cost: { wood: 2, brick: 2 }, rewardMoney: 9, rewardPrestige: 10 },
  przedszkole: { name: 'Przedszkole', icon: '🧸', terrains: ['Z'], cost: { wood: 3, brick: 2 }, rewardMoney: 10, rewardPrestige: 13 },
  szkola: { name: 'Szkoła', icon: '🏫', terrains: ['Z'], cost: { wood: 2, brick: 3, steel: 1 }, rewardMoney: 14, rewardPrestige: 18 },
  przychodnia: { name: 'Przychodnia', icon: '🩺', terrains: ['Z', 'C'], cost: { wood: 1, brick: 2, steel: 2 }, rewardMoney: 14, rewardPrestige: 17 },
  biblioteka: { name: 'Biblioteka', icon: '📚', terrains: ['C'], cost: { wood: 1, brick: 3, steel: 1 }, rewardMoney: 13, rewardPrestige: 15 },
  basen: { name: 'Basen', icon: '🏊', terrains: ['Z'], cost: { brick: 4, steel: 2 }, rewardMoney: 17, rewardPrestige: 20 },
  dworzec: { name: 'Dworzec', icon: '🚉', terrains: ['Z'], cost: { brick: 3, steel: 3 }, rewardMoney: 18, rewardPrestige: 22 },
  ratusz: { name: 'Ratusz-filia', icon: '🏤', terrains: ['C'], cost: { wood: 2, brick: 2, steel: 2 }, rewardMoney: 16, rewardPrestige: 19 },
  kosciol: { name: 'Kościół', icon: '⛪', terrains: ['Z'], cost: { wood: 1, brick: 5 }, rewardMoney: 14, rewardPrestige: 17 },
  targowisko: { name: 'Targowisko', icon: '🧺', terrains: ['Z'], cost: { wood: 3, brick: 1 }, rewardMoney: 8, rewardPrestige: 10 },
  muzeum: { name: 'Muzeum', icon: '🖼️', terrains: ['C'], cost: { brick: 4, steel: 3 }, rewardMoney: 20, rewardPrestige: 25 },
};

// Wielkie inwestycje: widoczne od początku, każdą może zbudować tylko jeden gracz (kto pierwszy, ten lepszy).
// Nie trzeba ich brać w Ratuszu — buduje się je od razu akcją Buduj. Nagroda ≈ wartość materiałów po cenie bazowej.
export const BIG_PROJECTS: Record<string, ContractInfo> = {
  stadion: { name: 'Stadion', icon: '🏟️', terrains: ['Z'], cost: { wood: 6, brick: 6, steel: 2 }, rewardMoney: 27, rewardPrestige: 27 },
  szpital: { name: 'Szpital', icon: '🏥', terrains: ['Z', 'C'], cost: { wood: 2, brick: 6, steel: 4 }, rewardMoney: 27, rewardPrestige: 27 },
  uniwersytet: { name: 'Uniwersytet', icon: '🎓', terrains: ['Z'], cost: { wood: 4, brick: 8, steel: 2 }, rewardMoney: 28, rewardPrestige: 28 },
  ratuszMiejski: { name: 'Ratusz miejski', icon: '🏛️', terrains: ['C'], cost: { wood: 4, brick: 6, steel: 4 }, rewardMoney: 30, rewardPrestige: 30 },
};

// Zlecenie albo wielka inwestycja — po identyfikatorze.
export const projectInfo = (id: string): ContractInfo => CONTRACTS[id] ?? BIG_PROJECTS[id];

export const OPEN_CONTRACTS = 4;

export type NewsId =
  | 'boom'
  | 'renovation'
  | 'steelImport'
  | 'housingSubsidy'
  | 'strike'
  | 'lowRates'
  | 'busLine'
  | 'propertyTax'
  | 'archContest'
  | 'openDay'
  | 'roadworks'
  | 'highDemand'
  | 'brickGlut'
  | 'festival'
  | 'quiet';

export const NEWS: Record<NewsId, { name: string; text: string }> = {
  boom: { name: 'Boom budowlany', text: 'Cena cegły rośnie o 2.' },
  renovation: { name: 'Sezon remontów', text: 'Cena drewna rośnie o 2.' },
  steelImport: { name: 'Tania stal z importu', text: 'Cena stali spada o 2.' },
  housingSubsidy: { name: 'Dotacja mieszkaniowa', text: 'Każdy Dom daje w tej rundzie czynsz +1.' },
  strike: { name: 'Strajk w hucie', text: 'Huty nic nie produkują w tej rundzie.' },
  lowRates: { name: 'Niskie stopy', text: 'W tej rundzie nie płaci się odsetek od pożyczek.' },
  busLine: { name: 'Nowa linia autobusowa', text: 'Działki zwykłe kosztują w tej rundzie 2.' },
  propertyTax: { name: 'Podatek od nieruchomości', text: 'Na koniec rundy płacisz 1 monetę za każde pełne 3 budynki.' },
  archContest: { name: 'Konkurs architektoniczny', text: 'Kto w tej rundzie postawi najwięcej budynków, dostaje 3 PP (remis: wszyscy).' },
  openDay: { name: 'Dzień otwarty', text: 'Każdy Park daje właścicielowi 2 monety.' },
  roadworks: { name: 'Remont drogi', text: 'Wszystkie działki kosztują w tej rundzie o 1 więcej.' },
  highDemand: { name: 'Rekordowe zamówienia', text: 'Ceny wszystkich materiałów rosną o 1.' },
  brickGlut: { name: 'Nadwyżka cegły', text: 'Cena cegły spada o 2.' },
  festival: { name: 'Festyn miejski', text: 'Każdy budynek publiczny daje właścicielowi 2 monety.' },
  quiet: { name: 'Spokojny kwartał', text: 'Nic szczególnego się nie dzieje.' },
};

export type ActionSpaceId = 'buyLot' | 'build' | 'build2' | 'sell' | 'buy' | 'townhall' | 'bank' | 'hire' | 'firstPlayer';

// Pojemność: [2 graczy, 3–4 graczy]. null = bez limitu.
export const ACTION_SPACES: { id: ActionSpaceId; name: string; capacity: [number | null, number | null]; text: string }[] = [
  { id: 'buyLot', name: 'Kup działkę', capacity: [1, 2], text: 'Kup 1 wolną działkę.' },
  { id: 'build', name: 'Buduj', capacity: [1, 2], text: 'Zbuduj lub rozbuduj 1 budynek.' },
  { id: 'build2', name: 'Buduj (+1 moneta)', capacity: [1, 1], text: 'Jak Buduj, ale drożej o 1 monetę.' },
  { id: 'sell', name: 'Sprzedaj', capacity: [1, 2], text: 'Sprzedaj do 4 sztuk materiałów.' },
  { id: 'buy', name: 'Kup materiały', capacity: [1, 1], text: 'Kup do 4 sztuk materiałów.' },
  { id: 'townhall', name: 'Ratusz', capacity: [1, 2], text: 'Weź 1 Zlecenie (najwyżej 2 na ręce).' },
  { id: 'bank', name: 'Bank', capacity: [null, null], text: 'Pożyczka 10 monet albo spłata 10.' },
  { id: 'hire', name: 'Biuro kadr', capacity: [1, 1], text: 'Zatrudnij 4. menedżera za 6 (od następnej rundy).' },
  { id: 'firstPlayer', name: 'Pierwszy gracz', capacity: [1, 1], text: 'Zacznij następną rundę jako pierwszy, +1 moneta.' },
];

export const PLAYER_COLORS = ['#e4572e', '#2e86ab', '#f3a712', '#7b2d8b'];
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
