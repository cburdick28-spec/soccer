"use client";

import { useMemo } from "react";
import { useActiveCareer } from "@/lib/game/useActiveCareer";

export default function FixturesPage() {
  const { career, hydrated } = useActiveCareer();

  const grouped = useMemo(() => {
    if (!career) return [];
    const team = career.teams[career.userTeamId];
    const fixtures = career.fixtures
      .filter((f) => f.season === career.season && (f.homeTeamId === team.id || f.awayTeamId === team.id))
      .sort((a, b) => a.matchday - b.matchday);
    return fixtures;
  }, [career]);

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;
  const team = career.teams[career.userTeamId];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Fixtures — Season {career.season}</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
        {grouped.map((f) => {
          const home = career.teams[f.homeTeamId];
          const away = career.teams[f.awayTeamId];
          const isCurrent = f.matchday === career.matchday && !f.played;
          return (
            <div
              key={f.id}
              className={`flex items-center justify-between px-4 py-2.5 text-sm ${isCurrent ? "bg-emerald-500/10" : ""}`}
            >
              <span className="text-slate-500 w-8 shrink-0">MD{f.matchday}</span>
              <span className={`flex-1 text-right ${home.id === team.id ? "font-semibold text-emerald-300" : ""}`}>{home.name}</span>
              <span className="w-16 text-center font-mono">
                {f.played ? `${f.homeGoals} - ${f.awayGoals}` : "vs"}
              </span>
              <span className={`flex-1 ${away.id === team.id ? "font-semibold text-emerald-300" : ""}`}>{away.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
