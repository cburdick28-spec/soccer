"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Career, Formation, Mentality } from "./types";
import { createNewCareer } from "./init";
import { simulateMatch, applyResultToFixture, MatchResult } from "./matchEngine";
import { autoLineup } from "./lineup";
import { defaultLineupForFormation } from "./generate";
import { isSeasonComplete, rolloverSeason } from "./season";
import {
  submitBid, respondToOutgoingOffer, respondToIncomingOffer, listPlayerForTransfer,
  processWeeklyTransferActivity,
} from "./transfers";

const SAVE_VERSION = 2;

interface GameState {
  careers: Record<string, Career>;
  activeCareerId: string | null;
  lastMatchResult: { fixtureId: string; result: MatchResult; homeName: string; awayName: string } | null;

  newCareer: (saveName: string, managerName: string, clubName: string, division?: number) => string;
  loadCareer: (id: string) => void;
  deleteCareer: (id: string) => void;
  exitToMenu: () => void;

  setFormation: (formation: Formation) => void;
  setMentality: (mentality: Mentality) => void;
  setLineupSlot: (index: number, playerId: string | null) => void;
  autoPickLineup: () => void;

  playNextMatchday: () => void;
  advanceSeasonIfComplete: () => void;

  submitTransferBid: (playerId: string, amount: number) => void;
  respondOutgoing: (offerId: string, action: "accept" | "reject" | "raise", raiseAmount?: number) => void;
  respondIncoming: (offerId: string, action: "accept" | "reject" | "counter", counterAmount?: number) => void;
  toggleListPlayer: (playerId: string, listed: boolean) => void;
}

