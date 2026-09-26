// Core data model for the career-mode football sim.

export type Position = "GK" | "CB" | "LB" | "RB" | "DM" | "CM" | "AM" | "LW" | "RW" | "ST";

export interface Attributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number;
}

export interface SeasonStats {
  season: number;
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  xG: number;
  avgRating: number;
}

export type SquadStatus = "Star Player" | "Important" | "Rotation" | "Prospect";

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: Position;
  secondaryPositions: Position[];
  attributes: Attributes;
  currentRating: number; // derived overall, cached each time attributes change
  potentialRating: number; // 0-99 ceiling for overall growth
  condition: number; // 0-100 current fitness
  morale: number; // 0-100
  injuryWeeks: number; // 0 = fit
  teamId: string | null; // null = free agent
  contractYears: number;
  wage: number; // per season
  marketValue: number;
  matchForm: number[]; // last 5 match ratings (0-10), most recent last
  seasonStats: SeasonStats[];
  history: { season: number; apps: number; goals: number; assists: number }[];
  listedForTransfer?: boolean;
  isRegen?: boolean;
}

export type Mentality = "Defensive" | "Balanced" | "Attacking";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  reputation: number; // 0-100, affects AI transfer ambition/wage budget
  divisionId: number; // 1 (top) to 4 (bottom)
  transferBudget: number;
  wageBudget: number;
  formation: Formation;
  mentality: Mentality;
  lineup: LineupSlot[]; // starting XI assignment for this team's next match
  subs: string[]; // bench player ids, in priority order
  isUserTeam: boolean;
}

export type Formation = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1";

export interface LineupSlot {
  slot: Position;
  playerId: string | null;
}

export interface Coordinate {
  x: number; // 0-100, along the pitch length (0 = home team's own goal line)
  y: number; // 0-100, across the pitch width
}

export type MatchEventType = "shot" | "goal" | "card" | "injury" | "foul" | "note";

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  teamId: string;
  playerId?: string;
  text: string;
  coordinate?: Coordinate;
  xg?: number;
  onTarget?: boolean;
  cardType?: "yellow" | "red";
}

export interface LiveMatchStats {
  possession: [number, number]; // [home, away] percentage
  shots: [number, number];
  shotsOnTarget: [number, number];
  fouls: [number, number];
  cumulativeXg: [number, number][]; // one entry per minute: [homeXg, awayXg] running totals
}

export interface Fixture {
  id: string;
  divisionId: number;
  season: number;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  stats?: LiveMatchStats;
}

export interface TableRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

// --- Transfers: asynchronous, multi-stage negotiation lifecycle ---

export type TransferStage =
  | "Pending_AI_Review"
  | "Countered"
  | "Accepted"
  | "Rejected"
  | "Contract_Negotiation"
  | "Completed";

export interface TransferOffer {
  id: string;
  playerId: string;
  fromTeamId: string | null; // null when buying from free agents
  toTeamId: string; // club acquiring the player
  amount: number;
  counterAmount?: number;
  wage?: number;
  signOnFee?: number;
  squadStatusDemanded?: SquadStatus;
  stage: TransferStage;
  direction: "incoming" | "outgoing"; // relative to user team
  createdSeason: number;
  createdMatchday: number;
  log: string[]; // human-readable negotiation history
}

export interface NewsItem {
  id: string;
  season: number;
  matchday: number;
  text: string;
}

export interface DivisionHistoryEntry {
  divisionId: number;
  table: TableRow[];
  champion: string;
  promoted: string[];
  relegated: string[];
}

export interface SeasonHistoryEntry {
  season: number;
  divisions: DivisionHistoryEntry[];
  userDivision: number;
  userFinish: number;
}

export interface Career {
  id: string;
  saveName: string;
  managerName: string;
  createdAt: number;
  userTeamId: string;
  season: number;
  matchday: number; // 1-indexed next matchday to be played
  teams: Record<string, Team>;
  players: Record<string, Player>;
  fixtures: Fixture[];
  freeAgentIds: string[];
  transferOffers: TransferOffer[];
  news: NewsItem[];
  seasonHistory: SeasonHistoryEntry[];
  finances: { balance: number };
  version: 2;
}
