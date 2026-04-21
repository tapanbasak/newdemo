"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { agentNewestMillis, filterAgents, filterAgentsNoSort, sortAgentsBy } from "@/lib/filter";
import { Agent, Group, SortBy } from "@/lib/types";
import { getMyUpvotes, getUpvoteCounts, trackActivity } from "@/lib/client-api";
import { getRunPromptTargetUrl } from "@/lib/run-prompt";
import { agentMatchesForMyRole, type PromptRoleHint } from "@/lib/for-my-role";
import { CURRENT_USER_ROLE, ViewMode } from "@/lib/view-meta";

type ScoreboardRow = { ranking: string; name: string; value: string };
type Scoreboard = { title: string; columns: string[]; rows: ScoreboardRow[]; footnote?: string };
type MyUpvoteRow = {
  agentId?: number;
  promptId?: number;
  title?: string;
  description?: string;
  author?: string;
  upvotes?: number;
  platform?: string;
};

function normalizeGroups(input: Group[]): Group[] {
  const mapped = input.map((g) =>
    g.slug === "agents" ? { ...g, name: "Assistants" } : g
  );
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

export default function PromptCatchupPage() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("for_my_role");
  const [sort, setSort] = useState<SortBy>("most_prompts");
  const [group, setGroup] = useState<string | null>(null);
  const [myCount, setMyCount] = useState(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scoreboards, setScoreboards] = useState<Scoreboard[]>([]);
  const [sidebarLinks, setSidebarLinks] = useState<Array<{ label: string; href?: string }>>([]);
  const [promptTextsByAgent, setPromptTextsByAgent] = useState<Record<number, string[]>>({});
  const [promptRolesByAgent, setPromptRolesByAgent] = useState<Record<number, PromptRoleHint[]>>({});
  const [myUpvotes, setMyUpvotes] = useState<MyUpvoteRow[]>([]);
  const [upvoteCounts, setUpvoteCounts] = useState<Record<string, number>>({});
  const [promptSearch, setPromptSearch] = useState("");
  const [showCertifiedOnly, setShowCertifiedOnly] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>(CURRENT_USER_ROLE);

  const applyStoredUserRole = () => {
    const fromStorage = localStorage.getItem("pcu_user_role");
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
    setLoadError("");
    setIsLoading(true);
    try {
      const [myUpvotes, counts, homeData] = await Promise.all([
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
      setMyCount(Array.from(new Set(myUpvotes.map((row) => getMyUpvoteDedupKey(row)))).length);
      setMyUpvotes(myUpvotes);
      setAgents(homeData.agents ?? []);
      setGroups(normalizeGroups(homeData.groups ?? []));
      setScoreboards(homeData.scoreboards ?? []);
      setSidebarLinks(homeData.sidebarLinks ?? []);
      setPromptTextsByAgent(homeData.promptTextsByAgent ?? {});
      setPromptRolesByAgent(homeData.promptRolesByAgent ?? {});
      setIsLoading(false);
    } catch {
      setAgents([]);
      setGroups([]);
      setScoreboards([]);
      setSidebarLinks([]);
      setUpvoteCounts({});
      setPromptTextsByAgent({});
      setPromptRolesByAgent({});
      setLoadError("Unable to load home data right now. Please check MongoDB connection and try again.");
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadHomeData();
  }, []);

  useEffect(() => {
    if (viewMode === "most_used") {
      loadHomeData();
    }
  }, [viewMode]);

  const filteredAgents = useMemo(() => {
    const baseFiltered = filterAgentsNoSort(agents, "", "all", group);
    const compareMostUsed = (a: Agent, b: Agent) => {
      // Alphabetical should always be based on agent card title only.
      if (sort === "alphabetical") {
        return a.name.localeCompare(b.name);
      }
      const uA = a.usageCount ?? 0;
      const uB = b.usageCount ?? 0;
      if (uB !== uA) return uB - uA;
      switch (sort) {
        case "newest":
          return agentNewestMillis(b) - agentNewestMillis(a) || b.promptCount - a.promptCount;
        default:
          return b.promptCount - a.promptCount;
      }
    };

    // Apply sorting on the full eligible dataset first, then filter.
    const globallySorted =
      viewMode === "most_used" ? [...baseFiltered].sort(compareMostUsed) : sortAgentsBy(baseFiltered, sort);

    const q = search.toLowerCase().trim();
    const searched = q ? globallySorted.filter((a) => a.name.toLowerCase().includes(q)) : globallySorted;

    if (viewMode === "all_agents" || viewMode === "most_used" || viewMode === "for_my_role") {
      return searched;
    }

    return searched;
  }, [agents, search, sort, group, viewMode]);

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

  const filteredMyUpvotes = useMemo(() => {
    if (group !== "my-upvotes") return [];
    const q = promptSearch.toLowerCase().trim();
    const deduped = new Map<
      string,
      {
        agentId: number;
        promptId: number;
        title: string;
        description: string;
        platform?: string;
        certified: boolean;
        upvotes: number;
        author: string;
      }
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
  }, [group, promptSearch, myUpvotes, showCertifiedOnly, upvoteCounts]);

  function onRunPrompt(text: string, agentId?: number, promptId?: number, platform?: string) {
    if (!text) return;
    if (agentId) {
      trackActivity({ action: "run_prompt", agentId, promptId }).catch(() => undefined);
    }
    const targetUrl = getRunPromptTargetUrl(platform);
    navigator.clipboard.writeText(text).then(() => {
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2500);
      if (targetUrl) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  return (
    <div>
      <div className="pcu-banner">
        <div className="container-fluid pcu-container-fluid">
          <h1 className="pcu-banner-title">Prompt Catch Up</h1>
          <p className="pcu-banner-subtitle">Share your best prompts. Earn recognition. Watch your Time Saved grow.</p>
        </div>
      </div>

      <div className="container-fluid pcu-page-body">
        {loadError ? (
          <div className="error-banner">
            {loadError}{" "}
            <button type="button" className="error-retry-btn" onClick={loadHomeData}>
              Retry
            </button>
          </div>
        ) : null}
        <div className="row g-3 pcu-scoreboards">
          {scoreboards.map((board) => (
            <div className="col-12 col-md-4" key={board.title}>
              <div className="pcu-scoreboard-card">
                <h3 className="pcu-scoreboard-title">{board.title}</h3>
                <table className="pcu-scoreboard-table">
                  <thead>
                    <tr>
                      {board.columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {board.rows.map((row) => (
                      <tr key={row.ranking}>
                        <td className="pcu-rank-cell">{row.ranking}</td>
                        <td className="pcu-name-cell"><a href="#">{row.name}</a></td>
                        <td className="pcu-value-cell">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {"footnote" in board && board.footnote ? <p className="pcu-scoreboard-footnote">{board.footnote}</p> : null}
                {board.title === "Prompt Engineering Champions" ? (
                  <div className="pcu-scoreboard-actions">
                    <Link className="pcu-view-all-btn" href="/prompt-catchup/champions">
                      View all
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4">
          <div className="col-12 col-md-3 col-lg-2">
            <aside className="pcu-sidebar">
              <h3 className="pcu-sidebar-heading">Groups</h3>
              <div className="pcu-group-chips">
                {groupsWithCounts.map((g) => {
                  const isDisabled = g.slug === "agent" && g.count === 0;
                  return (
                  <button
                    key={g.slug}
                    className={`pcu-group-chip ${group === g.slug ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
                    onClick={() => {
                      if (isDisabled) return;
                      setGroup(group === g.slug ? null : g.slug);
                    }}
                    disabled={isDisabled}
                  >
                    {g.name}
                    <span className="pcu-chip-count">{g.count}</span>
                  </button>
                );
                })}
              </div>
              <div className="pcu-sidebar-links">
                {sidebarLinks.map((link) => (
                  link.href ? (
                    <Link key={link.label} href={link.href} className="pcu-sidebar-link">
                      {link.label}
                    </Link>
                  ) : (
                    <span key={link.label} className="pcu-sidebar-link pcu-sidebar-link-static">
                      {link.label}
                    </span>
                  )
                ))}
              </div>
            </aside>
          </div>

          <div className="col-12 col-md-9 col-lg-10">
            {group === "my-upvotes" ? (
              <div className="pcu-my-upvotes-view">
                {showCopiedMessage ? <div className="copy-toast" role="status">Prompt copied</div> : null}
                <div className="pcu-filter-bar">
                  <input
                    className="form-control"
                    placeholder="Prompt Search..."
                    value={promptSearch}
                    onChange={(e) => setPromptSearch(e.target.value)}
                  />
                  <select className="form-select" defaultValue="Most Upvotes">
                    <option>Most Upvotes</option>
                    <option>Newest</option>
                  </select>
                  <button className="btn btn-outline-secondary" onClick={() => { setPromptSearch(""); setShowCertifiedOnly(false); }}>
                    Clear all
                  </button>
                </div>
                <section className="catalog-controls">
                  <label className="toggle-certified">
                    <input
                      type="checkbox"
                      checked={showCertifiedOnly}
                      onChange={(e) => setShowCertifiedOnly(e.target.checked)}
                    />
                    <span>Show Certified Prompts</span>
                  </label>
                </section>
                <section className="catalog-table">
                  <div className="table-header pcu-myupvote-row">
                    <div className="col col-title">Prompt Title</div>
                    <div className="col col-run col-run-header"></div>
                    <div className="col col-prompt">Prompt</div>
                    <div className="col col-upvotes">Upvotes</div>
                    <div className="col col-author">Author</div>
                  </div>
                  {filteredMyUpvotes.length ? (
                    filteredMyUpvotes.map((row) => (
                      <div
                        className="table-row pcu-myupvote-row"
                        key={`${row.agentId ?? "na"}_${row.promptId ?? "na"}_${row.title}`}
                      >
                        <div className="col col-title">
                          <div className="pcu-myupvote-title">{row.title}</div>
                          {row.certified ? <div className="prompt-certified">Certified</div> : null}
                        </div>
                        <div className="col col-run">
                          <button
                            type="button"
                            className="run-prompt-btn"
                            onClick={() => onRunPrompt(row.description, row.agentId, row.promptId, row.platform)}
                          >
                            Run Prompt
                            <span className="btn-icon run-icon" aria-hidden="true">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7L8 5z" />
                              </svg>
                            </span>
                          </button>
                        </div>
                        <div className="col col-prompt">
                          <p className="prompt-text">{row.description}</p>
                        </div>
                        <div className="col col-upvotes">
                          <span className="upvote-pill upvoted">
                            <span className="btn-icon upvote-icon" aria-hidden="true">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2zm0 4l-3 7H9V9l4.34-4.34L12.23 10H20v2z" />
                              </svg>
                            </span>
                            {row.upvotes} Upvotes
                          </span>
                        </div>
                        <div className="col col-author">{row.author}</div>
                      </div>
                    ))
                  ) : (
                    <div className="catalog-empty">No prompts match your filters. Share a prompt or adjust filters.</div>
                  )}
                </section>
              </div>
            ) : (
              <>
                <div className="pcu-filter-bar">
                  <input className="form-control" placeholder="Search by card title" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <select className="form-select" value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
                    <option value="for_my_role">For my role</option>
                    <option value="most_used">Most used</option>
                  </select>
                  <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value as SortBy)}>
                    <option value="most_prompts">Most Prompts</option>
                    <option value="newest">Newest</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                  <button className="btn btn-outline-secondary" onClick={() => { setSearch(""); setViewMode("for_my_role"); setSort("most_prompts"); setGroup(null); }}>
                    Clear All
                  </button>
                </div>
                <div className="pcu-agent-grid">
                  {isLoading ? <div className="pcu-empty">Loading agents/assistants...</div> : null}
                  {filteredAgents.map((a) => (
                    <div key={a.id} className="pcu-agent-card">
                      <div className="pcu-agent-header">
                        <div className="pcu-hexagon-icon">
                          <svg viewBox="0 0 100 100" width="40" height="40">
                            <polygon points="50,3 93,25 93,75 50,97 7,75 7,25" fill="#0a1929" stroke="#1976d2" strokeWidth="3" />
                            <text x="50" y="58" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="600">{a.name.charAt(0)}</text>
                          </svg>
                        </div>
                        {/* {a.status !== "ADOPT" ? (
                          <span className="pcu-status-badge badge-evaluation">UNDER EVALUATION</span>
                        ) : null} */}
                      </div>
                      <h4 className="pcu-agent-name">{a.name}</h4>
                      <p className="pcu-agent-description">{a.description}</p>
                      <div className="pcu-agent-footer">
                        <span className="pcu-prompt-count">{a.promptCount} prompts</span>
                        <Link
                          className="pcu-learn-more"
                          href={`/prompt-catchup/catalog/${a.id}`}
                          onClick={() =>
                            trackActivity({ action: "learn_more", agentId: a.id }).catch(() => undefined)
                          }
                        >
                          Learn More →
                        </Link>
                      </div>
                    </div>
                  ))}
                  {!isLoading && filteredAgents.length === 0 && (
                    <div className="pcu-empty">No agents/assistants match your filters. Try adjusting your search or filters.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
