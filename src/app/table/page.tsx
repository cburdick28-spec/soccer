"use client";

import { useMemo, useState } from "react";
import { useActiveCareer } from "@/lib/game/useActiveCareer";
import { currentTable } from "@/lib/game/season";
import { divisionName, DIVISION_COUNT, PROMOTE_RELEGATE_COUNT } from "@/lib/game/divisions";

export default function TablePage() {
  const { career, hydrated } = useActiveCareer();
  const userDivision = career ? career.teams[career.userTeamId].divisionId : 4;
  const [division, setDivision] = useState<number | null>(null);
  const activeDivision = division ?? userDivision;

  const table = useMemo(() => (career ? currentTable(career, activeDivision) : []), [career, activeDivision]);

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{divisionName(activeDivision)} — Season {career.season}</h1>
        <div className="flex gap-1">
          {Array.from({ length: DIVISION_COUNT }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              onClick={() => setDivision(d)}
              className={`px-3 py-1.5 rounded-md text-sm ${
                d === activeDivision ? "bg-emerald-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-300"
              }`}
            >
              Div {d}{d === userDivision ? " •" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Club</th>
              <th className="px-2 py-2">P</th>
              <th className="px-2 py-2">W</th>
              <th className="px-2 py-2">D</th>
              <th className="px-2 py-2">L</th>
              <th className="px-2 py-2">GF</th>
              <th className="px-2 py-2">GA</th>
              <th className="px-2 py-2">GD</th>
              <th className="px-2 py-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => {
              const team = career.teams[r.teamId];
              if (!team) return null;
              const isUser = team.id === career.userTeamId;
              const promoZone = activeDivision > 1 && i < PROMOTE_RELEGATE_COUNT;
              const relZone = activeDivision < DIVISION_COUNT && i >= table.length - PROMOTE_RELEGATE_COUNT;
              return (
                <tr
                  key={r.teamId}
                  className={`border-t border-slate-800 ${isUser ? "bg-emerald-500/10" : promoZone ? "bg-blue-500/5" : relZone ? "bg-red-500/5" : ""}`}
                >
                  <td className="px-3 py-1.5">{i + 1}</td>
                  <td className={`px-3 py-1.5 font-medium ${isUser ? "text-emerald-300" : ""}`}>{team.name}</td>
                  <td className="px-2 py-1.5 text-center">{r.played}</td>
                  <td className="px-2 py-1.5 text-center">{r.won}</td>
                  <td className="px-2 py-1.5 text-center">{r.drawn}</td>
                  <td className="px-2 py-1.5 text-center">{r.lost}</td>
                  <td className="px-2 py-1.5 text-center">{r.gf}</td>
                  <td className="px-2 py-1.5 text-center">{r.ga}</td>
                  <td className="px-2 py-1.5 text-center">{r.gd}</td>
                  <td className="px-2 py-1.5 text-center font-bold">{r.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 text-xs text-slate-500">
        {activeDivision > 1 && <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Promotion</span>}
        {activeDivision < DIVISION_COUNT && <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Relegation</span>}
      </div>

      {career.seasonHistory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Past seasons</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            {career.seasonHistory.map((h) => {
              const yourDiv = h.divisions.find((d) => d.divisionId === h.userDivision);
              return (
                <li key={h.season}>
                  Season {h.season}: {divisionName(h.userDivision)} champions — {yourDiv?.champion}. You finished {h.userFinish}
                  {h.userFinish === 1 ? "st" : h.userFinish === 2 ? "nd" : h.userFinish === 3 ? "rd" : "th"} in {divisionName(h.userDivision)}.
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
