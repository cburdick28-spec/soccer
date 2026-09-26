"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "./store";

// Returns the active career, redirecting home if there isn't one.
// Also guards against SSR/hydration mismatch since the store is persisted to localStorage.
export function useActiveCareer() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const activeCareerId = useGameStore((s) => s.activeCareerId);
  const career = useGameStore((s) => (s.activeCareerId ? s.careers[s.activeCareerId] : null));

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !activeCareerId) router.replace("/");
  }, [hydrated, activeCareerId, router]);

  return { career, hydrated };
}
