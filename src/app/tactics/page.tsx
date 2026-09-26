"use client";

import { useMemo } from "react";
import { useActiveCareer } from "@/lib/game/useActiveCareer";
import { useGameStore } from "@/lib/game/store";
import { Formation, Mentality } from "@/lib/game/types";
import { effectiveRating, isCompatible } from "@/lib/game/lineup";

const FORMATIONS: Formation[] = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1"];
const MENTALITIES: Mentality[] = ["Defensive", "Balanced", "Attacking"];

export default function TacticsPage() {
  const { career, hydrated } = useActiveCareer();
  const setFormation = useGameStore((s) => s.setFormation);
  const setMentality = useGameStore((s) => s.setMentality);
  const setLineupSlot = useGameStore((s) => s.setLineupSlot);
  const autoPickLineup = useGameStore((s) => s.autoPickLineup);

  const squad = useMemo(
    () => (career ? Object.values(career.players).filter((p) => p.teamId === career.userTeamId) : []),
    [career]
  );

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;

  const team = career.teams[career.userTeamId];
  const usedIds = new Set(team.lineup.map((s) => s.playerId).filter(Boolean) as string[]);

  const startingRating = team.lineup.reduce((sum, s) => {
    if (!s.playerId) return sum;
    const p = career.players[s.playerId];
    return sum + (p ? effectiveRating(p, s.slot) : 0);
  }, 0);
  const avgRating = Math.round(startingRating / Math.max(1, team.lineup.filter((s) => s.playerId).length));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Tactics</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Formation:</span>
          <select
            value={team.formation}
            onChange={(e) => setFormation(e.target.value as Formation)}
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm"
          >
            {FORMATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <span className="text-sm text-slate-400">Mentality:</span>
          <select
            value={team.mentality}
            onChange={(e) => setMentality(e.target.value as Mentality)}
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm"
          >
            {MENTALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button
            onClick={() => autoPickLineup()}
            className="px-3 py-1.5 rounded-md bg-slate-800 text-sm hover:bg-slate-700"
          >
            Auto-pick best XI
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">Starting XI average rating</span>
        <span className="text-xl font-bold text-emerald-400">{avgRating || "—"}</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {team.lineup.map((slot, idx) => {
          const eligible = squad
            .filter((p) => !usedIds.has(p.id) || p.id === slot.playerId)
            .sort((a, b) => effectiveRating(b, slot.slot) - effectiveRating(a, slot.slot));
          const current = slot.playerId ? career.players[slot.playerId] : null;
          return (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xs font-bold w-10 text-center bg-slate-800 rounded py-1 text-slate-300">{slot.slot}</span>
              <select
                value={slot.playerId ?? ""}
                onChange={(e) => setLineupSlot(idx, e.target.value || null)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-sm"
              >
                <option value="">— empty —</option>
                {eligible.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.position}) — {effectiveRating(p, slot.slot)}
                    {p.injuryWeeks > 0 ? " [INJ]" : ""}
                  </option>
                ))}
              </select>
              {current && (
                <span className={`text-xs ${isCompatible(current.position, slot.slot) ? "text-emerald-400" : "text-amber-400"}`}>
                  OVR {current.currentRating}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Bench</h3>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          {team.subs.map((id) => {
            const p = career.players[id];
            return p ? <span key={id} className="bg-slate-800 rounded px-2 py-1">{p.name} ({p.position})</span> : null;
          })}
        </div>
      </div>
    </div>
  );
}
