"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Career, Formation, LineupSlot } from "./types";
import { createNewCareer } from "./init";
import { simulateMatch, applyResultToFixture } from "./matchEngine";
import { autoLineup } from "./lineup";
import { defaultLineupForFormation } from "./generate";
import { isSeasonComplete, rolloverSeason } from "./season";
import { generateIncomingOffers, makeBuyOffer, listPlayerForTransfer, respondToOffer } from "./transfers";
import { nanoid } from "nanoid";

interface GameState {
  careers: Record<string, Career>;
  activeCareerId: string | null;
  lastMatchSummary: { fixtureId: string; text: string[] } | null;

  newCareer: (saveName: string, managerName: string, clubName: string) => string;
  loadCareer: (id: string) => void;
  deleteCareer: (id: string) => void;
  exitToMenu: () => void;

  setFormation: (formation: Formation) => void;
  setLineupSlot: (index: number, playerId: string | null) => void;
  autoPickLineup: () => void;

  playNextMatchday: () => void;
  advanceSeasonIfComplete: () => void;

  buyPlayer: (playerId: string, amount: number) => { result: "accepted" | "rejected"; message: string };
  toggleListPlayer: (playerId: string, listed: boolean) => void;
  respondToIncomingOffer: (offerId: string, accept: boolean) => void;
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
      lastMatchSummary: null,

      newCareer: (saveName, managerName, clubName) => {
        const career = createNewCareer(saveName, managerName, clubName);
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
            // try to keep already-assigned players in equivalent slots where possible
            const oldIds = team.lineup.map((s) => s.playerId).filter(Boolean) as string[];
            newLineup.forEach((slot, i) => {
              slot.playerId = oldIds[i] ?? null;
            });
            return { ...c, teams: { ...c.teams, [c.userTeamId]: { ...team, formation, lineup: newLineup } } };
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
            const todays = c.fixtures.filter((f) => f.season === c.season && f.matchday === md && !f.played);
            let fixtures = [...c.fixtures];
            let players = { ...c.players };
            let teams = { ...c.teams };
            const summaryLines: string[] = [];
            let userFixtureId = "";

            for (const fixture of todays) {
              const home = teams[fixture.homeTeamId];
              const away = teams[fixture.awayTeamId];
              if (!home || !away) continue;
              // refresh AI lineups each week to account for injuries/condition
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
                userFixtureId = fixture.id;
                summaryLines.push(`${home.name} ${result.homeGoals} - ${result.awayGoals} ${away.name}`);
                for (const ev of result.events) summaryLines.push(`${ev.minute}' ${ev.text}`);
              }

              for (const [pid, delta] of Object.entries(result.conditionDelta)) {
                const p = players[pid];
                if (p) players[pid] = { ...p, condition: Math.max(10, Math.min(100, p.condition + delta)) };
              }
              for (const inj of result.injuries) {
                const p = players[inj.playerId];
                if (p) players[inj.playerId] = { ...p, injuryWeeksLeft: Math.max(p.injuryWeeksLeft, inj.weeks) };
              }
            }

            // weekly recovery for everyone not involved + injury countdown
            for (const id of Object.keys(players)) {
              const p = players[id];
              players[id] = {
                ...p,
                injuryWeeksLeft: Math.max(0, p.injuryWeeksLeft - 1),
                condition: Math.min(100, p.condition + 4),
              };
            }

            let career: Career = {
              ...c,
              fixtures,
              players,
              teams,
              matchday: md + 1,
              news: userFixtureId
                ? [...c.news, { id: nanoid(8), season: c.season, matchday: md, text: summaryLines[0] }]
                : c.news,
            };
            career = generateIncomingOffers(career);

            queueMicrotask(() => {
              useGameStore.setState({ lastMatchSummary: userFixtureId ? { fixtureId: userFixtureId, text: summaryLines } : null });
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

      buyPlayer: (playerId, amount) => {
        const state = get();
        if (!state.activeCareerId) return { result: "rejected", message: "No active career." };
        const c = state.careers[state.activeCareerId];
        const { career, result, message } = makeBuyOffer(c, playerId, amount);
        if (result === "accepted") {
          set((s) => ({ careers: { ...s.careers, [career.id]: career } }));
        }
        return { result, message };
      },

      toggleListPlayer: (playerId, listed) =>
        set((state) => withCareer(state, (c) => listPlayerForTransfer(c, playerId, listed))),

      respondToIncomingOffer: (offerId, accept) =>
        set((state) => withCareer(state, (c) => respondToOffer(c, offerId, accept))),
    }),
    { name: "soccer-career-saves" }
  )
);
