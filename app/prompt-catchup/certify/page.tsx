"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  certifyPromptByAdmin,
  deletePromptByAdmin,
  fetchCertifyPrompts,
  type CertifyPromptRow,
} from "@/lib/client-api";

const USER_SOEID_KEY = "cone-soeid";
const ALLOWED_CERTIFY_USERS = new Set(["oo24666", "tb97406"]);
const PAGE_SIZE = 10;

export default function CertifyPromptPage() {
  const [items, setItems] = useState<CertifyPromptRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<CertifyPromptRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CertifyPromptRow | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [soeid, setSoeid] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const resolved = String(localStorage.getItem(USER_SOEID_KEY) ?? "").trim().toLowerCase();
    setSoeid(resolved);
    setIsMounted(true);
  }, []);
  const isAdmin = ALLOWED_CERTIFY_USERS.has(soeid);

  async function loadCertifyData(targetPage: number) {
    setLoadError("");
    setIsLoading(true);
    try {
      const data = await fetchCertifyPrompts(soeid, targetPage, PAGE_SIZE);
      setItems(data.items);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load prompts for certification.";
      setLoadError(message);
      setToast({ type: "error", message });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isMounted) return;
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }
    loadCertifyData(1);
  }, [isAdmin, isMounted]);

  async function onSetCertified(item: CertifyPromptRow, nextCertified: boolean) {
    setBusyId(item.id);
    try {
      await certifyPromptByAdmin(item.id, soeid, nextCertified);
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, certified: nextCertified } : row)));
      setStatusTarget(null);
      setToast({
        type: "success",
        message: `Prompt "${item.title}" ${nextCertified ? "certified" : "uncertified"}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update certification status.";
      setToast({ type: "error", message });
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(item: CertifyPromptRow) {
    setBusyId(item.id);
    try {
      await deletePromptByAdmin(item.id, soeid);
      setDeleteTarget(null);
      setToast({ type: "success", message: `Prompt "${item.title}" deleted.` });
      const refreshPage = items.length === 1 && page > 1 ? page - 1 : page;
      await loadCertifyData(refreshPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete prompt.";
      setToast({ type: "error", message });
      setBusyId(null);
    }
  }

  return (
    <div className="share-page-wrapper pcu-page-body">
      <nav className="breadcrumb">
        <Link href="/prompt-catchup">Prompt Catch Up</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Certify Prompt</span>
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
            <Link href="/prompt-catchup/manage" className="sidebar-link">
              Manage your Prompts
            </Link>
            <Link href="/prompt-catchup/certify" className="sidebar-link active">
              Certify Prompt
            </Link>
            <Link href="/prompt-catchup" className="sidebar-link">
              Home
            </Link>
          </nav>
        </aside>

        <main className="share-main">
          <h1 className="page-title">Certify Prompt</h1>
          {isMounted && !isAdmin ? (
            <div className="error-banner">
              This page is available only for authorized users ({Array.from(ALLOWED_CERTIFY_USERS).join(", ")}).
            </div>
          ) : null}
          {toast ? (
            <div
              className={toast.type === "success" ? "success-banner" : "error-banner"}
              role="status"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
            >
              <span>{toast.message}</span>
              <button type="button" className="error-retry-btn" onClick={() => setToast(null)}>
                Dismiss
              </button>
            </div>
          ) : null}
          {loadError ? <div className="error-banner">{loadError}</div> : null}
          {isMounted && isAdmin && isLoading ? <div className="pcu-empty">Loading prompts...</div> : null}
          {isMounted && isAdmin && !isLoading && items.length === 0 ? (
            <div className="pcu-empty">No prompts found for certification.</div>
          ) : null}

          {isMounted && isAdmin && !isLoading && items.length > 0 ? (
            <section className="section">
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Prompt Title</th>
                      <th>Author Name</th>
                      <th>Author SOEID</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.title}</td>
                        <td>{item.authorName || "-"}</td>
                        <td>{item.authorSoeid || "-"}</td>
                        <td>{item.certified ? "Certified" : "Pending"}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className={`btn btn-sm ${item.certified ? "btn-warning text-dark" : "btn-primary"}`}
                              disabled={busyId === item.id}
                              onClick={() => setStatusTarget(item)}
                            >
                              {busyId === item.id
                                ? item.certified
                                  ? "Uncertifying..."
                                  : "Certifying..."
                                : item.certified
                                  ? "Uncertify"
                                  : "Certify"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              disabled={busyId === item.id}
                              onClick={() => setDeleteTarget(item)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => loadCertifyData(page - 1)}
                  disabled={page <= 1 || isLoading}
                >
                  Previous
                </button>
                <span style={{ fontSize: 14 }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => loadCertifyData(page + 1)}
                  disabled={page >= totalPages || isLoading}
                >
                  Next
                </button>
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

      {statusTarget ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-confirm-title"
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
            <h3 id="status-confirm-title" style={{ margin: "0 0 8px 0", fontSize: 18 }}>
              {statusTarget.certified ? "Confirm Uncertify" : "Confirm Certify"}
            </h3>
            <p style={{ margin: 0 }}>
              {statusTarget.certified ? "Uncertify" : "Certify"} prompt <strong>{statusTarget.title}</strong>?
            </p>
            <div className="d-flex gap-2 justify-content-end mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setStatusTarget(null)}
                disabled={busyId === statusTarget.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className={statusTarget.certified ? "btn btn-warning text-dark" : "btn btn-primary"}
                onClick={() => onSetCertified(statusTarget, !statusTarget.certified)}
                disabled={busyId === statusTarget.id}
              >
                {busyId === statusTarget.id
                  ? statusTarget.certified
                    ? "Uncertifying..."
                    : "Certifying..."
                  : statusTarget.certified
                    ? "Uncertify"
                    : "Certify"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
