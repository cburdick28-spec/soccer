import { Attributes, Player, Position } from "./types";

const clamp = (n: number, lo = 0, hi = 99) => Math.max(lo, Math.min(hi, n));

// Weighted overall rating per position.
export function overallFor(position: Position, a: Attributes): number {
  const w: Record<Position, Partial<Attributes>> = {
    GK: { goalkeeping: 0.6, physical: 0.2, passing: 0.2 },
    CB: { defending: 0.5, physical: 0.3, passing: 0.2 },
    FB: { defending: 0.35, pace: 0.25, passing: 0.2, dribbling: 0.2 },
    DM: { defending: 0.35, passing: 0.35, physical: 0.3 },
    CM: { passing: 0.4, dribbling: 0.2, defending: 0.2, physical: 0.2 },
    AM: { passing: 0.3, dribbling: 0.3, shooting: 0.25, pace: 0.15 },
    WG: { pace: 0.3, dribbling: 0.3, shooting: 0.2, passing: 0.2 },
    ST: { shooting: 0.45, pace: 0.25, dribbling: 0.2, physical: 0.1 },
  };
  const weights = w[position];
  let total = 0;
  for (const key of Object.keys(weights) as (keyof Attributes)[]) {
    total += (a[key] ?? 0) * (weights[key] ?? 0);
  }
  return Math.round(clamp(total));
}

export function playerOverall(p: Player): number {
  return overallFor(p.position, p.attributes);
}

export function estimateValue(overall: number, age: number, potential: number): number {
  const ageFactor = age <= 22 ? 1.3 : age <= 27 ? 1.15 : age <= 30 ? 0.95 : age <= 33 ? 0.6 : 0.3;
  const potentialFactor = 1 + Math.max(0, potential - overall) * 0.02;
  const base = Math.pow(1.11, overall) * 900;
  return Math.round(base * ageFactor * potentialFactor / 1000) * 1000;
}

export function estimateWage(overall: number, age: number): number {
  const ageFactor = age <= 30 ? 1 : 0.75;
  return Math.round((Math.pow(1.09, overall) * 300 * ageFactor) / 50) * 50;
}

export function attackWeight(position: Position): number {
  return { GK: 0, CB: 0.1, FB: 0.3, DM: 0.2, CM: 0.4, AM: 0.75, WG: 0.85, ST: 1 }[position];
}

export function defenseWeight(position: Position): number {
  return { GK: 1, CB: 1, FB: 0.8, DM: 0.85, CM: 0.55, AM: 0.25, WG: 0.2, ST: 0.1 }[position];
}

export { clamp };
