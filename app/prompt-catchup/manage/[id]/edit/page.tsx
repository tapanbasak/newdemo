"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { fetchMySharedPromptById, updateMySharedPrompt, type ManagedSharedPrompt } from "@/lib/client-api";
import { Agent } from "@/lib/types";

const USER_SOEID_KEY = "pcu_user_soeid";
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

export default function EditPromptPage() {
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
    return [...Array.from(merged.entries()).map(([value, label]) => ({ value, label })), { value: "other", label: "Other (free text)" }];
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
        const tags = Array.isArray(row.roleTags) ? row.roleTags.map((v) => normalizeRoleValue(String(v))).filter(Boolean) : [];
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
    setSelectedRoles((prev) => (checked ? Array.from(new Set([...prev, value])) : prev.filter((v) => v !== value)));
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
    const roleTags = Array.from(new Set([...selectedRoles.filter((v) => v !== "other"), ...(customTag ? [customTag] : [])]));
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
    <div className="share-page-wrapper pcu-page-body">
      <nav className="breadcrumb">
        <Link href="/prompt-catchup">Prompt Catch Up</Link>
        <span className="breadcrumb-separator">/</span>
        <Link href="/prompt-catchup/manage">Manage your Prompts</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Edit Prompt</span>
      </nav>
      <div className="share-page">
        <aside className="share-sidebar">
          <nav className="sidebar-nav">
            <Link href="/prompt-catchup/manage" className="sidebar-link active">
              Back to Manage your Prompts
            </Link>
          </nav>
        </aside>
        <main className="share-main">
          <h1 className="page-title">Edit Prompt</h1>
          {toast ? <div className="success-banner">{toast}</div> : null}
          {error ? <div className="error-banner">{error}</div> : null}
          {isLoading || !item ? (
            <div className="pcu-empty">Loading prompt...</div>
          ) : (
            <section className="section">
              <div className="field">
                <label>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="field">
                <label>Prompt</label>
                <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid-row">
                <div className="field">
                  <label>Estimated Time Save (minutes)</label>
                  <input type="number" min={0} step={1} value={estimated} onChange={(e) => setEstimated(e.target.value)} />
                </div>
                <div className="field">
                  <label>Attachments</label>
                  <input value={attachments} onChange={(e) => setAttachments(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Platform</label>
                <select className="form-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Roles</label>
                <div className="platform-options" role="group" aria-label="Role selection">
                  {roleOptions.map((role) => (
                    <label className="platform-option" key={role.value}>
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.value)}
                        onChange={(e) => toggleRole(role.value, e.target.checked)}
                      />
                      {role.label}
                    </label>
                  ))}
                </div>
                {selectedRoles.includes("other") ? (
                  <input
                    type="text"
                    placeholder="Enter custom role"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                  />
                ) : null}
              </div>
              <div className="d-flex gap-2 mt-3">
                <button type="button" className="btn btn-primary" onClick={onSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <Link href="/prompt-catchup/manage" className="btn btn-outline-secondary">
                  Back
                </Link>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
