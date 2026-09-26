import { Coordinate, Fixture, LiveMatchStats, MatchEvent, Player, Team } from "./types";
import { attackWeight, defenseWeight, midfieldWeight } from "./ratings";
import { effectiveRating } from "./lineup";

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

interface Thirds {
  attack: number;
  midfield: number;
  defense: number;
  gk: Player | null;
}

const MENTALITY_MODIFIER: Record<Team["mentality"], { attack: number; defense: number }> = {
  Attacking: { attack: 1.15, defense: 0.85 },
  Balanced: { attack: 1.0, defense: 1.0 },
  Defensive: { attack: 0.85, defense: 1.15 },
};

function teamThirds(team: Team, players: Record<string, Player>): Thirds {
  let attack = 0, midfield = 0, defense = 0, n = 0;
  let gk: Player | null = null;
  for (const slot of team.lineup) {
    if (!slot.playerId) continue;
    const p = players[slot.playerId];
    if (!p) continue;
    const rating = effectiveRating(p, slot.slot);
    attack += rating * attackWeight(slot.slot);
    midfield += rating * midfieldWeight(slot.slot);
    defense += rating * defenseWeight(slot.slot);
    if (slot.slot === "GK") gk = p;
    n++;
  }
  if (n === 0) return { attack: 40, midfield: 40, defense: 40, gk };
  const mod = MENTALITY_MODIFIER[team.mentality];
  return {
    attack: (attack / n) * mod.attack,
    midfield: midfield / n,
    defense: (defense / n) * mod.defense,
    gk,
  };
}

