"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  certifyPromptByAdmin,
  deletePromptByAdmin,
  fetchCertifyPrompts,
  type CertifyPromptRow,
} from "@/lib/client-api";

/**
 * v2 Certify Prompt — UI re-skin of app/prompt-catchup/certify/page.tsx.
 * Admin gating, paging, certify/uncertify and delete are ported verbatim from
 * v1, so both versions read and write identical data via the same endpoints.
 */
const USER_SOEID_KEY = "cone-soeid";
const ALLOWED_CERTIFY_USERS = new Set(["oo24666", "tb97406"]);
const PAGE_SIZE = 10;

export default function CertifyPromptV2Page() {
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
    <>
      <nav className="v2-crumbs" aria-label="Breadcrumb">
        <Link href="/prompt-catchup-v2">Home</Link>
        <span className="v2-crumb-sep">/</span>
        <span className="v2-crumb-current">Certify Prompt</span>
      </nav>

      <h1 className="v2-cat-title">Certify Prompt</h1>
      <p className="v2-cat-sub v2-share-intro">
        Review shared prompts and mark them as certified.
      </p>

      {isMounted && !isAdmin ? (
        <div className="v2-error">
          This page is available only for authorized users ({Array.from(ALLOWED_CERTIFY_USERS).join(", ")}).
        </div>
      ) : null}

      {toast ? (
        <div className={toast.type === "success" ? "v2-success" : "v2-error"} role="status">
          <span>{toast.message}</span>
          <button type="button" className="v2-retry" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
      {loadError ? <div className="v2-error">{loadError}</div> : null}

      {isMounted && isAdmin && isLoading ? <div className="v2-state">Loading prompts...</div> : null}
      {isMounted && isAdmin && !isLoading && items.length === 0 ? (
        <div className="v2-state">No prompts found for certification.</div>
      ) : null}

      {isMounted && isAdmin && !isLoading && items.length > 0 ? (
        <>
          <div className="v2-likes-scroll">
            <div className="v2-certify-table">
              <div className="v2-certify-row v2-likes-head">
                <span>Prompt Title</span>
                <span>Author Name</span>
                <span>Author SOEID</span>
                <span>Status</span>
                <span>Action</span>
              </div>
              {items.map((item) => (
                <div className="v2-certify-row" key={item.id}>
                  <span className="v2-likes-title">{item.title}</span>
                  <span>{item.authorName || "-"}</span>
                  <span>{item.authorSoeid || "-"}</span>
                  <span>
                    <span className={`v2-badge${item.certified ? " certified" : ""}`}>
                      {item.certified ? "Certified" : "Pending"}
                    </span>
                  </span>
                  <span className="v2-manage-actions">
                    <button
                      type="button"
                      className={`v2-btn-sm${item.certified ? " warning" : " solid-blue"}`}
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
                      className="v2-btn-sm danger"
                      disabled={busyId === item.id}
                      onClick={() => setDeleteTarget(item)}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="v2-pager">
            <button
              type="button"
              className="v2-btn-sm"
              onClick={() => loadCertifyData(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </button>
            <span className="v2-pager-info">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="v2-btn-sm"
              onClick={() => loadCertifyData(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              Next
            </button>
          </div>
        </>
      ) : null}

      {deleteTarget ? (
        <div className="v2-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="v2-certify-delete-title">
          <div className="v2-modal">
            <h3 id="v2-certify-delete-title" className="v2-modal-title">
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

      {statusTarget ? (
        <div className="v2-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="v2-certify-status-title">
          <div className="v2-modal">
            <h3 id="v2-certify-status-title" className="v2-modal-title">
              {statusTarget.certified ? "Confirm Uncertify" : "Confirm Certify"}
            </h3>
            <p className="v2-modal-text">
              {statusTarget.certified ? "Uncertify" : "Certify"} prompt <strong>{statusTarget.title}</strong>?
            </p>
            <div className="v2-modal-actions">
              <button
                type="button"
                className="v2-btn-sm"
                onClick={() => setStatusTarget(null)}
                disabled={busyId === statusTarget.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`v2-btn-sm${statusTarget.certified ? " warning" : " solid-blue"}`}
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
    </>
  );
}
