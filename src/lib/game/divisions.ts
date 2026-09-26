import { Career, Team } from "./types";

export const DIVISION_COUNT = 4;
export const TEAMS_PER_DIVISION = 16;
export const PROMOTE_RELEGATE_COUNT = 3;

export function divisionName(id: number): string {
  return ["", "Premier Division", "Championship", "League One", "League Two"][id] ?? `Division ${id}`;
}

export function teamsInDivision(career: Career, divisionId: number): Team[] {
  return Object.values(career.teams).filter((t) => t.divisionId === divisionId);
}

export function teamIdsInDivision(career: Career, divisionId: number): string[] {
  return teamsInDivision(career, divisionId).map((t) => t.id);
}
