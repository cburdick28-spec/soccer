"use client";

import Link from "next/link";
import { useActiveCareer } from "@/lib/game/useActiveCareer";
import { useGameStore } from "@/lib/game/store";
import MatchCenter from "@/components/MatchCenter";

export default function MatchPage() {
  const { career, hydrated } = useActiveCareer();
  const lastMatchResult = useGameStore((s) => s.lastMatchResult);

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;

  if (!lastMatchResult) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-slate-400">No match has been played yet this session.</p>
        <Link href="/dashboard" className="text-emerald-400 underline text-sm">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Match Center</h1>
        <Link href="/dashboard" className="text-sm text-emerald-400 underline">Back to Dashboard</Link>
      </div>
      <MatchCenter
        homeName={lastMatchResult.homeName}
        awayName={lastMatchResult.awayName}
        result={lastMatchResult.result}
      />
    </div>
  );
}
