"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LeaderboardProfileAvatar,
  PodiumProfileAvatar,
  PodiumSideIcon,
} from "./profile-avatar";

type GamificationRow = {
  rank: number;
  name: string;
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

export default function ChampionsDashboardPage() {
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
    <div className="pcu-champions-page">
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="pcu-champions-nav">
        <Link href="/prompt-catchup" className="pcu-champions-back-link">
          ← Back to Prompt Catch Up
        </Link>
      </div>
      <header className="pcu-champions-topbar">
        <div className="pcu-champions-metric">
          <span className="label">TOTAL USERS</span>
          <span className="value">{data?.totals.totalUsers ?? (isLoading ? "..." : 0)}</span>
        </div>
        <div className="pcu-champions-metric">
          <span className="label">CERTIFIED PROMPTS</span>
          <span className="value">{data?.totals.certifiedPrompts ?? (isLoading ? "..." : 0)}</span>
        </div>
        <div className="pcu-champions-metric">
          <span className="label">TIME SAVED</span>
          <span className="value">{data?.totals.timeSavedHours ?? (isLoading ? "..." : "0.0h")}</span>
        </div>
        <div className="pcu-champions-metric">
          <span className="label">TOTAL PROMPTS</span>
          <span className="value">{data?.totals.totalPrompts ?? (isLoading ? "..." : 0)}</span>
        </div>
      </header>

      <div className="pcu-champions-content">
        <section className="pcu-champions-main">
          <h1>Prompt Engineering Gamification</h1>
          <p className="pcu-champions-subtitle">
            As of {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "Loading..."}
          </p>
          <div className="pcu-podium-wrap">
            {topCards.map((card) => (
              <article
                key={card.name}
                className={`pcu-champion-card pcu-rank-${card.rank}`}
              >
                <span className="pcu-rank-badge">#{card.rank}</span>
                <span className="pcu-corner-icon pcu-corner-medal" aria-hidden="true">
                  🏅
                </span>
                <div className="pcu-champion-avatar-stack">
                  <div className="pcu-champion-avatar-ring">
                    <PodiumProfileAvatar />
                    <div className="pcu-champion-podium-badge">
                      <PodiumSideIcon
                        variant={
                          card.rank === 1
                            ? "tools"
                            : card.rank === 2
                              ? "trophy"
                              : "coin"
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="pcu-champion-titleline">
                  <h2 className="pcu-champion-name">{card.name}</h2>
                  <p className={`pcu-prompts pcu-prompts--r${Math.min(card.rank, 3)}`}>
                    <strong>{card.promptsShared}</strong>
                    <span className="pcu-prompts-label">Prompt</span>
                  </p>
                </div>
                <ul>
                  <li>Certified Prompts: {card.certifiedPrompts}</li>
                  <li>Total Upvotes: {card.totalUpvotes}</li>
                  <li>Time Saved: {card.timeSavedHours}</li>
                </ul>
              </article>
            ))}
          </div>
        </section>

        <aside className="pcu-champions-board">
          <h3>Leaderboard</h3>
          <ul>
            {leaderboard.map((entry) => (
              <li key={entry.rank}>
                <span className="rank">{entry.rank}</span>
                <LeaderboardProfileAvatar />
                <span className="name">{entry.name}</span>
                <span className="score">
                  <span className="pcu-lb-coin" aria-hidden="true">
                    🪙
                  </span>
                  {entry.score.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
