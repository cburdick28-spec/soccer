"use client";

import { useMemo } from "react";
import { MatchEvent } from "@/lib/game/types";
import { MatchResult } from "@/lib/game/matchEngine";

interface Props {
  homeName: string;
  awayName: string;
  result: MatchResult;
}

export default function MatchCenter({ homeName, awayName, result }: Props) {
  const { events, stats, homeGoals, awayGoals } = result;
  const sortedEvents = useMemo(() => [...events].sort((a, b) => b.minute - a.minute), [events]);
  const finalXg = stats.cumulativeXg[stats.cumulativeXg.length - 1] ?? [0, 0];

  return (
    <div className="space-y-4">
      {/* Score ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-xl px-6 py-4 flex items-center justify-center gap-6">
        <TeamFlag name={homeName} align="right" />
        <div className="text-center">
          <div className="text-3xl font-black tabular-nums">{homeGoals} - {awayGoals}</div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Full Time</div>
        </div>
        <TeamFlag name={awayName} align="left" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: event ticker */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 max-h-[480px] overflow-auto">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Match Events</h3>
          <div className="space-y-1.5">
            {sortedEvents.map((ev, i) => <EventLine key={i} event={ev} />)}
          </div>
        </div>

        {/* Center: shot map */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Shot Map</h3>
          <ShotMap events={events} homeName={homeName} awayName={awayName} />
        </div>

        {/* Right: stat meters + xG chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Match Stats</h3>
          <StatMeter label="Possession" home={stats.possession[0]} away={stats.possession[1]} suffix="%" />
          <StatMeter label="Shots" home={stats.shots[0]} away={stats.shots[1]} />
          <StatMeter label="Shots on Target" home={stats.shotsOnTarget[0]} away={stats.shotsOnTarget[1]} />
          <StatMeter label="Fouls" home={stats.fouls[0]} away={stats.fouls[1]} />
          <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
            <span className="text-slate-400">Expected Goals (xG)</span>
            <span className="font-mono">{finalXg[0].toFixed(2)} – {finalXg[1].toFixed(2)}</span>
          </div>
          <XgChart data={stats.cumulativeXg} />
        </div>
      </div>
    </div>
  );
}

function TeamFlag({ name, align }: { name: string; align: "left" | "right" }) {
  return (
    <div className={`text-sm font-semibold w-32 truncate ${align === "right" ? "text-right" : "text-left"}`}>
      {name}
    </div>
  );
}

function EventLine({ event }: { event: MatchEvent }) {
  const style: Record<MatchEvent["type"], string> = {
    goal: "text-emerald-400 font-semibold",
    card: event.cardType === "red" ? "text-red-500 font-semibold" : "text-amber-400",
    injury: "text-red-400",
    shot: "text-slate-500",
    foul: "text-slate-500",
    note: "text-slate-400",
  };
  const icon: Record<MatchEvent["type"], string> = {
    goal: "⚽",
    card: event.cardType === "red" ? "🟥" : "🟨",
    injury: "🚑",
    shot: "•",
    foul: "·",
    note: "·",
  };
  return (
    <div className={`flex gap-2 text-xs py-1 px-1 rounded ${event.type === "goal" ? "bg-emerald-500/10" : ""}`}>
      <span className="text-slate-500 tabular-nums w-8 shrink-0">{event.minute}'</span>
      <span className="shrink-0">{icon[event.type]}</span>
      <span className={style[event.type]}>{event.text}</span>
    </div>
  );
}

function ShotMap({ events, homeName, awayName }: { events: MatchEvent[]; homeName: string; awayName: string }) {
  const shots = events.filter((e) => e.type === "shot" || e.type === "goal");
  return (
    <div className="space-y-2">
      <svg viewBox="0 0 100 100" className="w-full aspect-[3/2] bg-emerald-900/40 rounded-lg border border-emerald-800/50">
        {/* pitch markings */}
        <rect x="0" y="0" width="100" height="100" fill="none" stroke="#065f46" strokeWidth="0.6" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="#065f46" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="8" fill="none" stroke="#065f46" strokeWidth="0.5" />
        <rect x="0" y="25" width="12" height="50" fill="none" stroke="#065f46" strokeWidth="0.5" />
        <rect x="88" y="25" width="12" height="50" fill="none" stroke="#065f46" strokeWidth="0.5" />

        {shots.map((ev, i) => {
          if (!ev.coordinate) return null;
          const isGoal = ev.type === "goal";
          const isOnTarget = ev.onTarget;
          const r = 1.2 + (ev.xg ?? 0.1) * 4;
          const fill = isGoal ? "#34d399" : isOnTarget ? "#facc15" : "#94a3b8";
          return (
            <circle
              key={i}
              cx={ev.coordinate.x}
              cy={ev.coordinate.y}
              r={r}
              fill={fill}
              opacity={isGoal ? 0.95 : 0.6}
              stroke={isGoal ? "#065f46" : "none"}
              strokeWidth="0.4"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 px-1">
        <span>{homeName} attacks →</span>
        <span>← {awayName} attacks</span>
      </div>
      <div className="flex gap-3 text-[10px] text-slate-400 px-1">
        <Legend color="#34d399" label="Goal" />
        <Legend color="#facc15" label="On target" />
        <Legend color="#94a3b8" label="Off target" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
      {label}
    </span>
  );
}

function StatMeter({ label, home, away, suffix = "" }: { label: string; home: number; away: number; suffix?: string }) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span className="font-mono">{home}{suffix}</span>
        <span>{label}</span>
        <span className="font-mono">{away}{suffix}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
        <div className="bg-emerald-500 h-full" style={{ width: `${homePct}%` }} />
        <div className="bg-slate-600 h-full flex-1" />
      </div>
    </div>
  );
}

function XgChart({ data }: { data: [number, number][] }) {
  if (data.length === 0) return null;
  const maxXg = Math.max(0.5, ...data.flat());
  const w = 260, h = 80;
  const toPoints = (idx: 0 | 1) =>
    data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d[idx] / maxXg) * h}`).join(" ");

  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">Cumulative xG</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20 bg-slate-950/50 rounded-lg border border-slate-800">
        <polyline points={toPoints(0)} fill="none" stroke="#34d399" strokeWidth="1.5" />
        <polyline points={toPoints(1)} fill="none" stroke="#64748b" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
