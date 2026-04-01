"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { addComment, fetchComments, getMyUpvotes, upvotePrompt } from "@/lib/client-api";
import { PromptCatalog, PromptCatalogItem } from "@/lib/types";

export default function PromptDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; promptId: string }>;
}) {
  const [agentId, setAgentId] = useState(0);
  const [promptId, setPromptId] = useState(0);
  const [prompt, setPrompt] = useState<PromptCatalogItem | null>(null);
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; timeAgo: string }>>([]);
  const [commentText, setCommentText] = useState("");
  const [upvoted, setUpvoted] = useState(false);
  const [catalog, setCatalog] = useState<PromptCatalog | null>(null);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [error, setError] = useState("");

  async function loadPageData(targetAgentId: number, targetPromptId: number) {
    if (!targetAgentId || !targetPromptId) return;
    setError("");
    try {
      const [p, cat, c, my] = await Promise.all([
        loadPrompt(targetAgentId, targetPromptId),
        loadCatalog(targetAgentId),
        fetchComments(targetAgentId, targetPromptId),
        getMyUpvotes(),
      ]);
      setPrompt(p);
      setCatalog(cat);
      setComments(c);
      setUpvoted(my.some((m) => m.agentId === targetAgentId && m.promptId === targetPromptId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load prompt details.";
      setError(message);
    }
  }

  useEffect(() => {
    params.then((p) => {
      setAgentId(Number(p.agentId));
      setPromptId(Number(p.promptId));
    });
  }, [params]);

  useEffect(() => {
    if (!agentId || !promptId) return;
    loadPageData(agentId, promptId);
  }, [agentId, promptId]);

  async function handleUpvote() {
    if (!prompt || upvoted) return;
    setError("");
    try {
      await upvotePrompt({
        agentId,
        promptId,
        title: prompt.title,
        description: prompt.description,
        author: prompt.author,
      });
      setPrompt({ ...prompt, upvotes: prompt.upvotes + 1 });
      setUpvoted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to upvote prompt.";
      setError(message);
    }
  }

  async function handleComment() {
    const text = commentText.trim();
    if (!text) return;
    await addComment({ agentId, promptId, author: "Current User", text });
    const latest = await fetchComments(agentId, promptId);
    setComments(latest);
    setCommentText("");
  }

  if (!prompt) {
    return (
      <div className="pcu-container">
        {error ? (
          <div className="error-banner">
            {error}{" "}
            <button type="button" className="error-retry-btn" onClick={() => loadPageData(agentId, promptId)}>
              Retry
            </button>
          </div>
        ) : "Loading..."}
      </div>
    );
  }

  return (
    <div className="detail-page-wrapper pcu-page-body">
      {showCopiedMessage ? <div className="copy-toast" role="status">Prompt copied</div> : null}
      {error ? (
        <div className="error-banner">
          {error}{" "}
          <button type="button" className="error-retry-btn" onClick={() => loadPageData(agentId, promptId)}>
            Retry
          </button>
        </div>
      ) : null}
      <nav className="breadcrumb">
        <Link href="/prompt-catchup">Prompt Catch Up</Link>
        <span className="breadcrumb-separator">/</span>
        <Link href={`/prompt-catchup/catalog/${agentId}`}>{catalog?.title ?? "Prompt Catalog"}</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{prompt.title}</span>
      </nav>
      <div className="detail-page">
        <aside className="detail-sidebar">
          <div className="sidebar-search">
            <input type="text" className="sidebar-search-input" placeholder="Search for Prompts" />
          </div>
          <nav className="sidebar-nav">
            <Link href="/prompt-catchup" className="sidebar-link">Home</Link>
            <Link href="/prompt-catchup/share" className="sidebar-link">Share your Prompt</Link>
          </nav>
          <div className="prompt-list">
            <h4 className="prompt-list-heading">Prompts</h4>
            <ul className="prompt-list-ul">
              {(catalog?.prompts ?? []).map((item) => (
                <li key={item.id} className={`prompt-list-item ${item.id === promptId ? "active" : ""}`}>
                  <Link href={`/prompt-catchup/catalog/${agentId}/prompt/${item.id}`} className="prompt-list-link">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="detail-main">
          <header className="detail-header">
            <h1 className="detail-title">{prompt.title}</h1>
            <p className="detail-author">Author: {prompt.author}</p>
            {prompt.lastUpdated ? <span className="detail-updated">Last updated {prompt.lastUpdated}</span> : null}
          </header>

          <section className="detail-section">
            <h3 className="detail-label">Prompt:</h3>
            <p className="detail-prompt">{prompt.prompt || prompt.description}</p>
          </section>

          {prompt.tip ? (
            <section className="detail-section">
              <h3 className="detail-label">Tip when using the Prompt:</h3>
              <p className="detail-tip">{prompt.tip}</p>
            </section>
          ) : null}

          {prompt.timesSaved ? <p className="detail-meta">Times Saved: {prompt.timesSaved}</p> : null}
          <p className="detail-meta">Certified: {prompt.certified ? "Yes" : "No"}</p>

          <div className="detail-actions">
            <button type="button" className="action-btn" onClick={() => {
              navigator.clipboard.writeText(prompt.prompt || prompt.description).then(() => {
                setShowCopiedMessage(true);
                setTimeout(() => setShowCopiedMessage(false), 2500);
                window.open("https://www.vortexiq.ai/contact-us", "_blank", "noopener,noreferrer");
              });
            }}>
              <span className="btn-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </span>
              Run Prompt
            </button>
            <button type="button" className={`action-btn ${upvoted ? "upvoted" : ""}`} onClick={handleUpvote} disabled={upvoted}>
              <span className="btn-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2zm0 4l-3 7H9V9l4.34-4.34L12.23 10H20v2z" />
                </svg>
              </span>
              {prompt.upvotes} Upvotes
            </button>
            <button type="button" className="action-btn" onClick={() => {
              navigator.clipboard.writeText(prompt.prompt || prompt.description).then(() => {
                setShowCopiedMessage(true);
                setTimeout(() => setShowCopiedMessage(false), 2500);
              });
            }}>
              <span className="btn-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
              </span>
              Copy to Clipboard
            </button>
            <button type="button" className="action-btn action-btn-share">
              <span className="btn-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                </svg>
              </span>
              Share
            </button>
          </div>

          <section className="comments-section">
            <h3 className="comments-heading">Comments</h3>
            <div className="comment-input-wrap">
              <input
                className="comment-input"
                placeholder="Add a comment. Type @ to mention someone"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleComment();
                }}
              />
              <button className="comment-submit" onClick={handleComment}>Post</button>
            </div>
            <ul className="comment-list">
              {comments.map((c) => (
                <li key={c.id} className="comment-item">
                  <p className="comment-meta">{c.author} (USER) · {c.timeAgo}</p>
                  <p className="comment-text">{c.text}</p>
                </li>
              ))}
            </ul>
            {comments.length === 0 ? <p className="comment-empty">No comments yet. Be the first to add one.</p> : null}
          </section>
        </main>
      </div>
    </div>
  );
}

async function loadPrompt(agentId: number, promptId: number): Promise<PromptCatalogItem | null> {
  const res = await fetch(`/api/catalog/${agentId}`);
  if (!res.ok) return null;
  const base = (await res.json()) as PromptCatalog;
  const merged = base.prompts;
  return merged.find((m) => m.id === promptId) ?? null;
}

async function loadCatalog(agentId: number): Promise<PromptCatalog | null> {
  const res = await fetch(`/api/catalog/${agentId}`);
  if (!res.ok) return null;
  return (await res.json()) as PromptCatalog;
}
