"use client";

import Link from "next/link";
import {
  LeaderboardProfileAvatar,
  PodiumProfileAvatar,
  PodiumSideIcon,
} from "./profile-avatar";

const TOP_CARDS = [
  {
    name: "Rick Lawton",
    prompts: 27,
    certified: 8,
    upvotes: 349,
    timeSaved: "41.0h",
    rank: 1,
    promptClass: "pcu-prompts--r1",
    promptRest: "Total Prompts",
  },
  {
    name: "Malvinder Kainth",
    prompts: 25,
    certified: 9,
    upvotes: 284,
    timeSaved: "28.5h",
    rank: 2,
    promptClass: "pcu-prompts--r2",
    promptRest: "Prompts Shared",
  },
  {
    name: "Oswaldo Ortiz",
    prompts: 24,
    certified: 8,
    upvotes: 198,
    timeSaved: "22.0h",
    rank: 3,
    promptClass: "pcu-prompts--r3",
    promptRest: "Prompts Submitted",
  },
] as const;

const LEADERBOARD = [
  { rank: 4, name: "Reyaz Ahmed", score: 25 },
  { rank: 5, name: "Steven Isaacs", score: 17 },
  { rank: 6, name: "Kishore Pnr", score: 16 },
  { rank: 7, name: "Elias Roy Yarlagadda", score: 16 },
  { rank: 8, name: "Sivakumar Sekar", score: 16 },
  { rank: 9, name: "Glemarys Pires", score: 16 },
  { rank: 10, name: "Ambika Ng", score: 15 },
  { rank: 11, name: "Sandeep Ravi", score: 14 },
];

export default function ChampionsDashboardPage() {
  return (
    <div className="pcu-champions-page">
      <header className="pcu-champions-topbar">
        <div className="pcu-champions-metric">
          <span className="label">TOTAL USERS</span>
          <span className="value">275</span>
        </div>
        <div className="pcu-champions-metric">
          <span className="label">CERTIFIED PROMPTS</span>
          <span className="value">47</span>
        </div>
        <div className="pcu-champions-metric">
          <span className="label">TIME SAVED</span>
          <span className="value">126.5h</span>
        </div>
        <div className="pcu-champions-metric">
          <span className="label">TOTAL PROMPTS</span>
          <span className="value">1,842</span>
        </div>
      </header>

      <div className="pcu-champions-content">
        <section className="pcu-champions-main">
          <h1>Prompt Engineering Gamification</h1>
          <p className="pcu-champions-subtitle">As of 1/22/2026 at 5:01 PM</p>
          <div className="pcu-podium-wrap">
            {TOP_CARDS.map((card) => (
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
                <h2 className="pcu-champion-name">{card.name}</h2>
                <p className={`pcu-prompts ${card.promptClass}`}>
                  <strong>{card.prompts}</strong> {card.promptRest}
                </p>
                <ul>
                  <li>Certified Prompts: {card.certified}</li>
                  <li>Total Upvotes: {card.upvotes}</li>
                  <li>Time Saved: {card.timeSaved}</li>
                </ul>
              </article>
            ))}
          </div>
        </section>

        <aside className="pcu-champions-board">
          <h3>Leaderboard</h3>
          <ul>
            {LEADERBOARD.map((entry) => (
              <li key={entry.rank}>
                <span className="rank">{entry.rank}</span>
                <LeaderboardProfileAvatar />
                <span className="name">{entry.name}</span>
                <span className="score">
                  <span className="pcu-lb-coin" aria-hidden="true">
                    🪙
                  </span>
                  {entry.score}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <footer className="pcu-champions-footer">
        <Link href="/prompt-catchup">Back to Prompt Catch Up</Link>
      </footer>
    </div>
  );
}
