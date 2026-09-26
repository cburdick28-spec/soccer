import { Career, Team } from "./types";

export const DIVISION_COUNT = 4;
// Division 1 is the real Premier League (20 clubs); the fictional pyramid below it
// runs 16 clubs per division, same as before.
export const DIVISION_SIZES: Record<number, number> = { 1: 20, 2: 16, 3: 16, 4: 16 };
export const TEAMS_PER_DIVISION = 16; // default size for the fictional divisions (2-4)
export const PROMOTE_RELEGATE_COUNT = 3;

export function divisionName(id: number): string {
  return ["", "Premier League", "Championship", "League One", "League Two"][id] ?? `Division ${id}`;
}

export function teamsInDivision(career: Career, divisionId: number): Team[] {
  return Object.values(career.teams).filter((t) => t.divisionId === divisionId);
}

export function teamIdsInDivision(career: Career, divisionId: number): string[] {
  return teamsInDivision(career, divisionId).map((t) => t.id);
}
