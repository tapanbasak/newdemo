"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Shares the selected GUIDE group (category slug) between the sidebar (which sets
 * it) and the home grid (which filters by it). Mirrors v1's group-chip filtering
 * where clicking a group narrows the assistant grid to agent.category === slug.
 */
type BrowseContextValue = {
  group: string | null;
  setGroup: (slug: string | null) => void;
  toggleGroup: (slug: string) => void;
};

const BrowseContext = createContext<BrowseContextValue | null>(null);

export function BrowseProvider({ children }: { children: ReactNode }) {
  const [group, setGroup] = useState<string | null>(null);
  const value = useMemo<BrowseContextValue>(
    () => ({
      group,
      setGroup,
      toggleGroup: (slug: string) => setGroup((prev) => (prev === slug ? null : slug)),
    }),
    [group]
  );
  return <BrowseContext.Provider value={value}>{children}</BrowseContext.Provider>;
}

export function useBrowse(): BrowseContextValue {
  const ctx = useContext(BrowseContext);
  if (!ctx) throw new Error("useBrowse must be used within a BrowseProvider");
  return ctx;
}
