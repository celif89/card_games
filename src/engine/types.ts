import type { ActionSpaceId, BuildingType, Material, NewsId, Terrain } from './data.ts';

export type Materials = Record<Material, number>;

export interface Building {
  type: BuildingType;
  contractId?: string;
  // 2 = zmodernizowany budynek produkcyjny.
  level?: number;
}

export interface Lot {
  id: string;
  x: number;
  y: number;
  terrain: Terrain;
  owner: string | null;
  building: Building | null;
  auctionNo: number | null;
  // Działka licytowana, której nikt nie kupił — można ją kupić normalnie.
  auctionUnsold: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  money: number;
  materials: Materials;
  prestige: number;
  loans: number;
  managers: number;
  managersLeft: number;
  hired: boolean;
  contracts: string[];
  connected: boolean;
  bot: boolean;
}

export interface TradeOffer {
  id: number;
  from: string;
  to: string;
  give: TradeBundle;
  get: TradeBundle;
}

export type TradeBundle = { money: number } & Materials;

export interface AuctionResult {
  lotId: string;
  bids: Record<string, number>;
  winner: string | null;
}

export interface ScoreLine {
  playerId: string;
  money: number;
  buildings: number;
  emptyLots: number;
  prestige: number;
  materials: number;
  loans: number;
  contracts: number;
  district: number;
  total: number;
}

export type Phase = 'lobby' | 'setup' | 'auction' | 'actions' | 'gameOver';

export interface LogEntry {
  round: number;
  text: string;
  // Kto wykonał ruch i której działki dotyczył (do podświetlania).
  player?: string;
  lot?: string;
}

// Wszystko, co widzą wszyscy gracze.
export interface GameCore {
  phase: Phase;
  round: number;
  rounds: number;
  // Długość gry wybrana w poczekalni (null = domyślna dla liczby graczy).
  roundsSetting: number | null;
  players: Player[];
  firstPlayer: number;
  nextFirstPlayer: number | null;
  currentPlayer: string | null;
  setupQueue: string[];
  lots: Lot[];
  prices: Record<Material, number>;
  currentNews: NewsId | null;
  newsPreview: NewsId[];
  openContracts: string[];
  contractDeckCount: number;
  actionSpaces: Record<ActionSpaceId, string[]>;
  auctionLot: string | null;
  bidders: string[];
  lastAuction: AuctionResult | null;
  buildsThisRound: Record<string, number>;
  trades: TradeOffer[];
  nextTradeId: number;
  log: LogEntry[];
  scores: ScoreLine[] | null;
}

// Informacje ukryte — zostają na serwerze.
export interface GameSecret {
  bids: Record<string, number>;
  newsDeck: NewsId[];
  contractDeck: string[];
}

export interface GameState extends GameCore {
  secret: GameSecret;
}

// To, co dostaje konkretny gracz.
export interface GameView extends GameCore {
  me: string;
  myBid: number | null;
}

export type Action =
  | { type: 'pickStartLot'; lotId: string }
  | { type: 'bid'; amount: number }
  | { type: 'buyLot'; lotId: string }
  | { type: 'build'; lotId: string; building: BuildingType | 'upgrade' | 'modernize'; contractId?: string }
  | { type: 'sell'; amounts: Partial<Materials> }
  | { type: 'buy'; amounts: Partial<Materials> }
  | { type: 'takeContract'; contractId: string }
  | { type: 'loan' }
  | { type: 'repay' }
  | { type: 'hire' }
  | { type: 'takeFirstPlayer' }
  | { type: 'pass' }
  | { type: 'offerTrade'; to: string; give: Partial<TradeBundle>; get: Partial<TradeBundle> }
  | { type: 'respondTrade'; tradeId: number; accept: boolean }
  | { type: 'cancelTrade'; tradeId: number };
