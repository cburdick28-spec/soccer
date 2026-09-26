import { Formation, LineupSlot, Player, Position, Team } from "./types";
import { defaultLineupForFormation } from "./generate";
import { playerOverall } from "./ratings";

// Which player positions are eligible (without penalty) for a given formation slot.
const COMPAT: Record<Position, Position[]> = {
  GK: ["GK"],
  CB: ["CB", "FB"],
  FB: ["FB", "CB", "WG"],
  DM: ["DM", "CM"],
  CM: ["CM", "DM", "AM"],
  AM: ["AM", "CM", "WG"],
  WG: ["WG", "AM", "ST"],
  ST: ["ST", "WG"],
};

export function isCompatible(playerPos: Position, slot: Position): boolean {
  return COMPAT[slot].includes(playerPos);
}

export function positionPenalty(playerPos: Position, slot: Position): number {
  if (playerPos === slot) return 0;
  if (isCompatible(playerPos, slot)) return 4;
  return 12;
}

export function effectiveRating(player: Player, slot: Position): number {
  const base = playerOverall(player);
  const penalty = positionPenalty(player.position, slot);
  const conditionFactor = 0.7 + 0.3 * (player.condition / 100);
  return Math.max(1, Math.round((base - penalty) * conditionFactor));
}

export function availablePlayers(players: Player[]): Player[] {
  return players.filter((p) => p.injuryWeeksLeft <= 0);
}

// Greedy best-fit auto lineup selection for AI teams (and as a helper for the user).
export function autoLineup(team: Team, squad: Player[]): { lineup: LineupSlot[]; subs: string[] } {
  const formation = team.formation;
  const slots = defaultLineupForFormation(formation);
  const pool = availablePlayers(squad);
  const used = new Set<string>();

  // Sort slots so GK/defense filled with best-fit priority order doesn't starve strikers etc.
  // Simple approach: for each slot, pick the best remaining eligible-or-close player.
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
    .sort((a, b) => playerOverall(b) - playerOverall(a))
    .slice(0, 7)
    .map((p) => p.id);

  return { lineup: slots, subs };
}