function withCareer(state: GameState, fn: (c: Career) => Career): Partial<GameState> {
  if (!state.activeCareerId) return {};
  const c = state.careers[state.activeCareerId];
  if (!c) return {};
  const updated = fn(c);
  return { careers: { ...state.careers, [updated.id]: updated } };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      careers: {},
      activeCareerId: null,
      lastMatchResult: null,

      newCareer: (saveName, managerName, clubName, division = 4) => {
        const career = createNewCareer(saveName, managerName, clubName, division);
        set((state) => ({
          careers: { ...state.careers, [career.id]: career },
          activeCareerId: career.id,
        }));
        return career.id;
      },

      loadCareer: (id) => set({ activeCareerId: id }),
      deleteCareer: (id) =>
        set((state) => {
          const careers = { ...state.careers };
          delete careers[id];
          return { careers, activeCareerId: state.activeCareerId === id ? null : state.activeCareerId };
        }),
      exitToMenu: () => set({ activeCareerId: null }),

      setFormation: (formation) =>
        set((state) =>
          withCareer(state, (c) => {
            const team = c.teams[c.userTeamId];
            const newLineup = defaultLineupForFormation(formation);
            const oldIds = team.lineup.map((s) => s.playerId).filter(Boolean) as string[];
            newLineup.forEach((slot, i) => { slot.playerId = oldIds[i] ?? null; });
            return { ...c, teams: { ...c.teams, [c.userTeamId]: { ...team, formation, lineup: newLineup } } };
          })
        ),

      setMentality: (mentality) =>
        set((state) =>
          withCareer(state, (c) => {
            const team = c.teams[c.userTeamId];
            return { ...c, teams: { ...c.teams, [c.userTeamId]: { ...team, mentality } } };
          })
        ),

      setLineupSlot: (index, playerId) =>
        set((state) =>
          withCareer(state, (c) => {
            const team = c.teams[c.userTeamId];
            const lineup = team.lineup.map((s, i) => (i === index ? { ...s, playerId } : s));
            return { ...c, teams: { ...c.teams, [c.userTeamId]: { ...team, lineup } } };
          })
        ),

      autoPickLineup: () =>
        set((state) =>
          withCareer(state, (c) => {
            const team = c.teams[c.userTeamId];
            const squad = Object.values(c.players).filter((p) => p.teamId === c.userTeamId);
            const { lineup, subs } = autoLineup(team, squad);
            return { ...c, teams: { ...c.teams, [c.userTeamId]: { ...team, lineup, subs } } };
          })
        ),

      playNextMatchday: () => {
        set((state) =>
          withCareer(state, (c) => {
            const md = c.matchday;
            const userTeam = c.teams[c.userTeamId];
            const todays = c.fixtures.filter(
              (f) => f.season === c.season && f.divisionId === userTeam.divisionId && f.matchday === md && !f.played
            );
            let fixtures = [...c.fixtures];
            let players = { ...c.players };
            let teams = { ...c.teams };
            let lastMatchResult: GameState["lastMatchResult"] = null;

            for (const fixture of todays) {
              const home = teams[fixture.homeTeamId];
              const away = teams[fixture.awayTeamId];
              if (!home || !away) continue;
              if (!home.isUserTeam) {
                const squad = Object.values(players).filter((p) => p.teamId === home.id);
                const picked = autoLineup(home, squad);
                teams[home.id] = { ...home, lineup: picked.lineup, subs: picked.subs };
              }
              if (!away.isUserTeam) {
                const squad = Object.values(players).filter((p) => p.teamId === away.id);
                const picked = autoLineup(away, squad);
                teams[away.id] = { ...away, lineup: picked.lineup, subs: picked.subs };
              }
              const result = simulateMatch(teams[home.id], teams[away.id], players);
              const idx = fixtures.findIndex((f) => f.id === fixture.id);
              fixtures[idx] = applyResultToFixture(fixture, result);

              if (home.isUserTeam || away.isUserTeam) {
                lastMatchResult = { fixtureId: fixture.id, result, homeName: home.name, awayName: away.name };
              }

              for (const [pid, delta] of Object.entries(result.conditionDelta)) {
                const p = players[pid];
                if (p) players[pid] = { ...p, condition: Math.max(10, Math.min(100, p.condition + delta)) };
              }
              for (const [pid, rating] of Object.entries(result.formDelta)) {
                const p = players[pid];
                if (p) players[pid] = { ...p, matchForm: [...p.matchForm.slice(-4), rating] };
              }
              for (const inj of result.injuries) {
                const p = players[inj.playerId];
                if (p) players[inj.playerId] = { ...p, injuryWeeks: Math.max(p.injuryWeeks, inj.weeks) };
              }
            }

            // All other divisions also play out their matchday so tables stay in sync.
            const otherDivisionFixtures = c.fixtures.filter(
              (f) => f.season === c.season && f.divisionId !== userTeam.divisionId && f.matchday === md && !f.played
            );
            for (const fixture of otherDivisionFixtures) {
              const home = teams[fixture.homeTeamId];
              const away = teams[fixture.awayTeamId];
              if (!home || !away) continue;
              const hs = Object.values(players).filter((p) => p.teamId === home.id);
              const as = Object.values(players).filter((p) => p.teamId === away.id);
              teams[home.id] = { ...home, ...autoLineup(home, hs) };
              teams[away.id] = { ...away, ...autoLineup(away, as) };
              const result = simulateMatch(teams[home.id], teams[away.id], players);
              const idx = fixtures.findIndex((f) => f.id === fixture.id);
              fixtures[idx] = applyResultToFixture(fixture, result);
              for (const [pid, delta] of Object.entries(result.conditionDelta)) {
                const p = players[pid];
                if (p) players[pid] = { ...p, condition: Math.max(10, Math.min(100, p.condition + delta)) };
              }
            }

            // weekly recovery + injury countdown for everyone
            for (const id of Object.keys(players)) {
              const p = players[id];
              players[id] = {
                ...p,
                injuryWeeks: Math.max(0, p.injuryWeeks - 1),
                condition: Math.min(100, p.condition + 4),
              };
            }

            let career: Career = { ...c, fixtures, players, teams, matchday: md + 1 };
            career = processWeeklyTransferActivity(career);

            queueMicrotask(() => {
              useGameStore.setState({ lastMatchResult });
            });

            return career;
          })
        );
      },

      advanceSeasonIfComplete: () =>
        set((state) => {
          if (!state.activeCareerId) return {};
          const c = state.careers[state.activeCareerId];
          if (!c || !isSeasonComplete(c)) return {};
          const { career } = rolloverSeason(c);
          return { careers: { ...state.careers, [career.id]: career } };
        }),

      submitTransferBid: (playerId, amount) =>
        set((state) => withCareer(state, (c) => submitBid(c, playerId, amount))),

      respondOutgoing: (offerId, action, raiseAmount) =>
        set((state) => withCareer(state, (c) => respondToOutgoingOffer(c, offerId, action, raiseAmount))),

      respondIncoming: (offerId, action, counterAmount) =>
        set((state) => withCareer(state, (c) => respondToIncomingOffer(c, offerId, action, counterAmount))),

      toggleListPlayer: (playerId, listed) =>
        set((state) => withCareer(state, (c) => listPlayerForTransfer(c, playerId, listed))),
    }),
    {
      name: "soccer-career-saves",
      version: SAVE_VERSION,
      migrate: (persisted) => {
        // Any save from before the v2 pyramid rewrite is incompatible — start fresh.
        const state = persisted as { careers?: Record<string, Career> } | undefined;
        const hasV2 = state?.careers && Object.values(state.careers).every((c) => c.version === SAVE_VERSION);
        if (hasV2) return state as GameState;
        return { careers: {}, activeCareerId: null, lastMatchResult: null } as unknown as GameState;
      },
    }
  )
);
