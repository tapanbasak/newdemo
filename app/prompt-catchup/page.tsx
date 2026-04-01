"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filterAgents } from "@/lib/filter";
import { Agent, Group, SortBy } from "@/lib/types";
import { getMyUpvotes } from "@/lib/client-api";
import { CURRENT_USER_ROLE, ViewMode } from "@/lib/view-meta";

type ScoreboardRow = { ranking: string; name: string; value: string };
type Scoreboard = { title: string; columns: string[]; rows: ScoreboardRow[]; footnote?: string };

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
  const [myUpvotes, setMyUpvotes] = useState<
    Array<{ title?: string; description?: string; author?: string; upvotes?: number }>
  >([]);
  const [promptSearch, setPromptSearch] = useState("");
  const [showCertifiedOnly, setShowCertifiedOnly] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [loadError, setLoadError] = useState("");

  async function loadHomeData() {
    setLoadError("");
    try {
      const [myUpvotes, homeData] = await Promise.all([
      getMyUpvotes().catch(() => []),
      fetch("/api/home").then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || "Unable to load home data.");
        }
        return r.json();
      }),
      ]);
      setMyCount(myUpvotes.length);
      setMyUpvotes(myUpvotes);
      setAgents(homeData.agents ?? []);
      setGroups(homeData.groups ?? []);
      setScoreboards(homeData.scoreboards ?? []);
      setSidebarLinks(homeData.sidebarLinks ?? []);
      setPromptTextsByAgent(homeData.promptTextsByAgent ?? {});
    } catch {
      setAgents([]);
      setGroups([]);
      setScoreboards([]);
      setSidebarLinks([]);
      setLoadError("Unable to load home data right now. Please check MongoDB connection and try again.");
    }
  }

  useEffect(() => {
    loadHomeData();
  }, []);

  const filteredAgents = useMemo(() => {
    const byFilter = filterAgents(agents, "", "all", sort, group);
    const q = search.toLowerCase().trim();
    let searched = byFilter;
    if (q) {
      searched = byFilter.filter((a) => {
        const texts = promptTextsByAgent[a.id];
        if (!texts?.length) return false;
        return texts.some((t) => t.toLowerCase().includes(q));
      });
    }

    if (viewMode === "all_agents") return searched;

    if (viewMode === "most_used") {
      return [...searched].sort((a, b) => {
        const uA = a.usageCount ?? 0;
        const uB = b.usageCount ?? 0;
        return uB - uA || b.promptCount - a.promptCount;
      });
    }

    const matched: typeof searched = [];
    const unmatched: typeof searched = [];
    for (const agent of searched) {
      const tags = agent.roleTags ?? [];
      if (tags.includes(CURRENT_USER_ROLE)) matched.push(agent);
      else unmatched.push(agent);
    }
    matched.sort((a, b) => {
      const uA = a.usageCount ?? 0;
      const uB = b.usageCount ?? 0;
      return uB - uA || b.promptCount - a.promptCount;
    });
    unmatched.sort((a, b) => {
      const uA = a.usageCount ?? 0;
      const uB = b.usageCount ?? 0;
      return uB - uA || b.promptCount - a.promptCount;
    });
    return [...matched, ...unmatched];
  }, [agents, search, sort, group, promptTextsByAgent, viewMode]);

  const groupsWithCounts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return groups.map((g) => {
      if (g.slug === "my-upvotes") return { ...g, count: myCount };
      let list = filterAgents(agents, "", "all", "most_prompts", g.slug);
      if (q) {
        list = list.filter((a) => {
          const texts = promptTextsByAgent[a.id];
          if (!texts?.length) return false;
          return texts.some((t) => t.toLowerCase().includes(q));
        });
      }
      return { ...g, count: list.length };
    });
  }, [agents, groups, search, myCount, promptTextsByAgent]);

  const filteredMyUpvotes = useMemo(() => {
    if (group !== "my-upvotes") return [];
    const q = promptSearch.toLowerCase().trim();
    let list = myUpvotes.map((row) => ({
      title: row.title ?? "Unknown",
      description: row.description ?? "",
      certified: false,
      upvotes: row.upvotes ?? 0,
      author: row.author ?? "",
    }));
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
  }, [group, promptSearch, myUpvotes, showCertifiedOnly]);

  function onRunPrompt(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2500);
      window.open("https://www.vortexiq.ai/contact-us", "_blank", "noopener,noreferrer");
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
              </div>
            </div>
          ))}
        </div>

        <div className="row g-4">
          <div className="col-12 col-md-3 col-lg-2">
            <aside className="pcu-sidebar">
              <h3 className="pcu-sidebar-heading">Groups</h3>
              <div className="pcu-group-chips">
                {groupsWithCounts.map((g) => (
                  <button
                    key={g.slug}
                    className={`pcu-group-chip ${group === g.slug ? "active" : ""}`}
                    onClick={() => setGroup(group === g.slug ? null : g.slug)}
                  >
                    {g.name}
                    <span className="pcu-chip-count">{g.count}</span>
                  </button>
                ))}
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
                      <div className="table-row pcu-myupvote-row" key={`${row.title}-${row.author}`}>
                        <div className="col col-title">
                          <div className="pcu-myupvote-title">{row.title}</div>
                          {row.certified ? <div className="prompt-certified">Certified</div> : null}
                        </div>
                        <div className="col col-run">
                          <button type="button" className="run-prompt-btn" onClick={() => onRunPrompt(row.description)}>
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
                  <input className="form-control" placeholder="Search prompts" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <select className="form-select" value={viewMode} onChange={(e) => setViewMode(e.target.value as ViewMode)}>
                    <option value="for_my_role">For my role</option>
                    <option value="most_used">Most used</option>
                    <option value="all_agents">All agents</option>
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
                  {filteredAgents.map((a) => (
                    <div key={a.id} className="pcu-agent-card">
                      <div className="pcu-agent-header">
                        <div className="pcu-hexagon-icon">
                          <svg viewBox="0 0 100 100" width="40" height="40">
                            <polygon points="50,3 93,25 93,75 50,97 7,75 7,25" fill="#0a1929" stroke="#1976d2" strokeWidth="3" />
                            <text x="50" y="58" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="600">{a.name.charAt(0)}</text>
                          </svg>
                        </div>
                        {a.status !== "ADOPT" ? (
                          <span className="pcu-status-badge badge-evaluation">UNDER EVALUATION</span>
                        ) : null}
                      </div>
                      <h4 className="pcu-agent-name">{a.name}</h4>
                      <p className="pcu-agent-description">{a.description}</p>
                      <div className="pcu-agent-footer">
                        <span className="pcu-prompt-count">{a.promptCount} prompts</span>
                        <Link className="pcu-learn-more" href={`/prompt-catchup/catalog/${a.id}`}>Learn More →</Link>
                      </div>
                    </div>
                  ))}
                  {filteredAgents.length === 0 && <div className="pcu-empty">No agents match your filters. Try adjusting your search or filters.</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
