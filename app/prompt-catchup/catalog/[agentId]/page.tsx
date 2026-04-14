"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getMyUpvotes, trackActivity, upvotePrompt } from "@/lib/client-api";
import { getRunPromptTargetUrl } from "@/lib/run-prompt";
import { PromptCatalog, PromptCatalogItem } from "@/lib/types";

async function loadCatalog(agentId: number): Promise<PromptCatalog> {
  const res = await fetch(`/api/catalog/${agentId}`);
  if (!res.ok) {
    throw new Error("Failed to load catalog");
  }
  return (await res.json()) as PromptCatalog;
}

export default function PromptCatalogPage({ params }: { params: Promise<{ agentId: string }> }) {
  const [agentId, setAgentId] = useState(0);
  const [catalog, setCatalog] = useState<PromptCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCertifiedOnly, setShowCertifiedOnly] = useState(false);
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [error, setError] = useState("");

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
    params.then((p) => setAgentId(Number(p.agentId)));
  }, [params]);

  useEffect(() => {
    if (!agentId) return;
    setCatalog(null);
    loadPageData(agentId);
  }, [agentId, loadPageData]);

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

  /** Route params not resolved yet, or catalog fetch in progress */
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
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2500);
      if (targetUrl) {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  return (
    <div className="catalog-page-wrapper pcu-page-body">
      {showCopiedMessage ? <div className="copy-toast" role="status">Prompt copied</div> : null}
      {error ? (
        <div className="error-banner">
          {error}{" "}
          <button type="button" className="error-retry-btn" onClick={() => loadPageData(agentId)}>
            Retry
          </button>
        </div>
      ) : null}
      <nav className="breadcrumb">
        <Link href="/prompt-catchup">Prompt Catch Up</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{catalog?.title ?? "Prompt Catalog"}</span>
      </nav>
      <div className="catalog-page">
        <div className="catalog-sidebar">
          <div className="sidebar-search">
            <input
              className="sidebar-search-input"
              placeholder="Search for Prompts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <nav className="sidebar-nav">
            <Link href="/prompt-catchup" className="sidebar-link">Home</Link>
            <Link href="/prompt-catchup/share" className="sidebar-link">Share your Prompt</Link>
          </nav>
          <div className="prompt-list">
            <h4 className="prompt-list-heading">Prompts</h4>
            <ul className="prompt-list-ul">
              {(catalog?.prompts ?? []).map((p) => (
                <li key={p.id} className="prompt-list-item">
                  <Link href={`/prompt-catchup/catalog/${agentId}/prompt/${p.id}`} className="prompt-list-link">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="catalog-main">
          <header className="catalog-header">
            <h1 className="catalog-title">{catalog?.title ?? "Prompt Catalog"}</h1>
            <p className="catalog-subtitle">{catalog?.subtitle ?? ""}</p>
            <div className="catalog-meta">
              <span>{showCatalogLoading ? "…" : `${filtered.length} Prompts Found`}</span>
            </div>
          </header>
          <section className="catalog-controls">
            <label className="toggle-certified">
              <input type="checkbox" checked={showCertifiedOnly} onChange={(e) => setShowCertifiedOnly(e.target.checked)} />
              <span>Show Certified Prompts</span>
            </label>
          </section>
          <section className="catalog-table">
            {showCatalogLoading ? (
              <div className="catalog-loading" role="status" aria-live="polite">
                <div className="pcu-spinner" aria-hidden="true" />
                <p>Loading prompts…</p>
              </div>
            ) : error ? null : filtered.length === 0 ? (
              <div className="catalog-empty">
                No prompts yet. <Link href="/prompt-catchup/share">Be the first to share one.</Link>
              </div>
            ) : (
              <>
                <div className="table-header catalog-prompt-row">
                  <div className="col col-title">Prompt Title</div>
                  <div className="col col-run col-run-header"></div>
                  <div className="col col-prompt">Prompt</div>
                  <div className="col col-upvotes">Upvotes</div>
                  <div className="col col-author">Author</div>
                </div>
                {filtered.map((prompt) => {
                  const key = `${agentId}_${prompt.id}`;
                  return (
                    <div className="table-row catalog-prompt-row" key={prompt.id}>
                      <div className="col col-title">
                        <Link href={`/prompt-catchup/catalog/${agentId}/prompt/${prompt.id}`} className="prompt-title-link">
                          {prompt.title}
                        </Link>
                        {prompt.certified ? <div className="prompt-certified">Certified</div> : null}
                      </div>
                      <div className="col col-run">
                        <button type="button" className="run-prompt-btn" onClick={() => onRunPrompt(prompt)}>
                          Run Prompt
                          <span className="btn-icon run-icon" aria-hidden="true">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7L8 5z" />
                            </svg>
                          </span>
                        </button>
                      </div>
                      <div className="col col-prompt">
                        <p className="prompt-text">{prompt.prompt || prompt.description}</p>
                      </div>
                      <div className="col col-upvotes">
                        <button type="button" className={`upvote-pill ${mine[key] ? "upvoted" : ""}`} onClick={() => onUpvote(prompt)} disabled={mine[key]}>
                          <span className="btn-icon upvote-icon" aria-hidden="true">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2zm0 4l-3 7H9V9l4.34-4.34L12.23 10H20v2z" />
                            </svg>
                          </span>
                          {prompt.upvotes} Upvotes
                        </button>
                      </div>
                      <div className="col col-author">{prompt.author}</div>
                    </div>
                  );
                })}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
