"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import type { PromptCatalog, PromptCatalogItem, StoredComment } from "@/lib/types";
import { addComment, fetchComments, getMyUpvotes, trackActivity, upvotePrompt } from "@/lib/client-api";
import { getRunPromptTargetUrl } from "@/lib/run-prompt";

/**
 * v2 Prompt Detail — UI re-skin of the v1 page at
 * app/prompt-catchup/catalog/[agentId]/prompt/[promptId]/page.tsx (recovered from
 * git; it is deleted in the working tree). Data loading, upvote gating, comments
 * and Run Prompt are ported verbatim, so both versions read and write identical
 * data — including `author: "Current User"` on new comments.
 *
 * UI-ONLY ADDITIONS (present in the v2 design, absent from v1). Neither calls an
 * API nor persists anything, so v1 behaviour is unaffected:
 *   - Show More / Show Less: a maxHeight toggle over text already rendered.
 *   - Share: copies the current URL to the clipboard. v1's Share button existed
 *     but had no onClick, so this only gives the existing control an effect;
 *     it fires no activity event and writes nothing server-side.
 */
const COLLAPSED_MAX = 320;

async function loadCatalog(agentId: number): Promise<PromptCatalog> {
  const res = await fetch(`/api/catalog/${agentId}`);
  if (!res.ok) throw new Error("Failed to load catalog");
  return (await res.json()) as PromptCatalog;
}

function PlayIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function Icon({ path }: { path: ReactNode }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + second).toUpperCase();
}

