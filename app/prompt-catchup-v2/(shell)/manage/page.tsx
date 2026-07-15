"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deleteMySharedPrompt,
  fetchMySharedPrompts,
  type ManagedSharedPrompt,
} from "@/lib/client-api";

/**
 * v2 Manage your Prompts — UI re-skin of app/prompt-catchup/manage/page.tsx.
 * State, SOEID resolution, loading, and delete are ported verbatim from v1, so
 * both versions read and write identical data via the same endpoints.
 */
const USER_SOEID_KEY = "cone-soeid";
const FALLBACK_SOEID = "tb97406";

export default function ManagePromptsV2Page() {
  const [items, setItems] = useState<ManagedSharedPrompt[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedSharedPrompt | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const soeid = useMemo(() => {
    if (typeof window === "undefined") return FALLBACK_SOEID;
    const raw = String(localStorage.getItem(USER_SOEID_KEY) ?? "").trim().toLowerCase();
    const resolved = raw || FALLBACK_SOEID;
    localStorage.setItem(USER_SOEID_KEY, resolved);
    return resolved;
  }, []);

  async function loadMine() {
    setLoadError("");
    setIsLoading(true);
    try {
      const rows = await fetchMySharedPrompts(soeid);
      setItems(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load your prompts.");
      setToast({ type: "error", message: "Unable to load your prompts." });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMine();
  }, []);

  async function onDelete(item: ManagedSharedPrompt) {
    setBusyId(item.id);
    try {
      await deleteMySharedPrompt(item.id, soeid);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setDeleteTarget(null);
      setToast({ type: "success", message: `Prompt "${item.title}" deleted.` });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to delete prompt.");
      setToast({ type: "error", message: "Unable to delete prompt." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <nav className="v2-crumbs" aria-label="Breadcrumb">
        <Link href="/prompt-catchup-v2">Home</Link>
        <span className="v2-crumb-sep">/</span>
        <span className="v2-crumb-current">Manage your Prompts</span>
      </nav>

      <h1 className="v2-cat-title">Manage your Prompts</h1>
      <p className="v2-cat-sub v2-share-intro">Signed in as SOEID: {soeid}</p>

      {toast ? (
        <div className={toast.type === "success" ? "v2-success" : "v2-error"} role="status">
          <span>{toast.message}</span>
          <button
            type="button"
            className="v2-retry"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {loadError ? <div className="v2-error">{loadError}</div> : null}

      {isLoading ? (
        <div className="v2-state">Loading your prompts...</div>
      ) : items.length === 0 ? (
        <div className="v2-state">No prompts found for your SOEID.</div>
      ) : (
        <div className="v2-likes-scroll">
          <div className="v2-manage-table">
            <div className="v2-manage-row v2-likes-head">
              <span>Prompt Title</span>
              <span>Prompt Text</span>
              <span>Estimated Time Save</span>
              <span>Roles</span>
              <span>Platform</span>
              <span>Action</span>
            </div>
            {items.map((item) => (
              <div className="v2-manage-row" key={item.id}>
                <span className="v2-likes-title">{item.title}</span>
                <span className="v2-manage-prompt">{item.prompt || "-"}</span>
                <span>{item.estimatedTimeSaveMinutes ?? 0} min</span>
                <span>
                  {Array.isArray(item.roleTags) && item.roleTags.length > 0
                    ? item.roleTags.join(", ")
                    : item.role || "-"}
                </span>
                <span>{item.platform || "-"}</span>
                <span className="v2-manage-actions">
                  <Link href={`/prompt-catchup-v2/manage/${item.id}/edit`} className="v2-btn-sm">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="v2-btn-sm danger"
                    onClick={() => setDeleteTarget(item)}
                    disabled={busyId === item.id}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteTarget ? (
        <div className="v2-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="v2-delete-title">
          <div className="v2-modal">
            <h3 id="v2-delete-title" className="v2-modal-title">
              Confirm Delete
            </h3>
            <p className="v2-modal-text">
              Delete prompt <strong>{deleteTarget.title}</strong>? This cannot be undone.
            </p>
            <div className="v2-modal-actions">
              <button
                type="button"
                className="v2-btn-sm"
                onClick={() => setDeleteTarget(null)}
                disabled={busyId === deleteTarget.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="v2-btn-sm danger solid"
                onClick={() => onDelete(deleteTarget)}
                disabled={busyId === deleteTarget.id}
              >
                {busyId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