function pickShooter(team: Team, players: Record<string, Player>): Player | null {
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

function shotCoordinate(isHomeAttacking: boolean, quality: number): Coordinate {
  // Attacking direction: home attacks toward x=100, away attacks toward x=0.
  // Higher-quality chances cluster closer to goal and more central.
  const depth = Math.min(34, 12 + quality * 0.5); // how far out the shot can come from
  const xOffset = rand(0, depth);
  const x = isHomeAttacking ? 100 - xOffset : xOffset;
  const centerBias = Math.max(6, 30 - quality * 0.25);
  const y = clampNum(50 + rand(-centerBias, centerBias), 2, 98);
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function clampNum(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  stats: LiveMatchStats;
  injuries: { playerId: string; weeks: number }[];
  conditionDelta: Record<string, number>;
  formDelta: Record<string, number>; // match rating 0-10 to push into matchForm
}

export function simulateMatch(home: Team, away: Team, players: Record<string, Player>): MatchResult {
  const h = teamThirds(home, players);
  const a = teamThirds(away, players);

  const HOME_ADV = 1.1;
  const homeChanceBase = clampNum(
    0.11 * ((h.attack + h.midfield * 0.4) / Math.max(20, a.defense + a.midfield * 0.25)) * HOME_ADV,
    0.02, 0.32
  );
  const awayChanceBase = clampNum(
    0.11 * ((a.attack + a.midfield * 0.4) / Math.max(20, h.defense + h.midfield * 0.25)),
    0.02, 0.32
  );

  const events: MatchEvent[] = [];
  let homeGoals = 0, awayGoals = 0;
  let homeShots = 0, awayShots = 0, homeSOT = 0, awaySOT = 0, homeFouls = 0, awayFouls = 0;
  let homeXg = 0, awayXg = 0;
  const cumulativeXg: [number, number][] = [];

  for (let minute = 1; minute <= 90; minute++) {
    // Home chance
    if (Math.random() < homeChanceBase) {
      const res = resolveChance(true, home, away, h, a, players);
      if (res) {
        events.push(res.event);
        homeShots++;
        homeXg += res.xg;
        if (res.onTarget) homeSOT++;
        if (res.goal) homeGoals++;
      }
    }
    // Away chance
    if (Math.random() < awayChanceBase) {
      const res = resolveChance(false, away, home, a, h, players);
      if (res) {
        events.push(res.event);
        awayShots++;
        awayXg += res.xg;
        if (res.onTarget) awaySOT++;
        if (res.goal) awayGoals++;
      }
    }
    // Fouls / cards
    if (Math.random() < 0.018) {
      const foulingHome = Math.random() < 0.5;
      const team = foulingHome ? home : away;
      const outfield = team.lineup.filter((s) => s.playerId && s.slot !== "GK");
      const slot = outfield[Math.floor(Math.random() * outfield.length)];
      const player = slot?.playerId ? players[slot.playerId] : null;
      if (foulingHome) homeFouls++; else awayFouls++;
      if (player) {
        const cardRoll = Math.random();
        if (cardRoll < 0.02) {
          events.push({ minute, type: "card", teamId: team.id, playerId: player.id, text: `RED CARD! ${player.name} is sent off for ${team.shortName}.`, cardType: "red", coordinate: { x: rand(20, 80), y: rand(10, 90) } });
        } else if (cardRoll < 0.16) {
          events.push({ minute, type: "card", teamId: team.id, playerId: player.id, text: `${player.name} picks up a yellow card.`, cardType: "yellow", coordinate: { x: rand(20, 80), y: rand(10, 90) } });
        } else {
          events.push({ minute, type: "foul", teamId: team.id, playerId: player.id, text: `Foul by ${player.name}.`, coordinate: { x: rand(20, 80), y: rand(10, 90) } });
        }
      }
    }
    cumulativeXg.push([Math.round(homeXg * 100) / 100, Math.round(awayXg * 100) / 100]);
  }

  events.sort((x, y) => x.minute - y.minute);

  // Injuries: small chance per starter across the match.
  const injuries: { playerId: string; weeks: number }[] = [];
  for (const team of [home, away]) {
    for (const slot of team.lineup) {
      if (!slot.playerId) continue;
      if (Math.random() < 0.012) {
        const weeks = Math.ceil(Math.random() * 4);
        injuries.push({ playerId: slot.playerId, weeks });
        const p = players[slot.playerId];
        const minute = Math.ceil(Math.random() * 90);
        events.push({
          minute,
          type: "injury",
          teamId: team.id,
          playerId: slot.playerId,
          text: `${p?.name ?? "A player"} goes down with an injury and will be out for a spell.`,
          coordinate: { x: rand(10, 90), y: rand(10, 90) },
        });
      }
    }
  }
  events.sort((x, y) => x.minute - y.minute);

  const totalStrength = h.attack + h.midfield + a.attack + a.midfield || 1;
  const homePossession = clampNum(Math.round(((h.attack + h.midfield) / totalStrength) * 100), 30, 70);

  const stats: LiveMatchStats = {
    possession: [homePossession, 100 - homePossession],
    shots: [homeShots, awayShots],
    shotsOnTarget: [homeSOT, awaySOT],
    fouls: [homeFouls, awayFouls],
    cumulativeXg,
  };

  // Condition + basic match-rating (form) for anyone who started.
  const conditionDelta: Record<string, number> = {};
  const formDelta: Record<string, number> = {};
  for (const team of [home, away]) {
    const teamGoals = team === home ? homeGoals : awayGoals;
    const oppGoals = team === home ? awayGoals : homeGoals;
    for (const slot of team.lineup) {
      if (!slot.playerId) continue;
      conditionDelta[slot.playerId] = -(12 + Math.round(Math.random() * 8));
      const scored = events.filter((e) => e.type === "goal" && e.playerId === slot.playerId).length;
      const base = 6 + (teamGoals - oppGoals) * 0.3 + scored * 1.2;
      formDelta[slot.playerId] = clampNum(Math.round((base + rand(-1, 1)) * 10) / 10, 2, 10);
    }
    for (const id of team.subs) conditionDelta[id] = 3;
  }

  return { homeGoals, awayGoals, events, stats, injuries, conditionDelta, formDelta };
}

function resolveChance(
  isHomeAttacking: boolean,
  attackingTeam: Team,
  defendingTeam: Team,
  attackingThirds: Thirds,
  defendingThirds: Thirds,
  players: Record<string, Player>
): { event: MatchEvent; xg: number; onTarget: boolean; goal: boolean } | null {
  const shooter = pickShooter(attackingTeam, players);
  if (!shooter) return null;
  const gk = defendingThirds.gk;

  const shotQuality = shooter.attributes.shooting * 0.55 + shooter.attributes.dribbling * 0.2 + attackingThirds.attack * 0.25;
  const defenderStrength = defendingThirds.defense * 0.75 + (gk?.attributes.goalkeeping ?? 50) * 0.25;
  const qualityDiff = shotQuality - defenderStrength;

  let xg = clampNum((0.24 + qualityDiff / 160) * rand(0.55, 1.35), 0.02, 0.85);
  xg = Math.round(xg * 1000) / 1000;

  const onTargetProb = clampNum(0.35 + (shooter.attributes.shooting - 50) / 220, 0.2, 0.75);
  const onTarget = Math.random() < onTargetProb;
  let goal = false;
  if (onTarget) {
    const goalProb = clampNum(xg * 2.1 - ((gk?.attributes.goalkeeping ?? 50) - 50) / 160, 0.04, 0.92);
    goal = Math.random() < goalProb;
  }

  const minute = Math.ceil(Math.random() * 90);
  const coordinate = shotCoordinate(isHomeAttacking, shotQuality);

  let text: string;
  let type: MatchEvent["type"] = "shot";
  if (goal) {
    type = "goal";
    text = `GOAL! ${shooter.name} finds the net for ${attackingTeam.shortName}! (xG ${xg.toFixed(2)})`;
  } else if (onTarget) {
    text = `${shooter.name} forces a save for ${attackingTeam.shortName}. (xG ${xg.toFixed(2)})`;
  } else {
    text = `${shooter.name} fires wide for ${attackingTeam.shortName}. (xG ${xg.toFixed(2)})`;
  }

  return {
    event: { minute, type, teamId: attackingTeam.id, playerId: shooter.id, text, coordinate, xg, onTarget },
    xg,
    onTarget,
    goal,
  };
}

export function applyResultToFixture(fixture: Fixture, result: MatchResult): Fixture {
  return {
    ...fixture,
    played: true,
    homeGoals: result.homeGoals,
    awayGoals: result.awayGoals,
    events: result.events,
    stats: result.stats,
  };
}
