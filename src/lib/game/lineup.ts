import { Formation, LineupSlot, Player, Position, Team } from "./types";
import { defaultLineupForFormation } from "./generate";

// Which player positions are eligible (without heavy penalty) for a given formation slot.
const COMPAT: Record<Position, Position[]> = {
  GK: ["GK"],
  CB: ["CB", "LB", "RB"],
  LB: ["LB", "CB", "LW"],
  RB: ["RB", "CB", "RW"],
  DM: ["DM", "CM"],
  CM: ["CM", "DM", "AM"],
  AM: ["AM", "CM", "LW", "RW"],
  LW: ["LW", "AM", "ST", "LB"],
  RW: ["RW", "AM", "ST", "RB"],
  ST: ["ST", "LW", "RW"],
};

export function isCompatible(playerPos: Position, slot: Position): boolean {
  return COMPAT[slot].includes(playerPos);
}

export function positionPenalty(playerPos: Position, slot: Position): number {
  if (playerPos === slot) return 0;
  if (isCompatible(playerPos, slot)) return 4;
  // opposite-flank penalty is smaller than a totally foreign role
  const flankPairs: [Position, Position][] = [["LB", "RB"], ["LW", "RW"]];
  if (flankPairs.some(([a, b]) => (playerPos === a && slot === b) || (playerPos === b && slot === a))) return 8;
  return 12;
}

export function effectiveRating(player: Player, slot: Position): number {
  const base = player.currentRating;
  const penalty = positionPenalty(player.position, slot);
  const conditionFactor = 0.7 + 0.3 * (player.condition / 100);
  return Math.max(1, Math.round((base - penalty) * conditionFactor));
}

export function availablePlayers(players: Player[]): Player[] {
  return players.filter((p) => p.injuryWeeks <= 0);
}

// Greedy best-fit auto lineup selection for AI teams (and as a helper for the user).
export function autoLineup(team: Team, squad: Player[]): { lineup: LineupSlot[]; subs: string[] } {
  const formation = team.formation;
  const slots = defaultLineupForFormation(formation);
  const pool = availablePlayers(squad);
  const used = new Set<string>();

  for (const s of slots) {
    let best: Player | null = null;
    let bestScore = -Infinity;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const score = effectiveRating(p, s.slot);
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (best) { s.playerId = best.id; used.add(best.id); }
  }

  const subs = pool
    .filter((p) => !used.has(p.id))
    .sort((a, b) => b.currentRating - a.currentRating)
    .slice(0, 7)
    .map((p) => p.id);

  return { lineup: slots, subs };
}
