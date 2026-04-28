"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  deleteMySharedPrompt,
  fetchMySharedPrompts,
  type ManagedSharedPrompt,
} from "@/lib/client-api";

const USER_SOEID_KEY = "cone-soeid";
const FALLBACK_SOEID = "tb97406";
const CERTIFY_LINK_ALLOWED_SOEIDS = new Set(["oo24666", "tb97406"]);

export default function ManagePromptsPage() {
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
  const canViewCertifyLink = CERTIFY_LINK_ALLOWED_SOEIDS.has(soeid);

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
    <div className="share-page-wrapper pcu-page-body">
      <nav className="breadcrumb">
        <Link href="/prompt-catchup">Prompt Catch Up</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Manage your Prompts</span>
      </nav>

      <div className="share-page">
        <aside className="share-sidebar">
          <div className="sidebar-search">
            <input type="text" className="sidebar-search-input" placeholder="Search for Prompts" readOnly />
          </div>
          <nav className="sidebar-nav">
            <Link href="/prompt-catchup/share" className="sidebar-link">
              Share your Prompt
            </Link>
            <Link href="/prompt-catchup/manage" className="sidebar-link active">
              Manage your Prompts
            </Link>
            {canViewCertifyLink ? (
              <Link href="/prompt-catchup/certify" className="sidebar-link">
                Certify Prompt
              </Link>
            ) : null}
            <Link href="/prompt-catchup" className="sidebar-link">
              Home
            </Link>
          </nav>
        </aside>

        <main className="share-main">
          <h1 className="page-title">Manage your Prompts</h1>
          <p className="pcu-banner-subtitle">Signed in as SOEID: {soeid}</p>
          {toast ? (
            <div
              className={toast.type === "success" ? "success-banner" : "error-banner"}
              role="status"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
            >
              <span>{toast.message}</span>
              <button
                type="button"
                className="error-retry-btn"
                onClick={() => setToast(null)}
                aria-label="Dismiss notification"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          {loadError ? <div className="error-banner">{loadError}</div> : null}
          {isLoading ? <div className="pcu-empty">Loading your prompts...</div> : null}
          {!isLoading && items.length === 0 ? (
            <div className="pcu-empty">No prompts found for your SOEID.</div>
          ) : null}

          {!isLoading && items.length > 0 ? (
            <section className="section">
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Prompt Title</th>
                      <th>Prompt Text</th>
                      <th>Estimated Time Save</th>
                      <th>Roles</th>
                      <th>Platform</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <Fragment key={item.id}>
                        <tr>
                          <td>{item.title}</td>
                          <td style={{ maxWidth: 340, whiteSpace: "pre-wrap" }}>{item.prompt || "-"}</td>
                          <td>{item.estimatedTimeSaveMinutes ?? 0} min</td>
                          <td>
                            {Array.isArray(item.roleTags) && item.roleTags.length > 0
                              ? item.roleTags.join(", ")
                              : item.role || "-"}
                          </td>
                          <td>{item.platform || "-"}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Link href={`/prompt-catchup/manage/${item.id}/edit`} className="btn btn-primary btn-sm">
                                Edit
                              </Link>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                disabled={busyId === item.id}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </main>
      </div>
      {deleteTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "#fff",
              borderRadius: 8,
              border: "1px solid #d9dde3",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              padding: 16,
            }}
          >
            <h3 id="delete-confirm-title" style={{ margin: "0 0 8px 0", fontSize: 18 }}>
              Confirm Delete
            </h3>
            <p style={{ margin: 0 }}>
              Delete prompt <strong>{deleteTarget.title}</strong>? This cannot be undone.
            </p>
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={busyId === deleteTarget.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => onDelete(deleteTarget)}
                disabled={busyId === deleteTarget.id}
              >
                {busyId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
