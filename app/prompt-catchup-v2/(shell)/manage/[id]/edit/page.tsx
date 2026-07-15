"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { fetchMySharedPromptById, updateMySharedPrompt, type ManagedSharedPrompt } from "@/lib/client-api";
import { Agent } from "@/lib/types";

/**
 * v2 Edit Prompt — UI re-skin of app/prompt-catchup/manage/[id]/edit/page.tsx.
 * State, role option derivation, validation and the updateMySharedPrompt payload
 * are ported verbatim from v1, so both versions write identical data.
 */
const USER_SOEID_KEY = "cone-soeid";
const FALLBACK_SOEID = "tb97406";

const PLATFORM_OPTIONS = [
  { value: "stylus", label: "CITI Stylus (Workspaces)" },
  { value: "copilot", label: "Microsoft 365 Copilot" },
  { value: "gh_copilot_vscode", label: "GitHub Copilot (VS Code)" },
  { value: "gh_copilot_jetbrains", label: "GitHub Copilot (JetBrains)" },
  { value: "devin_ai", label: "Devin AI" },
  { value: "citi_squad", label: "Citi Squad" },
  { value: "citi_assist", label: "Citi Assist" },
  { value: "orion", label: "Orion" },
  { value: "other", label: "Other (free text)" },
] as const;

function normalizeRoleValue(input: string) {
  return String(input).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function EditPromptV2Page() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const soeid = useMemo(() => {
    if (typeof window === "undefined") return FALLBACK_SOEID;
    const raw = String(localStorage.getItem(USER_SOEID_KEY) ?? "").trim().toLowerCase();
    const resolved = raw || FALLBACK_SOEID;
    localStorage.setItem(USER_SOEID_KEY, resolved);
    return resolved;
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [item, setItem] = useState<ManagedSharedPrompt | null>(null);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState("");
  const [estimated, setEstimated] = useState("0");
  const [platform, setPlatform] = useState("stylus");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");

  const roleOptions = useMemo(() => {
    const merged = new Map<string, string>();
    for (const agent of agents) {
      if (agent.category !== "roles" && agent.category !== "role") continue;
      const value = normalizeRoleValue(agent.name);
      if (!value || value === "other") continue;
      if (!merged.has(value)) merged.set(value, agent.name);
    }
    return [
      ...Array.from(merged.entries()).map(([value, label]) => ({ value, label })),
      { value: "other", label: "Other (free text)" },
    ];
  }, [agents]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [homeData, row] = await Promise.all([
          fetch("/api/home").then((r) => r.json()),
          fetchMySharedPromptById(id, soeid),
        ]);
        setAgents((homeData.agents ?? []) as Agent[]);
        setItem(row);
        setTitle(String(row.title ?? ""));
        setPrompt(String(row.prompt ?? ""));
        setDescription(String(row.description ?? ""));
        setAttachments(String(row.attachments ?? ""));
        setEstimated(String(row.estimatedTimeSaveMinutes ?? 0));
        setPlatform(String(row.platform ?? "stylus"));
        const tags = Array.isArray(row.roleTags)
          ? row.roleTags.map((v) => normalizeRoleValue(String(v))).filter(Boolean)
          : [];
        setSelectedRoles(tags);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load prompt.");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id, soeid]);

  function toggleRole(value: string, checked: boolean) {
    setSelectedRoles((prev) =>
      checked ? Array.from(new Set([...prev, value])) : prev.filter((v) => v !== value)
    );
  }

  async function onSave() {
    setError("");
    setToast("");
    const mins = Number(estimated);
    if (!Number.isInteger(mins) || mins < 0) {
      setError("Estimated Time Save must be a whole number (0 or more).");
      return;
    }
    const customTag = selectedRoles.includes("other") ? normalizeRoleValue(customRole) : "";
    const roleTags = Array.from(
      new Set([...selectedRoles.filter((v) => v !== "other"), ...(customTag ? [customTag] : [])])
    );
    if (roleTags.length === 0) {
      setError("Please select at least one role.");
      return;
    }
    if (selectedRoles.includes("other") && !customTag) {
      setError("Please enter a value for Other role.");
      return;
    }
    setIsSaving(true);
    try {
      await updateMySharedPrompt(id, soeid, {
        title: title.trim(),
        prompt: prompt.trim(),
        description,
        attachments,
        estimatedTimeSaveMinutes: mins,
        platform,
        role: roleTags[0],
        roleTags,
        customRoleLabel: selectedRoles.includes("other") ? customRole.trim() : "",
      });
      setToast("Prompt updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update prompt.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <nav className="v2-crumbs" aria-label="Breadcrumb">
        <Link href="/prompt-catchup-v2">Home</Link>
        <span className="v2-crumb-sep">/</span>
        <Link href="/prompt-catchup-v2/manage">Manage your Prompts</Link>
        <span className="v2-crumb-sep">/</span>
        <span className="v2-crumb-current">Edit Prompt</span>
      </nav>

      <h1 className="v2-cat-title">Edit Prompt</h1>
      <p className="v2-cat-sub v2-share-intro">Update a prompt you shared.</p>

      {toast ? <div className="v2-success">{toast}</div> : null}
      {error ? <div className="v2-error">{error}</div> : null}

      {isLoading || !item ? (
        <div className="v2-state">Loading prompt...</div>
      ) : (
        <div className="v2-form">
          <section className="v2-form-section">
            <label className="v2-field">
              <span className="v2-label">Title</span>
              <input className="v2-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="v2-field">
              <span className="v2-label">Prompt</span>
              <textarea
                className="v2-input v2-textarea"
                rows={8}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <label className="v2-field">
              <span className="v2-label">Description</span>
              <textarea
                className="v2-input v2-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="v2-field-row">
              <label className="v2-field">
                <span className="v2-label">Estimated Time Save (minutes)</span>
                <input
                  className="v2-input"
                  type="number"
                  min={0}
                  step={1}
                  value={estimated}
                  onChange={(e) => setEstimated(e.target.value)}
                />
              </label>
              <label className="v2-field">
                <span className="v2-label">Attachments</span>
                <input
                  className="v2-input"
                  value={attachments}
                  onChange={(e) => setAttachments(e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="v2-form-section">
            <div className="v2-check-group">
              <h3 className="v2-check-heading">Platform</h3>
              <p className="v2-check-note">Where this prompt will run</p>
              <div className="v2-check-grid" role="radiogroup" aria-label="Platform selection">
                {PLATFORM_OPTIONS.map((p) => (
                  <label className="v2-check" key={p.value}>
                    <input
                      type="radio"
                      name="platform"
                      value={p.value}
                      checked={platform === p.value}
                      onChange={() => setPlatform(p.value)}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="v2-check-group">
              <h3 className="v2-check-heading">Roles</h3>
              <div className="v2-check-grid" role="group" aria-label="Role selection">
                {roleOptions.map((role) => (
                  <label className="v2-check" key={role.value}>
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role.value)}
                      onChange={(e) => toggleRole(role.value, e.target.checked)}
                    />
                    <span>{role.label}</span>
                  </label>
                ))}
              </div>
              {selectedRoles.includes("other") ? (
                <input
                  type="text"
                  className="v2-input v2-other-input"
                  placeholder="Enter custom role"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                />
              ) : null}
            </div>
          </section>

          <div className="v2-form-actions">
            <button type="button" className="v2-primary-btn" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <Link href="/prompt-catchup-v2/manage" className="v2-cancel">
              Back
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
