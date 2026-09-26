import { nanoid } from "nanoid";
import { Fixture } from "./types";

// Standard circle-method double round robin scheduler for a single division.
export function generateDoubleRoundRobin(teamIds: string[], season: number, divisionId: number): Fixture[] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push("__BYE__");
  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixtures: Fixture[] = [];

  let arr = [...teams];
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home !== "__BYE__" && away !== "__BYE__") {
        const flip = round % 2 === 1; // alternate home advantage a bit across first leg
        const [h, a] = flip ? [away, home] : [home, away];
        fixtures.push(makeFixture(season, round + 1, h, a, divisionId));
      }
    }
    // rotate, keeping arr[0] fixed
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr = [fixed, ...rest];
  }

  // second leg: reverse home/away, offset matchdays by `rounds`
  const secondLeg = fixtures.map((f) =>
    makeFixture(season, f.matchday + rounds, f.awayTeamId, f.homeTeamId, divisionId)
  );

  return [...fixtures, ...secondLeg];
}

// Convenience: build fixtures for several divisions at once (same season).
export function generatePyramidFixtures(divisions: Record<number, string[]>, season: number): Fixture[] {
  return Object.entries(divisions).flatMap(([divisionId, teamIds]) =>
    generateDoubleRoundRobin(teamIds, season, Number(divisionId))
  );
}

function makeFixture(season: number, matchday: number, home: string, away: string, divisionId: number): Fixture {
  return {
    id: nanoid(10),
    divisionId,
    season,
    matchday,
    homeTeamId: home,
    awayTeamId: away,
    played: false,
    homeGoals: 0,
    awayGoals: 0,
    events: [],
  };
}
