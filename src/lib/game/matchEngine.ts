import { Fixture, MatchEvent, Player, Team } from "./types";
import { attackWeight, defenseWeight } from "./ratings";
import { effectiveRating } from "./lineup";

function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function teamStrengths(team: Team, players: Record<string, Player>) {
  let attack = 0;
  let defense = 0;
  let n = 0;
  for (const slot of team.lineup) {
    if (!slot.playerId) continue;
    const p = players[slot.playerId];
    if (!p) continue;
    const rating = effectiveRating(p, slot.slot);
    attack += rating * attackWeight(slot.slot);
    defense += rating * defenseWeight(slot.slot);
    n++;
  }
  if (n === 0) return { attack: 40, defense: 40 };
  return { attack: attack / n, defense: defense / n };
}

function pickScorer(team: Team, players: Record<string, Player>): Player | null {
  const candidates: { p: Player; w: number }[] = [];
  for (const slot of team.lineup) {
    if (!slot.playerId) continue;
    const p = players[slot.playerId];
    if (!p) continue;
    const w = Math.pow(attackWeight(slot.slot) + 0.05, 2) * (p.attributes.shooting + p.attributes.pace) / 2;
    candidates.push({ p, w: Math.max(0.5, w) });
  }
  const total = candidates.reduce((s, c) => s + c.w, 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const c of candidates) {
    if (r < c.w) return c.p;
    r -= c.w;
  }
  return candidates[candidates.length - 1]?.p ?? null;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  injuries: { playerId: string; weeks: number }[];
  conditionDelta: Record<string, number>;
}

export function simulateMatch(home: Team, away: Team, players: Record<string, Player>): MatchResult {
  const h = teamStrengths(home, players);
  const a = teamStrengths(away, players);

  const HOME_ADV = 1.12;
  const BASE = 1.35;
  const xgHome = BASE * (h.attack / Math.max(20, a.defense)) * HOME_ADV;
  const xgAway = BASE * (a.attack / Math.max(20, h.defense));

  const homeGoals = Math.min(9, poissonSample(Math.max(0.15, xgHome)));
  const awayGoals = Math.min(9, poissonSample(Math.max(0.15, xgAway)));

  const events: MatchEvent[] = [];
  const minutesPool = Array.from({ length: 90 }, (_, i) => i + 1);

  function scoreGoals(count: number, team: Team, opp: Team) {
    for (let i = 0; i < count; i++) {
      const minute = minutesPool.splice(Math.floor(Math.random() * minutesPool.length), 1)[0] ?? 90;
      const scorer = pickScorer(team, players);
      const text = scorer
        ? `GOAL! ${scorer.name} finds the net for ${team.shortName}. ${team.name} ${team === home ? homeGoals : awayGoals}-vs-${opp.name}.`
        : `GOAL for ${team.shortName}.`;
      events.push({ minute, type: "goal", teamId: team.id, playerId: scorer?.id, text });
    }
  }
  scoreGoals(homeGoals, home, away);
  scoreGoals(awayGoals, away, home);
  events.sort((x, y) => x.minute - y.minute);

  // Injuries: small chance per starter.
  const injuries: { playerId: string; weeks: number }[] = [];
  for (const team of [home, away]) {
    for (const slot of team.lineup) {
      if (!slot.playerId) continue;
      if (Math.random() < 0.012) {
        const weeks = Math.ceil(Math.random() * 4);
        injuries.push({ playerId: slot.playerId, weeks });
        const p = players[slot.playerId];
        events.push({
          minute: Math.ceil(Math.random() * 90),
          type: "injury",
          teamId: team.id,
          playerId: slot.playerId,
          text: `${p?.name ?? "A player"} goes down with an injury and will be out for a spell.`,
        });
      }
    }
  }
  events.sort((x, y) => x.minute - y.minute);

  // Condition cost for anyone who started.
  const conditionDelta: Record<string, number> = {};
  for (const team of [home, away]) {
    for (const slot of team.lineup) {
      if (slot.playerId) conditionDelta[slot.playerId] = -(12 + Math.round(Math.random() * 8));
    }
    for (const id of team.subs) conditionDelta[id] = 3; // bench recovers slightly
  }

  return { homeGoals, awayGoals, events, injuries, conditionDelta };
}

export function applyResultToFixture(fixture: Fixture, result: MatchResult): Fixture {
  return {
    ...fixture,
    played: true,
    homeGoals: result.homeGoals,
    awayGoals: result.awayGoals,
    events: result.events,
  };
}
