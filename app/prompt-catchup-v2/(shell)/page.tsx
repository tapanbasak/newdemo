"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { Agent, Group, SortBy } from "@/lib/types";
import { CURRENT_USER_ROLE, type ViewMode } from "@/lib/view-meta";
import { agentMatchesForMyRole, type PromptRoleHint } from "@/lib/for-my-role";
import { agentNewestMillis, filterAgents, filterAgentsNoSort, sortAgentsBy } from "@/lib/filter";
import { getMyUpvotes, getUpvoteCounts, trackActivity } from "@/lib/client-api";
import { getRunPromptTargetUrl } from "@/lib/run-prompt";
import { useBrowse } from "../components/browse-context";

type MyUpvoteRow = {
  agentId?: number;
  promptId?: number;
  title?: string;
  description?: string;
  author?: string;
  upvotes?: number;
  platform?: string;
};

/** Ported verbatim from v1: renames `agents` -> Assistants and synthesises the
 *  zero-count `agent` group when the API omits it. */
function normalizeGroups(input: Group[]): Group[] {
  const mapped = input.map((g) => (g.slug === "agents" ? { ...g, name: "Assistants" } : g));
  const hasAgentGroup = mapped.some((g) => g.slug === "agent");
  if (!hasAgentGroup) {
    const insertIndex = Math.max(
      1,
      mapped.findIndex((g) => g.slug !== "my-upvotes" && g.slug !== "agents")
    );
    const item: Group = { name: "Agent", slug: "agent", count: 0 };
    if (insertIndex === -1) return [...mapped, item];
    return [...mapped.slice(0, insertIndex), item, ...mapped.slice(insertIndex)];
  }
  return mapped;
}

/** Ported verbatim from v1: content-identity so the same prompt shared across
 *  several assistants collapses into one row and sums its upvotes. */
function getMyUpvoteDedupKey(row: MyUpvoteRow) {
  return `${String(row.title ?? "")
    .trim()
    .toLowerCase()}|${String(row.description ?? "")
    .trim()
    .toLowerCase()}|${String(row.author ?? "")
    .trim()
    .toLowerCase()}|${String(row.platform ?? "")
    .trim()
    .toLowerCase()}`;
}

const USER_SOEID_KEY = "cone-soeid";
const USER_PROFILE_KEY = "cone-user-profile";
const BUSINESS_ORG_BY_SOEID_KEY = "pcu_business_org_by_soeid";
const USER_ROLE_KEY = "pcu_user_role";
const FALLBACK_SOEID = "tb97406";

/**
 * The Figma "Filter by Role" dropdown (role-tag list) is retained in code but
 * hidden — flip this to true to bring it back. v1's two-option view-mode
 * dropdown ("For my role" / "Most used") is shown in its place.
 */
const SHOW_ROLE_FILTER = false;

/** Shape returned by GET /api/home (see app/api/home/route.ts). */
type ScoreboardRow = { ranking: string; name: string; value: string };
type Scoreboard = { title: string; columns: string[]; rows: ScoreboardRow[]; footnote?: string };

/** Display config for the three home panels, in the API's [champions, recent, topVoted] order. */
const PANELS = [
  { title: "Top Contributors This Month", linkNames: false, leadWithLetter: true, viewAll: "View All Contributors" },
  { title: "Recently Shared Prompts", linkNames: true, leadWithLetter: false, viewAll: null as string | null },
  { title: "Top Voted Prompts", linkNames: true, leadWithLetter: false, viewAll: null as string | null },
];

/** Distinct hexagon colour per assistant — brand match where known, stable hash otherwise. */
const HEX_BRAND: Array<[RegExp, string]> = [
  [/excel/, "#217346"],
  [/outlook/, "#0072c6"],
  [/onenote|one note/, "#7719aa"],
  [/github/, "#1f6feb"],
  [/copilot/, "#0b2033"],
  [/devin/, "#6b3fa0"],
  [/stylus/, "#1a66c2"],
  [/project|tracking|\bpts\b/, "#d9480f"],
];
const HEX_PALETTE = ["#1a66c2", "#6b3fa0", "#1f7a4d", "#c0392b", "#0e7490", "#b7791f", "#2c5282", "#0b2033"];

function hexColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [re, color] of HEX_BRAND) if (re.test(lower)) return color;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HEX_PALETTE[h % HEX_PALETTE.length];
}

function SearchIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function PlayIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function UpvoteIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
    </svg>
  );
}

/** Title-case a role slug like "software-engineer" → "Software Engineer". */
function roleLabel(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function firstLetter(name: string): string {
  const m = name.match(/[a-zA-Z0-9]/);
  return (m ? m[0] : "?").toUpperCase();
}

export default function PromptHubHome() {
  const { group, setGroup, setGroups: publishGroups } = useBrowse();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("for_my_role");
  const [role, setRole] = useState("all"); // hidden role filter, retained for later
  const [sortBy, setSortBy] = useState<SortBy>("most_prompts");

  const [myCount, setMyCount] = useState(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scoreboards, setScoreboards] = useState<Scoreboard[]>([]);
  const [promptRoles, setPromptRoles] = useState<Record<number, PromptRoleHint[]>>({});
  const [myUpvotes, setMyUpvotes] = useState<MyUpvoteRow[]>([]);
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({});
  const [promptSearch, setPromptSearch] = useState("");
  const [showCertifiedOnly, setShowCertifiedOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>(CURRENT_USER_ROLE);

  const applyStoredUserRole = () => {
    const fromStorage = localStorage.getItem(USER_ROLE_KEY);
    const normalized = String(fromStorage ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setCurrentUserRole(normalized || CURRENT_USER_ROLE);
  };

  const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
  useIsoLayoutEffect(() => {
    applyStoredUserRole();
  }, []);

  async function loadHomeData() {
    setError("");
    setIsLoading(true);
    try {
      const [mine, counts, homeData] = await Promise.all([
        getMyUpvotes().catch(() => []),
        getUpvoteCounts().catch(() => ({})),
        fetch("/api/home").then(async (r) => {
          if (!r.ok) {
            const data = await r.json().catch(() => ({}));
            throw new Error(data?.error || "Unable to load home data.");
          }
          return r.json();
        }),
      ]);
      setUpvoteCounts(counts as Record<string, number>);
      setMyCount(Array.from(new Set((mine as MyUpvoteRow[]).map((row) => getMyUpvoteDedupKey(row)))).length);
      setMyUpvotes(mine as MyUpvoteRow[]);
      setAgents(homeData.agents ?? []);
      setGroups(normalizeGroups(homeData.groups ?? []));
      setScoreboards(homeData.scoreboards ?? []);
      setPromptRoles(homeData.promptRolesByAgent ?? {});
      setIsLoading(false);
    } catch {
      setAgents([]);
      setGroups([]);
      setScoreboards([]);
      setUpvoteCounts({});
      setPromptRoles({});
      setError("Unable to load home data right now. Please check MongoDB connection and try again.");
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadHomeData();
  }, []);

  // Ported from v1: resolves the signed-in user's role + business org into
  // localStorage. Without this v2 would depend on v1 having been visited first.
  useEffect(() => {
    async function loadAndStoreUserProfile() {
      const soeid = String(localStorage.getItem(USER_SOEID_KEY) ?? "").trim().toLowerCase() || FALLBACK_SOEID;
      localStorage.setItem(USER_SOEID_KEY, soeid);
      try {
        const profileRes = await fetch(`/api/user-profile?soeid=${encodeURIComponent(soeid)}`, { cache: "no-store" });
        if (!profileRes.ok) return;
        const data = (await profileRes.json()) as {
          user?: {
            soeId?: string;
            firstName?: string;
            lastName?: string;
            departmentName?: string;
            mappedRole?: { roleKey?: string; roleLabel?: string };
          };
        };
        if (!data?.user) return;
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data.user));
        const normalizedSoeid = String(data.user.soeId ?? soeid).trim().toLowerCase();
        if (normalizedSoeid) localStorage.setItem(USER_SOEID_KEY, normalizedSoeid);
        const mappedRoleKey = String(data.user.mappedRole?.roleKey ?? "").trim().toLowerCase();
        if (mappedRoleKey) {
          localStorage.setItem(USER_ROLE_KEY, mappedRoleKey);
          setCurrentUserRole(mappedRoleKey);
        }
        const department = String(data.user.departmentName ?? "").trim();
        if (department) {
          const mappedBusinessOrg =
            department.toUpperCase().includes("USPB") ? "U. S Personal Banking" : "";
          if (mappedBusinessOrg) {
            const raw = localStorage.getItem(BUSINESS_ORG_BY_SOEID_KEY);
            const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
            parsed[normalizedSoeid || soeid] = mappedBusinessOrg;
            localStorage.setItem(BUSINESS_ORG_BY_SOEID_KEY, JSON.stringify(parsed));
          }
        }
      } catch {
        // no-op for local dev/offline simulation failures
      }
    }
    loadAndStoreUserProfile();
  }, []);

  // v1 refreshes usage counts when switching to "Most used".
  useEffect(() => {
    if (viewMode === "most_used") {
      loadHomeData();
    }
  }, [viewMode]);

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of agents) for (const t of a.roleTags ?? []) if (t) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [agents]);

  /** Ported verbatim from v1's filteredAgents. */
  const visibleAgents = useMemo(() => {
    const baseFiltered = filterAgentsNoSort(agents, "", "all", group);
    const compareMostUsed = (a: Agent, b: Agent) => {
      if (sortBy === "alphabetical") {
        return a.name.localeCompare(b.name);
      }
      const uA = a.usageCount ?? 0;
      const uB = b.usageCount ?? 0;
      if (uB !== uA) return uB - uA;
      switch (sortBy) {
        case "newest":
          return agentNewestMillis(b) - agentNewestMillis(a) || b.promptCount - a.promptCount;
        default:
          return b.promptCount - a.promptCount;
      }
    };

    const globallySorted =
      viewMode === "most_used" && sortBy !== "newest" && sortBy !== "alphabetical"
        ? [...baseFiltered].sort(compareMostUsed)
        : sortAgentsBy(baseFiltered, sortBy);

    const q = search.toLowerCase().trim();
    const searched = q ? globallySorted.filter((a) => a.name.toLowerCase().includes(q)) : globallySorted;
    // Hidden role-tag filter (inert while role === "all"); retained for later use.
    const roleFiltered =
      role === "all" ? searched : searched.filter((a) => (a.roleTags ?? []).includes(role));

    if (viewMode === "all_agents" || viewMode === "most_used") {
      return roleFiltered;
    }

    if (viewMode === "for_my_role") {
      if (sortBy === "newest" || sortBy === "alphabetical") {
        return roleFiltered;
      }
      const matched: Agent[] = [];
      const unmatched: Agent[] = [];
      for (const agent of roleFiltered) {
        if (agentMatchesForMyRole(agent, promptRoles, currentUserRole)) matched.push(agent);
        else unmatched.push(agent);
      }
      return [...matched, ...unmatched];
    }

    return roleFiltered;
  }, [agents, search, sortBy, group, promptRoles, viewMode, currentUserRole, role]);

  /** Ported from v1: live per-group counts, re-filtered by the current search. */
  const groupsWithCounts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return groups.map((g) => {
      if (g.slug === "my-upvotes") return { ...g, count: myCount };
      let list = filterAgents(agents, "", "all", "most_prompts", g.slug);
      if (q) {
        list = list.filter((a) => a.name.toLowerCase().includes(q));
      }
      return { ...g, count: list.length };
    });
  }, [agents, groups, search, myCount]);

  // Publish counts so the sidebar can disable zero-count groups like v1 does.
  useEffect(() => {
    publishGroups(groupsWithCounts);
  }, [groupsWithCounts, publishGroups]);

  /** Ported verbatim from v1's filteredMyUpvotes (content-identity dedup, no sort). */
  const myLikes = useMemo(() => {
    const deduped = new Map<
      string,
      { agentId: number; promptId: number; title: string; description: string; platform?: string; certified: boolean; upvotes: number; author: string }
    >();
    for (const row of myUpvotes) {
      const item = {
        agentId: row.agentId ?? 0,
        promptId: row.promptId ?? 0,
        title: row.title ?? "Unknown",
        description: row.description ?? "",
        platform: row.platform,
        certified: false,
        upvotes: upvoteCounts[`${row.agentId ?? 0}_${row.promptId ?? 0}`] ?? row.upvotes ?? 0,
        author: row.author ?? "",
      };
      const key = getMyUpvoteDedupKey(item);
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, item);
      } else {
        existing.upvotes += item.upvotes;
      }
    }

    let list = Array.from(deduped.values());
    const q = promptSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.author.toLowerCase().includes(q)
      );
    }
    if (showCertifiedOnly) {
      list = list.filter((r) => r.certified);
    }
    return list;
  }, [promptSearch, myUpvotes, showCertifiedOnly, upvoteCounts]);

  function onRunPrompt(text: string, agentId?: number, promptId?: number, platform?: string) {
    if (!text) return;
    if (agentId) trackActivity({ action: "run_prompt", agentId, promptId }).catch(() => undefined);
    const targetUrl = getRunPromptTargetUrl(platform);
    navigator.clipboard.writeText(text).then(() => {
      if (agentId && promptId) {
        trackActivity({ action: "copy_to_clipboard", agentId, promptId }).catch(() => undefined);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      if (targetUrl) window.open(targetUrl, "_blank", "noopener,noreferrer");
    });
  }

  const filtersActive =
    group !== null ||
    search.trim() !== "" ||
    viewMode !== "for_my_role" ||
    sortBy !== "most_prompts" ||
    role !== "all";
  function clearFilters() {
    setGroup(null);
    setSearch("");
    setViewMode("for_my_role");
    setRole("all");
    setSortBy("most_prompts");
  }

  return (
    <>
      <header className="v2-hero">
        <h1 className="v2-hero-title">Proven prompts. Ready now.</h1>
        <p className="v2-hero-sub">The best prompt could come from anyone — including you.</p>
      </header>

      {error ? (
        <div className="v2-error">
          {error}{" "}
          <button type="button" className="v2-retry" onClick={loadHomeData}>
            Retry
          </button>
        </div>
      ) : null}

      <section className="v2-panels">
        {PANELS.map((panel, i) => {
          const board = scoreboards[i];
          const rows = board?.rows ?? [];
          return (
            <div className="v2-panel" key={panel.title}>
              <h2 className="v2-panel-title">{panel.title}</h2>
              <ul className="v2-list">
                {isLoading && rows.length === 0 ? (
                  <li>
                    <span className="v2-rank" />
                    <span className="v2-item-name plain">Loading…</span>
                    <span />
                  </li>
                ) : rows.length === 0 ? (
                  <li>
                    <span className="v2-rank" />
                    <span className="v2-item-name plain">No data yet.</span>
                    <span />
                  </li>
                ) : (
                  rows.map((row, idx) => (
                    <li key={`${row.ranking}-${idx}`}>
                      <span className="v2-rank">
                        {panel.leadWithLetter ? firstLetter(row.name) : row.ranking}
                      </span>
                      <span className={`v2-item-name${panel.linkNames ? "" : " plain"}`} title={row.name}>
                        {row.name}
                      </span>
                      <span className="v2-item-value">{row.value}</span>
                    </li>
                  ))
                )}
              </ul>
              {panel.viewAll ? (
                <div className="v2-panel-footer">
                  <Link className="v2-view-all" href="/prompt-catchup-v2/leaders">
                    {panel.viewAll} <Arrow />
                  </Link>
                </div>
              ) : null}
              {board?.footnote ? <p className="v2-panel-note">{board.footnote}</p> : null}
            </div>
          );
        })}
      </section>

      {group === "my-upvotes" ? (
        <section className="v2-likes">
          <div className="v2-likes-bar">
            <div className="v2-search v2-likes-search">
              <SearchIcon />
              <input
                type="search"
                placeholder="Prompt Search..."
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                aria-label="Search your liked prompts"
              />
            </div>
            <label className="v2-likes-check">
              <input
                type="checkbox"
                checked={showCertifiedOnly}
                onChange={(e) => setShowCertifiedOnly(e.target.checked)}
              />
              <span>Show Certified Prompts</span>
            </label>
            {promptSearch || showCertifiedOnly ? (
              <button
                type="button"
                className="v2-clear"
                onClick={() => {
                  setPromptSearch("");
                  setShowCertifiedOnly(false);
                }}
              >
                ✕ Clear all
              </button>
            ) : null}
          </div>
          <div className="v2-likes-scroll">
            <div className="v2-likes-table">
              <div className="v2-likes-row v2-likes-head">
                <span>Prompt Title</span>
                <span />
                <span>Prompt</span>
                <span>Upvotes</span>
                <span>Author</span>
              </div>
              {myLikes.length ? (
                myLikes.map((row) => (
                  <div className="v2-likes-row" key={`${row.agentId}_${row.promptId}_${row.title}`}>
                    <span className="v2-likes-title">
                      {row.title}
                      {row.certified ? <span className="v2-likes-badge">Certified</span> : null}
                    </span>
                    <span>
                      <button
                        type="button"
                        className="v2-run-btn"
                        onClick={() => onRunPrompt(row.description, row.agentId, row.promptId, row.platform)}
                      >
                        Run Prompt <PlayIcon />
                      </button>
                    </span>
                    <span className="v2-likes-prompt">{row.description}</span>
                    <span>
                      <span className="v2-upvote-pill">
                        <UpvoteIcon /> {row.upvotes} Upvotes
                      </span>
                    </span>
                    <span className="v2-likes-author">{row.author}</span>
                  </div>
                ))
              ) : (
                <div className="v2-likes-empty">
                  No prompts match your filters. Share a prompt or adjust filters.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <>
      <div className="v2-toolbar">
        <div className="v2-search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search for a Prompt"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search for a Prompt"
          />
        </div>
        <div className="v2-toolbar-controls">
          <div className="v2-select">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              aria-label="View mode"
            >
              <option value="for_my_role">For my role</option>
              <option value="most_used">Most used</option>
            </select>
          </div>
          {SHOW_ROLE_FILTER ? (
            <div className="v2-select">
              <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by Role">
                <option value="all">Filter by Role</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="v2-select">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              aria-label="Sort prompts"
            >
              <option value="most_prompts">Sort by Prompt Count</option>
              <option value="newest">Sort by Newest</option>
              <option value="alphabetical">Sort A–Z</option>
            </select>
          </div>
          {filtersActive ? (
            <button type="button" className="v2-clear" onClick={clearFilters}>
              ✕ Clear Filters
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="v2-state">Loading assistants…</div>
      ) : visibleAgents.length === 0 ? (
        <div className="v2-state">No assistants match your filters.</div>
      ) : (
        <section className="v2-cards">
          {visibleAgents.map((agent) => {
            const hasPrompts = agent.promptCount > 0;
            return (
              <article className="v2-card" key={agent.id}>
                <div className="v2-hex" style={{ background: hexColor(agent.name) }}>
                  {firstLetter(agent.name)}
                </div>
                <h3 className="v2-card-name">{agent.name}</h3>
                <p className="v2-card-desc">{agent.description}</p>
                <div className="v2-card-footer">
                  <span className="v2-card-count">
                    {agent.promptCount} {agent.promptCount === 1 ? "prompt" : "prompts"}
                  </span>
                  <Link
                    className="v2-card-link"
                    href={`/prompt-catchup-v2/catalog/${agent.id}`}
                    onClick={() =>
                      trackActivity({ action: "learn_more", agentId: agent.id }).catch(() => undefined)
                    }
                  >
                    {hasPrompts ? "View Prompts" : "Be the First to Share"} <Arrow />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
        </>
      )}

      {copied ? (
        <div className="v2-toast" role="status">
          Prompt copied
        </div>
      ) : null}
    </>
  );
}
