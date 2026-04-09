/** Circular profile placeholder — white ring + silhouette (podium) or plain white (leaderboard). */
export function PodiumProfileAvatar() {
  return (
    <div className="pcu-profile-avatar pcu-profile-avatar--podium" aria-hidden="true">
      <svg className="pcu-profile-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="32"
          cy="32"
          r="29"
          stroke="rgba(255, 255, 255, 0.72)"
          strokeWidth="2"
          fill="rgba(15, 23, 42, 0.55)"
        />
        <circle cx="32" cy="24" r="8.5" fill="rgba(148, 163, 184, 0.65)" />
        <path
          d="M17 53c0-8.3 6.7-15 15-15s15 6.7 15 15"
          stroke="rgba(148, 163, 184, 0.65)"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/** Plain white circle (reference leaderboard). */
export function LeaderboardProfileAvatar() {
  return (
    <div className="pcu-profile-avatar pcu-profile-avatar--leaderboard" aria-hidden="true">
      <svg className="pcu-profile-svg" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="#ffffff" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" />
      </svg>
    </div>
  );
}

/** Rank badges beside podium avatar — #1 tools, #2 trophy, #3 coin. */
export function PodiumSideIcon({ variant }: { variant: "tools" | "trophy" | "coin" }) {
  if (variant === "tools") {
    return (
      <span className="pcu-podium-side-icon pcu-podium-side-icon--tools" aria-hidden="true">
        <span className="pcu-tools-emoji">⚔️</span>
      </span>
    );
  }
  if (variant === "trophy") {
    return (
      <span className="pcu-podium-side-icon pcu-podium-side-icon--trophy" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="pcu-trophy-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="45%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
          <path
            d="M14 14h20v5c0 6.1-4.5 11-10 11.4V33h-2v-2.6C16.5 30 12 25.1 12 19v-5h2z"
            fill="url(#pcu-trophy-gold)"
            stroke="#b45309"
            strokeWidth="0.75"
          />
          <path
            d="M10 14H8a3 3 0 000 6h2M38 14h2a3 3 0 010 6h-2"
            stroke="#eab308"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M18 36h12v3H18v-3z" fill="#78716c" />
          <path d="M15 39h18v3H15v-3z" fill="#57534e" />
        </svg>
      </span>
    );
  }
  return (
    <span className="pcu-podium-side-icon pcu-podium-side-icon--coin" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="pcu-coin-gold" x1="30%" y1="20%" x2="70%" y2="85%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="17" fill="url(#pcu-coin-gold)" stroke="#b45309" strokeWidth="1.25" />
        <ellipse cx="19" cy="19" rx="6" ry="3.5" fill="rgba(255,255,255,0.35)" transform="rotate(-35 19 19)" />
      </svg>
    </span>
  );
}