export default function PromptDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; promptId: string }>;
}) {
  const route = use(params);
  const agentId = Number(route.agentId);
  const promptId = Number(route.promptId);

  const [prompt, setPrompt] = useState<PromptCatalogItem | null>(null);
  const [catalog, setCatalog] = useState<PromptCatalog | null>(null);
  const [comments, setComments] = useState<StoredComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [upvoted, setUpvoted] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadPageData = useCallback(async (targetAgentId: number, targetPromptId: number) => {
    if (!targetAgentId || !targetPromptId) return;
    setError("");
    setIsLoading(true);
    setPrompt(null);
    try {
      const [cat, c, my] = await Promise.all([
        loadCatalog(targetAgentId),
        fetchComments(targetAgentId, targetPromptId),
        getMyUpvotes(),
      ]);
      setCatalog(cat);
      setPrompt(cat.prompts?.find((p) => p.id === targetPromptId) ?? null);
      setComments(c);
      setUpvoted(my.some((m) => m.agentId === targetAgentId && m.promptId === targetPromptId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load prompt details.";
      setError(message);
      setPrompt(null);
      setCatalog(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!agentId || !promptId) return;
    loadPageData(agentId, promptId);
  }, [agentId, promptId, loadPageData]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

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

  function onCopy() {
    if (!prompt) return;
    const text = prompt.prompt || prompt.description;
    navigator.clipboard.writeText(text).then(() => {
      trackActivity({ action: "copy_to_clipboard", agentId, promptId }).catch(() => undefined);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2500);
    });
  }

  function onRun() {
    if (!prompt) return;
    const text = prompt.prompt || prompt.description;
    trackActivity({ action: "run_prompt", agentId, promptId }).catch(() => undefined);
    const targetUrl = getRunPromptTargetUrl(prompt.platform);
    navigator.clipboard.writeText(text).then(() => {
      trackActivity({ action: "copy_to_clipboard", agentId, promptId }).catch(() => undefined);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2500);
      if (targetUrl) window.open(targetUrl, "_blank", "noopener,noreferrer");
    });
  }

  /** UI-only: v1's Share button was inert. Clipboard write only — no API call. */
  function onShare() {
    navigator.clipboard.writeText(window.location.href).then(() => showToast("Link copied"));
  }

  const showDetailLoading = !agentId || !promptId || isLoading;

  if (showDetailLoading) return <div className="v2-state">Loading prompt…</div>;

  if (error) {
    return (
      <div className="v2-error">
        {error}{" "}
        <button type="button" className="v2-retry" onClick={() => loadPageData(agentId, promptId)}>
          Retry
        </button>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="v2-state">
        We couldn&apos;t find that prompt.{" "}
        <Link
          className="v2-card-link"
          href={agentId ? `/prompt-catchup-v2/catalog/${agentId}` : "/prompt-catchup-v2"}
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  const body = prompt.prompt || prompt.description;

  return (
    <>
      <nav className="v2-crumbs" aria-label="Breadcrumb">
        <Link href="/prompt-catchup-v2">Home</Link>
        <span className="v2-crumb-sep">/</span>
        <Link href={`/prompt-catchup-v2/catalog/${agentId}`}>{catalog?.title ?? "Prompt Catalog"}</Link>
        <span className="v2-crumb-sep">/</span>
        <span className="v2-crumb-current">{prompt.title}</span>
      </nav>

      <div className="v2-detail-head">
        <div className="v2-detail-headline">
          <h1 className="v2-detail-title">{prompt.title}</h1>
          {prompt.description ? <p className="v2-detail-sub">{prompt.description}</p> : null}
        </div>
        <div className="v2-detail-actions">
          <button
            type="button"
            className={`v2-act${upvoted ? " liked" : ""}`}
            onClick={handleUpvote}
            disabled={upvoted}
          >
            <Icon path={<path d="M12 20s-7-4.6-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.4 12 20 12 20z" />} />
            {prompt.upvotes} Upvotes
          </button>
          <button type="button" className="v2-act" onClick={onShare}>
            <Icon path={<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>} />
            Share
          </button>
          <button type="button" className="v2-act" onClick={onCopy}>
            <Icon path={<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>} />
            Copy to Clipboard
          </button>
        </div>
      </div>

      <div className="v2-detail-author">
        <span className="v2-avatar">{initials(prompt.author || "Unknown")}</span>
        <span className="v2-author-name">{prompt.author || "Unknown"}</span>
        <span className={`v2-badge${prompt.certified ? " certified" : ""}`}>
          {prompt.certified ? "✓ Certified" : "Not Certified"}
        </span>
        {prompt.timesSaved ? <span className="v2-times-saved">Times Saved: {prompt.timesSaved}</span> : null}
      </div>

      <section className="v2-detail-body">
        <h2 className="v2-section-title">Prompt Content</h2>
        <div
          className="v2-prompt-box"
          style={expanded ? undefined : { maxHeight: COLLAPSED_MAX, overflow: "hidden" }}
        >
          <pre className="v2-prompt-text">{body}</pre>
          {!expanded ? <div className="v2-prompt-fade" aria-hidden="true" /> : null}
        </div>
        {/* UI-only: v1 always rendered the prompt in full. Display toggle only. */}
        <button type="button" className="v2-showmore" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show Less ⌃" : "Show More ⌄"}
        </button>

        {prompt.tip ? (
          <section className="v2-tip">
            <h3 className="v2-tip-title">Tip when using the Prompt:</h3>
            <p className="v2-tip-text">{prompt.tip}</p>
          </section>
        ) : null}

        <div className="v2-detail-run">
          <button type="button" className="v2-primary-btn" onClick={onRun}>
            <PlayIcon /> Run Prompt
          </button>
        </div>
      </section>

      <section className="v2-comments">
        <h2 className="v2-section-title">Comments</h2>
        <div className="v2-comment-add">
          <textarea
            className="v2-comment-input"
            placeholder="Add a comment. Type @ to mention someone"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleComment();
              }
            }}
            rows={2}
          />
          <button type="button" className="v2-primary-btn v2-post-btn" onClick={handleComment}>
            Post
          </button>
        </div>

        {comments.length ? (
          <ul className="v2-comment-list">
            {comments.map((c) => (
              <li className="v2-comment" key={c.id}>
                <span className="v2-avatar sm">{initials(c.author)}</span>
                <div className="v2-comment-main">
                  <p className="v2-comment-head">
                    <strong>{c.author}</strong>
                    <span className="v2-comment-time">
                      {c.role ? `(${c.role}) · ` : ""}
                      {c.timeAgo}
                    </span>
                  </p>
                  <p className="v2-comment-text">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="v2-comment-empty">No comments yet. Be the first to add one.</p>
        )}
      </section>

      {showCopiedMessage ? (
        <div className="v2-toast" role="status">
          Prompt copied
        </div>
      ) : null}
      {toast ? (
        <div className="v2-toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}
