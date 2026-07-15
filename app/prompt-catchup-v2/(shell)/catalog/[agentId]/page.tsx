"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import type { PromptCatalog, PromptCatalogItem } from "@/lib/types";
import { getMyUpvotes, trackActivity, upvotePrompt } from "@/lib/client-api";
import { getRunPromptTargetUrl } from "@/lib/run-prompt";

/**
 * v2 Prompt Catalog — UI re-skin of app/prompt-catchup/catalog/[agentId]/page.tsx.
 * Data loading, search, upvoting and Run Prompt are ported verbatim from v1, so
 * both versions read and write identical data.
 *
 * UI-ONLY ADDITIONS (present in the v2 design, absent from v1). Each reorders or
 * re-presents data already in memory — no API call, no payload change, nothing
 * persisted, so v1 behaviour is unaffected:
 *   - Sort by: Date / Likes / A-Z tabs (below)
 *   - the "Not Certified" badge (v1 rendered nothing when uncertified)
 */
type CatalogSort = "default" | "date" | "likes" | "az";

const SORT_TABS: Array<{ key: CatalogSort; label: string }> = [
  { key: "date", label: "Date" },
  { key: "likes", label: "Likes" },
  { key: "az", label: "A-Z" },
];

async function loadCatalog(agentId: number): Promise<PromptCatalog> {
  const res = await fetch(`/api/catalog/${agentId}`);
  if (!res.ok) {
    throw new Error("Failed to load catalog");
  }
  return (await res.json()) as PromptCatalog;
}

function SearchIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
    </svg>
  );
}

