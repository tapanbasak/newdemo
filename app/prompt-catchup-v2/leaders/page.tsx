"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InitialsAvatar } from "./initials-avatar";

type GamificationRow = {
  rank: number;
  name: string;
  role: string;
  promptsShared: number;
  certifiedPrompts: number;
  totalUpvotes: number;
  timeSavedHours: string;
  score: number;
};

type GamificationResponse = {
  generatedAt: string;
  totals: {
    totalUsers: number;
    certifiedPrompts: number;
    totalPrompts: number;
    timeSavedHours: string;
  };
  topCards: GamificationRow[];
  leaderboard: GamificationRow[];
};

/** Thin line icons for the champion-card stat rows. */
function StatIcon({ kind }: { kind: "certified" | "likes" | "time" | "score" }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "certified") {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
      </svg>
    );
  }
  if (kind === "likes") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M12 20s-7-4.6-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.4 12 20 12 20z" />
      </svg>
    );
  }
  if (kind === "time") {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M4 19h16" />
      <path d="M7 16v-4M12 16V8M17 16v-6" />
    </svg>
  );
}

/**
 * Migrated as-is from app/prompt-catchup/leaders. It sits OUTSIDE the (shell)
 * route group on purpose, so it does not inherit the v2 sidebar layout and keeps
 * its original full-bleed dashboard design. Logic and data are unchanged.
 */

/** Split a name into a primary line and a remainder line for the leaderboard. */
function splitName(name: string): { first: string; rest: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: name.trim(), rest: "" };
  return { first: parts[0], rest: parts.slice(1).join(" ") };
}

export default function LeadersDashboardPage() {
  const [data, setData] = useState<GamificationResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGamification() {
      setError("");
      setIsLoading(true);
      try {
        const res = await fetch("/api/gamification", { cache: "no-store" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Unable to load gamification stats.");
        }
        setData((await res.json()) as GamificationResponse);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load gamification stats.";
        setError(message);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadGamification();
  }, []);

  const topCards = useMemo(() => data?.topCards ?? [], [data]);
  const leaderboard = useMemo(() => (data?.leaderboard ?? []).slice(3), [data]);

  return (
    <div className="pcu-ldr-page">
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="pcu-ldr-nav">
        <Link href="/prompt-catchup-v2" className="pcu-ldr-back-link">
          ← Back to Prompt Hub
        </Link>
      </div>
      <header className="pcu-ldr-topbar">
        <div className="pcu-ldr-metric">
          <span className="label">Contributors</span>
          <span className="value">{data?.totals.totalUsers ?? (isLoading ? "..." : 0)}</span>
        </div>
        <div className="pcu-ldr-metric">
          <span className="label">Certified Prompts</span>
          <span className="value">{data?.totals.certifiedPrompts ?? (isLoading ? "..." : 0)}</span>
        </div>
        <div className="pcu-ldr-metric">
          <span className="label">Time Saved</span>
          <span className="value">{data?.totals.timeSavedHours ?? (isLoading ? "..." : "0.0h")}</span>
        </div>
        <div className="pcu-ldr-metric">
          <span className="label">Total Prompts</span>
          <span className="value">{data?.totals.totalPrompts ?? (isLoading ? "..." : 0)}</span>
        </div>
      </header>

      <h1 className="pcu-ldr-heading">
        <span className="pcu-ldr-heading-icon" aria-hidden="true">🎖️</span>
        Prompt Engineering Leaders
      </h1>
      <p className="pcu-ldr-subtitle">
        As of {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "Loading..."}
      </p>

      <div className="pcu-ldr-content">
        <section className="pcu-ldr-main">
          <div className="pcu-ldr-podium">
            {topCards.map((card) => (
              <article key={card.name} className={`pcu-ldr-card pcu-ldr-rank-${card.rank}`}>
                <span className="pcu-ldr-corner-icon" aria-hidden="true">
                  🎖️
                </span>
                <div className="pcu-ldr-avatar-stack">
                  <InitialsAvatar name={card.name} />
                </div>
                <h2 className="pcu-ldr-name">{card.name}</h2>
                <p className="pcu-ldr-role">{card.role}</p>
                <div className="pcu-ldr-pill">
                  {card.promptsShared} {card.promptsShared === 1 ? "Prompt" : "Prompts"}
                </div>
                <ul className="pcu-ldr-stats">
                  <li>
                    <span className="pcu-ldr-stat-label">
                      <StatIcon kind="certified" /> Certified
                    </span>
                    <span className="pcu-ldr-stat-value">{card.certifiedPrompts}</span>
                  </li>
                  <li>
                    <span className="pcu-ldr-stat-label">
                      <StatIcon kind="likes" /> Likes
                    </span>
                    <span className="pcu-ldr-stat-value">{card.totalUpvotes}</span>
                  </li>
                  <li>
                    <span className="pcu-ldr-stat-label">
                      <StatIcon kind="time" /> Time Saved
                    </span>
                    <span className="pcu-ldr-stat-value">{card.timeSavedHours}</span>
                  </li>
                  <li>
                    <span className="pcu-ldr-stat-label">
                      <StatIcon kind="score" /> Score
                    </span>
                    <span className="pcu-ldr-stat-value">{card.score.toFixed(2)}</span>
                  </li>
                </ul>
                <div className={`pcu-ldr-footer pcu-ldr-footer--r${card.rank}`}>#{card.rank}</div>
              </article>
            ))}
          </div>
        </section>

        <aside className="pcu-ldr-board">
          <h3>Leaderboard</h3>
          <ul>
            {leaderboard.map((entry) => {
              const { first, rest } = splitName(entry.name);
              return (
                <li key={entry.rank}>
                  <span className="rank">{entry.rank}</span>
                  <span className="name">
                    <span className="name-first">{first}</span>
                    {rest ? <span className="name-rest">{rest}</span> : null}
                  </span>
                  <span className="score">{entry.score.toFixed(2)}</span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
