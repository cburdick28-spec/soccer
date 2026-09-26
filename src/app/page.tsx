"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/game/store";
import { suggestedClubNames } from "@/lib/game/init";

export default function Home() {
  const router = useRouter();
  const careers = useGameStore((s) => s.careers);
  const newCareer = useGameStore((s) => s.newCareer);
  const loadCareer = useGameStore((s) => s.loadCareer);
  const deleteCareer = useGameStore((s) => s.deleteCareer);

  const [hydrated, setHydrated] = useState(false);
  const [managerName, setManagerName] = useState("");
  const [saveName, setSaveName] = useState("My Career");
  const [clubOptions, setClubOptions] = useState<string[]>([]);
  const [club, setClub] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setClubOptions(suggestedClubNames());
  }, []);

  useEffect(() => {
    if (clubOptions.length && !club) setClub(clubOptions[0]);
  }, [clubOptions, club]);

  function startCareer() {
    if (!managerName.trim() || !club) return;
    const id = newCareer(saveName.trim() || "My Career", managerName.trim(), club);
    loadCareer(id);
    router.push("/dashboard");
  }

  const saves = Object.values(careers).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div className="text-center space-y-2 pt-6">
        <h1 className="text-4xl font-black tracking-tight text-emerald-400">⚽ Pocket Gaffer</h1>
        <p className="text-slate-400">A career-mode football management sim. Build a club, run seasons, sign players — all in your browser.</p>
      </div>

      {hydrated && saves.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">Continue a career</h2>
          <div className="space-y-2">
            {saves.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                <div>
                  <div className="font-semibold">{c.saveName}</div>
                  <div className="text-sm text-slate-400">
                    {c.managerName} · {c.teams[c.userTeamId]?.name} · Season {c.season}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { loadCareer(c.id); router.push("/dashboard"); }}
                    className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => deleteCareer(c.id)}
                    className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-sm hover:bg-red-900/60 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-200">Start a new career</h2>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Manager name</label>
          <input
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="e.g. Alex Rivera"
            className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Save name</label>
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Choose your club</label>
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto pr-1">
            {clubOptions.map((name) => (
              <button
                key={name}
                onClick={() => setClub(name)}
                className={`text-left px-3 py-2 rounded-md border text-sm transition ${
                  club === name
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 hover:border-slate-500 text-slate-300"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setClubOptions(suggestedClubNames())}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Shuffle club names
          </button>
        </div>

        <button
          disabled={creating || !managerName.trim()}
          onClick={() => { setCreating(true); startCareer(); }}
          className="w-full py-2.5 rounded-md bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-40"
        >
          Start Career
        </button>
      </section>
    </div>
  );
}
