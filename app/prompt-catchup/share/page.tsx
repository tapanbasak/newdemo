"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Agent, Group } from "@/lib/types";
import { sharePrompt } from "@/lib/client-api";

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

const OTHER_ROLE_OPTION = { value: "other", label: "Other (free text)" } as const;
const USER_SOEID_KEY = "cone-soeid";
const USER_PROFILE_KEY = "cone-user-profile";
const BUSINESS_ORG_BY_SOEID_KEY = "pcu_business_org_by_soeid";
const DEMO_SOEID = "demo.soeid";
const DEMO_BUSINESS_ORG = "U. S Personal Banking";

function normalizeRoleValue(input: string) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeLooseText(input: string) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export default function SharePromptPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [audience, setAudience] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState("");
  const [selectedPlatformOption, setSelectedPlatformOption] = useState<string>("stylus");
  const [customPlatform, setCustomPlatform] = useState("");
  const [selectedRoleOptions, setSelectedRoleOptions] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [didAutoPopulateBusinessOrg, setDidAutoPopulateBusinessOrg] = useState(false);
  const [createdBy, setCreatedBy] = useState("");
  const [createdBySoeid, setCreatedBySoeid] = useState("");
  const [preferredRoleValue, setPreferredRoleValue] = useState("");
  const [preferredRoleLabel, setPreferredRoleLabel] = useState("");
  const audienceGroups = useMemo(
    () => groups.filter((g) => g.slug !== "my-upvotes" && g.slug !== "roles" && g.slug !== "role"),
    [groups]
  );
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
      { ...OTHER_ROLE_OPTION },
    ];
  }, [agents]);

  useEffect(() => {
    if (preferredRoleValue) {
      const hasExactRole = roleOptions.some((r) => r.value === preferredRoleValue);
      const isAutoOtherSelection =
        selectedRoleOptions.length === 1 &&
        selectedRoleOptions[0] === "other" &&
        normalizeRoleValue(customRole) === normalizeRoleValue(preferredRoleLabel || preferredRoleValue);
      if (hasExactRole) {
        if (selectedRoleOptions.length === 0 || isAutoOtherSelection) {
          setSelectedRoleOptions([preferredRoleValue]);
          if (customRole) setCustomRole("");
        }
        return;
      }
      if (preferredRoleLabel) {
        if (selectedRoleOptions.length === 0) {
          setSelectedRoleOptions(["other"]);
          setCustomRole(preferredRoleLabel);
        }
        return;
      }
    }
    if (selectedRoleOptions.length > 0) return;
    const fallback =
      roleOptions.find((r) => r.value === "developer-software-engineer" || r.value === "developer")?.value ??
      roleOptions.find((r) => r.value !== "other")?.value;
    if (fallback) {
      setSelectedRoleOptions([fallback]);
    }
  }, [roleOptions, selectedRoleOptions, preferredRoleValue, preferredRoleLabel, customRole]);

  async function loadShareData() {
    setError("");
    try {
      const data = await fetch("/api/home").then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || "Unable to load share form data.");
        }
        return r.json();
      });
      setAgents(data.agents ?? []);
      setGroups(data.groups ?? []);
    } catch (err) {
      setAgents([]);
      setGroups([]);
      const message = err instanceof Error ? err.message : "Unable to load share form data.";
      setError(message);
    }
  }

  useEffect(() => {
    loadShareData();
  }, []);

  useEffect(() => {
    const soeid = String(localStorage.getItem(USER_SOEID_KEY) ?? "").trim();
    if (soeid) setCreatedBySoeid(soeid);
    try {
      const raw = localStorage.getItem(USER_PROFILE_KEY);
      if (!raw) return;
      const profile = JSON.parse(raw) as {
        firstName?: string;
        lastName?: string;
        soeId?: string;
        mappedRole?: { roleKey?: string; roleLabel?: string };
      };
      const fullName = `${String(profile.firstName ?? "").trim()} ${String(profile.lastName ?? "").trim()}`.trim();
      if (fullName) setCreatedBy(fullName);
      if (profile.soeId) setCreatedBySoeid(String(profile.soeId).trim().toLowerCase());
      const mappedRoleValue = normalizeRoleValue(
        String(profile.mappedRole?.roleKey ?? profile.mappedRole?.roleLabel ?? "")
      );
      if (mappedRoleValue) setPreferredRoleValue(mappedRoleValue);
      if (profile.mappedRole?.roleLabel) setPreferredRoleLabel(String(profile.mappedRole.roleLabel));
    } catch {
      // ignore malformed local profile
    }
  }, []);

  useEffect(() => {
    if (didAutoPopulateBusinessOrg || agents.length === 0 || groups.length === 0) return;

    const currentSoeid =
      String(localStorage.getItem(USER_SOEID_KEY) ?? "")
        .trim()
        .toLowerCase() || DEMO_SOEID;
    localStorage.setItem(USER_SOEID_KEY, currentSoeid);

    let mapping: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(BUSINESS_ORG_BY_SOEID_KEY);
      mapping = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      mapping = {};
    }

    if (!mapping[currentSoeid]) {
      mapping[currentSoeid] = DEMO_BUSINESS_ORG;
      localStorage.setItem(BUSINESS_ORG_BY_SOEID_KEY, JSON.stringify(mapping));
    }

    const mappedOrg = String(mapping[currentSoeid] ?? "").trim();
    if (!mappedOrg) {
      setDidAutoPopulateBusinessOrg(true);
      return;
    }

    const businessOrgSlug = "business-org";
    const match = agents.find(
      (a) =>
        a.category === businessOrgSlug && normalizeLooseText(a.name) === normalizeLooseText(mappedOrg)
    );
    if (!match) {
      setDidAutoPopulateBusinessOrg(true);
      return;
    }

    setAudience((prev) => Array.from(new Set([...prev, businessOrgSlug, `agent:${match.id}`])));
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.add(businessOrgSlug);
      return next;
    });
    setDidAutoPopulateBusinessOrg(true);
  }, [agents, groups, didAutoPopulateBusinessOrg]);

  function isAudienceSelected(identifier: string) {
    return audience.includes(identifier);
  }

  function toggleAudience(identifier: string, checked: boolean) {
    setAudience((prev) =>
      checked ? Array.from(new Set([...prev, identifier])) : prev.filter((v) => v !== identifier)
    );
  }

  function toggleGroupExpanded(slug: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function getAgentsForGroup(groupSlug: string) {
    return agents.filter((a) => a.category === groupSlug);
  }

  function onAttachmentsSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    const names = files ? Array.from(files).map((f) => f.name).join(", ") : "";
    setAttachments(names);
  }

  function isRoleSelected(value: string) {
    return selectedRoleOptions.includes(value);
  }

  function toggleRole(value: string, checked: boolean) {
    setSelectedRoleOptions((prev) =>
      checked ? Array.from(new Set([...prev, value])) : prev.filter((v) => v !== value)
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);
    setError("");
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const rawPlatform = selectedPlatformOption || "stylus";
    const selectedPlatform =
      rawPlatform === "other" ? customPlatform.trim().toLowerCase().replace(/\s+/g, "_") : rawPlatform;
    if (!selectedPlatform) {
      setError("Please enter a platform name.");
      return;
    }
    const normalizedRoleTags = selectedRoleOptions
      .filter((value) => value !== "other")
      .map((value) =>
        String(value)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      )
      .filter(Boolean);
    const customRoleTag = isRoleSelected("other")
      ? customRole
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      : "";
    const selectedRoleTags = Array.from(new Set([...normalizedRoleTags, ...(customRoleTag ? [customRoleTag] : [])]));
    if (selectedRoleTags.length === 0) {
      setError("Please select at least one role.");
      return;
    }
    if (isRoleSelected("other") && !customRoleTag) {
      setError("Please enter a value for Other role.");
      return;
    }
    const estimatedTimeSaveRaw = String(form.get("estimatedTimeSaveMinutes") ?? "").trim();
    if (!/^\d+$/.test(estimatedTimeSaveRaw)) {
      setError("Estimated Time Save must be a whole number in minutes.");
      return;
    }
    const estimatedTimeSaveMinutes = Number(estimatedTimeSaveRaw);
    if (!Number.isFinite(estimatedTimeSaveMinutes) || estimatedTimeSaveMinutes < 0) {
      setError("Estimated Time Save must be 0 or more minutes.");
      return;
    }
    try {
      await sharePrompt({
        title: String(form.get("title") || ""),
        createdBy: String(form.get("createdBy") || "").trim(),
        createdBySoeid: String(form.get("createdBySoeid") || "").trim().toLowerCase(),
        audience: audience.join(", "),
        platform: selectedPlatform,
        role: selectedRoleTags[0],
        roleTags: selectedRoleTags,
        customRoleLabel: isRoleSelected("other") ? customRole.trim() : "",
        estimatedTimeSaveMinutes,
        prompt: String(form.get("prompt") || ""),
        description: String(form.get("description") || ""),
        attachments,
      });
      formEl.reset();
      setAudience([]);
      setExpandedGroups(new Set());
      setAttachments("");
      setSelectedPlatformOption("stylus");
      setCustomPlatform("");
      setSelectedRoleOptions([]);
      setCustomRole("");
      setCreatedBySoeid(String(localStorage.getItem(USER_SOEID_KEY) ?? "").trim().toLowerCase());
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to submit prompt.";
      setError(message);
    }
  }

  return (
    <div className="share-page-wrapper pcu-page-body">
      <nav className="breadcrumb">
        <Link href="/prompt-catchup">Prompt Catch Up</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Share Your Prompt</span>
      </nav>

      <div className="share-page">
        <aside className="share-sidebar">
          <div className="sidebar-search">
            <input type="text" className="sidebar-search-input" placeholder="Search for Prompts" />
          </div>
          <nav className="sidebar-nav">
            <Link href="/prompt-catchup/share" className="sidebar-link active">
              Share your Prompt
            </Link>
            <Link href="/prompt-catchup/manage" className="sidebar-link">
              Manage your Prompts
            </Link>
            <Link href="/prompt-catchup" className="sidebar-link">
              Home
            </Link>
          </nav>
        </aside>

        <main className="share-main">
          {success ? <div className="success-banner">Your prompt has been shared successfully.</div> : null}
          {error ? (
            <div className="error-banner">
              {error}{" "}
              <button type="button" className="error-retry-btn" onClick={loadShareData}>
                Retry
              </button>
            </div>
          ) : null}
          <h1 className="page-title">Share Your Prompt</h1>
          <section className="section">
            <h2 className="section-title">Basic Information</h2>
            <form onSubmit={onSubmit}>
              <div className="grid-row">
                <div className="field">
                  <label>Title</label>
                  <input required type="text" name="title" />
                </div>
                <div className="field">
                  <label>Created by</label>
                  <input required type="text" name="createdBy" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
                </div>
                <div className="field">
                  <label>Created by SOEID</label>
                  <input
                    required
                    type="text"
                    name="createdBySoeid"
                    value={createdBySoeid}
                    onChange={(e) => setCreatedBySoeid(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-row">
                <div className="field wide">
                  <label>Who could make use of this Prompt? (e.g., assistants, apps, business org., functions)</label>
                  <div className="audience-section">
                    <div className="audience-tags">
                      {audienceGroups.map((g) => (
                        <label className="audience-chip group-chip" key={g.slug}>
                          <input
                            type="checkbox"
                            checked={isAudienceSelected(g.slug)}
                            onChange={(e) => toggleAudience(g.slug, e.target.checked)}
                          />
                          {g.name}
                        </label>
                      ))}
                    </div>

                    {audienceGroups.map((g) => (
                      <div
                        className="sub-groups"
                        key={`sub-${g.slug}`}
                        style={{
                          display:
                            isAudienceSelected(g.slug) && getAgentsForGroup(g.slug).length > 0
                              ? "block"
                              : "none",
                        }}
                      >
                        <div className="sub-group-header" onClick={() => toggleGroupExpanded(g.slug)}>
                          <span className="expand-icon">{expandedGroups.has(g.slug) ? "▼" : "▶"}</span>
                          <span>{g.name} &gt;</span>
                        </div>
                        {expandedGroups.has(g.slug) ? (
                          <div className="sub-group-items">
                            {getAgentsForGroup(g.slug).map((agent) => {
                              const key = `agent:${agent.id}`;
                              return (
                                <label className="audience-chip sub-chip" key={key}>
                                  <input
                                    type="checkbox"
                                    checked={isAudienceSelected(key)}
                                    onChange={(e) => toggleAudience(key, e.target.checked)}
                                  />
                                  {agent.name}
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Attachments</label>
                  <input type="file" multiple onChange={onAttachmentsSelected} />
                  {attachments ? <small>{attachments}</small> : null}
                </div>
              </div>

              <div className="share-choice-group" aria-label="Platform and role">
                <div className="share-choice-section share-choice-section--platform">
                  <div className="share-choice-section__head">
                    <span className="share-choice-section__title">Platform</span>
                    <span className="share-choice-section__hint">Where this prompt will run</span>
                  </div>
                  <div className="field platform-field">
                    <div className="platform-options" role="radiogroup" aria-label="Platform selection">
                      {PLATFORM_OPTIONS.map((platform) => (
                        <label className="platform-option" key={platform.value}>
                          <input
                            type="radio"
                            name="platform"
                            value={platform.value}
                            checked={selectedPlatformOption === platform.value}
                            onChange={() => setSelectedPlatformOption(platform.value)}
                            required
                          />
                          {platform.label}
                        </label>
                      ))}
                    </div>
                    {selectedPlatformOption === "other" ? (
                      <input
                        type="text"
                        name="customPlatform"
                        placeholder="Enter custom platform name"
                        value={customPlatform}
                        onChange={(e) => setCustomPlatform(e.target.value)}
                        required
                      />
                    ) : null}
                  </div>
                </div>

                <div className="share-choice-section share-choice-section--role">
                  <div className="share-choice-section__head">
                    <span className="share-choice-section__title">Role</span>
                    <span className="share-choice-section__hint">Who this prompt is most useful for</span>
                  </div>
                  <div className="field platform-field">
                    <div className="platform-options" role="group" aria-label="Role selection">
                      {roleOptions.map((role) => (
                        <label className="platform-option" key={role.value}>
                          <input
                            type="checkbox"
                            name={`role-${role.value}`}
                            value={role.value}
                            checked={isRoleSelected(role.value)}
                            onChange={(e) => toggleRole(role.value, e.target.checked)}
                          />
                          {role.label}
                        </label>
                      ))}
                    </div>
                    {isRoleSelected("other") ? (
                      <input
                        type="text"
                        name="customRole"
                        placeholder="Enter custom role"
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="field estimated-time-save-field">
                <label>Estimated Time Save (minutes per run)</label>
                <input
                  required
                  type="number"
                  min={0}
                  step={1}
                  name="estimatedTimeSaveMinutes"
                  placeholder="Enter minutes (e.g., 10)"
                />
              </div>

              <div className="field">
                <label>Prompt</label>
                <textarea
                  required
                  rows={4}
                  name="prompt"
                  placeholder='Please ensure to define the variable fields with "[]" for "template" format prompts'
                />
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  rows={3}
                  name="description"
                  placeholder="How it works, how to use it, and how to get the most from it."
                />
              </div>

              <div className="submit-row">
                <button type="submit" className="submit-btn">
                  Submit
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