/** "06/16/2026" style date, falling back to the raw string when unparseable. */
function formatDate(value?: string): string {
  if (!value) return "";
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return value;
  const d = new Date(t);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

export default function CatalogPage({ params }: { params: Promise<{ agentId: string }> }) {
  const routeAgentId = use(params).agentId;
  const agentId = Number(routeAgentId);

  const [catalog, setCatalog] = useState<PromptCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCertifiedOnly, setShowCertifiedOnly] = useState(false);
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<CatalogSort>("default");

  const loadPageData = useCallback(async (targetAgentId: number) => {
    if (!targetAgentId) return;
    setError("");
    setIsLoading(true);
    try {
      const [catalogData, my] = await Promise.all([loadCatalog(targetAgentId), getMyUpvotes()]);
      setCatalog(catalogData);
      const myMap: Record<string, boolean> = {};
      my.forEach((m) => (myMap[`${m.agentId}_${m.promptId}`] = true));
      setMine(myMap);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load catalog.";
      setError(message);
      setCatalog(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!agentId) return;
    setCatalog(null);
    loadPageData(agentId);
  }, [agentId, loadPageData]);

  /** Filtering ported verbatim from v1 (title + prompt body + description). */
  const filtered = useMemo(() => {
    if (!catalog) return [];
    const base = showCertifiedOnly ? catalog.prompts.filter((p) => p.certified) : catalog.prompts;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) =>
      [p.title, p.prompt ?? "", p.description ?? ""].some((text) =>
        String(text).toLowerCase().includes(q)
      )
    );
  }, [catalog, showCertifiedOnly, search]);

  /**
   * UI-only client-side reorder of the already-fetched list. "default" is the
   * initial state and leaves v1's server order (promptId ASC) untouched, so the
   * page loads exactly as v1 does until the user opts into a sort.
   *
   * Caveat: `lastUpdated` is persisted as "" by both the share flow and the
   * seeder, and the catalog API maps "" -> undefined, so the Date comparator
   * returns 0 for virtually every prompt and the order is left as-is. Populating
   * that field would be a backend change, which is deliberately out of scope.
   */
  const visible = useMemo(() => {
    if (sort === "default") return filtered;
    const list = [...filtered];
    if (sort === "az") return list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "likes") return list.sort((a, b) => b.upvotes - a.upvotes);
    return list.sort((a, b) => {
      const bt = b.lastUpdated ? Date.parse(b.lastUpdated) : 0;
      const at = a.lastUpdated ? Date.parse(a.lastUpdated) : 0;
      return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
    });
  }, [filtered, sort]);

  const showCatalogLoading = !agentId || isLoading;

  async function onUpvote(prompt: PromptCatalogItem) {
    setError("");
    try {
      await upvotePrompt({
        agentId,
        promptId: prompt.id,
        title: prompt.title,
        description: prompt.description,
        author: prompt.author,
      });
      const key = `${agentId}_${prompt.id}`;
      setMine((prev) => ({ ...prev, [key]: true }));
      setCatalog((prev) =>
        prev
          ? {
              ...prev,
              prompts: prev.prompts.map((p) => (p.id === prompt.id ? { ...p, upvotes: p.upvotes + 1 } : p)),
            }
          : prev
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to upvote prompt.";
      setError(message);
    }
  }

  function onRunPrompt(prompt: PromptCatalogItem) {
    const text = prompt.prompt || prompt.description || "";
    if (!text) return;
    trackActivity({ action: "run_prompt", agentId, promptId: prompt.id }).catch(() => undefined);
    const targetUrl = getRunPromptTargetUrl(prompt.platform);

    navigator.clipboard.writeText(text).then(() => {
      trackActivity({ action: "copy_to_clipboard", agentId, promptId: prompt.id }).catch(() => undefined);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2500);
      if (targetUrl) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  return (
    <>
      <nav className="v2-crumbs" aria-label="Breadcrumb">
        <Link href="/prompt-catchup-v2">Home</Link>
        <span className="v2-crumb-sep">/</span>
        <span className="v2-crumb-current">{catalog?.title ?? "Prompt Catalog"}</span>
      </nav>

      <div className="v2-cat-head">
        <div>
          <h1 className="v2-cat-title">
            {catalog?.title ?? (showCatalogLoading ? "Loading…" : "Prompt Catalog")}
          </h1>
          {catalog?.subtitle ? <p className="v2-cat-sub">{catalog.subtitle}</p> : null}
        </div>
        <div className="v2-search v2-cat-search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search for Prompts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search for Prompts"
          />
        </div>
      </div>

      {error ? (
        <div className="v2-error">
          {error}{" "}
          <button type="button" className="v2-retry" onClick={() => loadPageData(agentId)}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="v2-cat-controls">
        <label className="v2-likes-check">
          <input
            type="checkbox"
            checked={showCertifiedOnly}
            onChange={(e) => setShowCertifiedOnly(e.target.checked)}
          />
          <span>Show Certified Prompts</span>
        </label>
        <div className="v2-cat-controls-right">
          <span className="v2-cat-count">
            {showCatalogLoading ? "…" : `${filtered.length} Prompts Found`}
          </span>
          <div className="v2-sortby">
            <span className="v2-sortby-label">Sort by:</span>
            {SORT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`v2-sort-tab${sort === tab.key ? " active" : ""}`}
                onClick={() => setSort((prev) => (prev === tab.key ? "default" : tab.key))}
                aria-pressed={sort === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showCatalogLoading ? (
        <div className="v2-state">Loading prompts…</div>
      ) : visible.length === 0 ? (
        <div className="v2-state">
          {catalog && catalog.prompts.length === 0 ? (
            <>
              No prompts yet.{" "}
              <Link className="v2-card-link" href="/prompt-catchup-v2/share">
                Be the first to share one.
              </Link>
            </>
          ) : (
            "No prompts match your filters."
          )}
        </div>
      ) : (
        <section className="v2-cat-list">
          {visible.map((item) => {
            const key = `${agentId}_${item.id}`;
            const alreadyUpvoted = Boolean(mine[key]);
            return (
              <article className="v2-cat-item" key={item.id}>
                <div className="v2-cat-item-main">
                  <h2 className="v2-cat-item-title">
                    <Link href={`/prompt-catchup-v2/catalog/${agentId}/prompt/${item.id}`}>
                      {item.title}
                    </Link>
                    <span className={`v2-badge${item.certified ? " certified" : ""}`}>
                      {item.certified ? "✓ Certified" : "Not Certified"}
                    </span>
                  </h2>
                  <p className="v2-cat-meta">
                    <strong>Author:</strong> {item.author || "Unknown"}
                    {item.lastUpdated ? (
                      <>
                        <span className="v2-cat-meta-gap" />
                        <strong>Date:</strong> {formatDate(item.lastUpdated)}
                      </>
                    ) : null}
                  </p>
                  <p className="v2-cat-desc">{item.prompt || item.description}</p>
                </div>
                <div className="v2-cat-item-side">
                  <button
                    type="button"
                    className={`v2-cat-likes${alreadyUpvoted ? " upvoted" : ""}`}
                    onClick={() => onUpvote(item)}
                    disabled={alreadyUpvoted}
                    title={alreadyUpvoted ? "You already liked this prompt" : "Like this prompt"}
                  >
                    {item.upvotes} likes <LikeIcon />
                  </button>
                  <button type="button" className="v2-run-link" onClick={() => onRunPrompt(item)}>
                    <PlayIcon /> Run Prompt
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showCopiedMessage ? (
        <div className="v2-toast" role="status">
          Prompt copied
        </div>
      ) : null}
    </>
  );
}
