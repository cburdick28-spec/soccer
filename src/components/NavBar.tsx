"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGameStore } from "@/lib/game/store";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/squad", label: "Squad" },
  { href: "/tactics", label: "Tactics" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/table", label: "Table" },
  { href: "/transfers", label: "Transfers" },
  { href: "/match", label: "Match Center" },
];

export default function NavBar() {
  const pathname = usePathname();
  const activeCareerId = useGameStore((s) => s.activeCareerId);
  const career = useGameStore((s) => (s.activeCareerId ? s.careers[s.activeCareerId] : null));

  if (!activeCareerId || !career) {
    return (
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold tracking-tight text-emerald-400">⚽ Pocket Gaffer</Link>
        </div>
      </header>
    );
  }

  const team = career.teams[career.userTeamId];

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/" className="font-bold tracking-tight text-emerald-400 shrink-0">⚽ Pocket Gaffer</Link>
        <nav className="flex gap-1 flex-wrap">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="text-xs text-slate-400 text-right shrink-0">
          <div className="font-semibold text-slate-200">{team?.name} · Div {team?.divisionId}</div>
          <div>Season {career.season} · Matchday {career.matchday}</div>
        </div>
      </div>
    </header>
  );
}
