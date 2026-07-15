"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Agent, Group } from "@/lib/types";
import { sharePrompt } from "@/lib/client-api";

/**
 * v2 Share a Prompt — a UI-only re-skin of app/prompt-catchup/share/page.tsx.
 * All state, effects, validation and the submitted payload are ported verbatim
 * from v1 so both versions write identical data. Only markup/CSS differ.
 */
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

/** UI-only: collapsible section headers per the v2 design (5.pdf). Presentation
 *  only — no field, payload or validation semantics change. */
type SectionKey = "basic" | "prompt" | "audience";

function SectionHead({
  title,
  isOpen,
  onToggle,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="v2-section-head">
      <h2 className="v2-section-title">{title}</h2>
      <button
        type="button"
        className="v2-collapse-btn"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={isOpen ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
        </svg>
      </button>
    </div>
  );
}

export default function SharePromptV2Page() {
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

  // UI-only: which collapsible sections are expanded (all open by default).
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    prompt: true,
    audience: true,
  });
  const toggleSection = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  /**
   * Native validation cannot focus a field inside a collapsed section, which
   * would block submit with no visible message. Re-open the owning section when
   * one of its controls reports invalid so the browser can surface the error.
   */
  const expandSection = (key: SectionKey) =>
    setOpenSections((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

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
      const exactOption =
        roleOptions.find((r) => r.value === preferredRoleValue) ??
        roleOptions.find(
          (r) =>
            preferredRoleLabel &&
            normalizeRoleValue(r.label) === normalizeRoleValue(preferredRoleLabel)
        );
      const hasExactRole = Boolean(exactOption);
      const isAutoOtherSelection =
        selectedRoleOptions.length === 1 &&
        selectedRoleOptions[0] === "other" &&
        normalizeRoleValue(customRole) === normalizeRoleValue(preferredRoleLabel || preferredRoleValue);
      if (hasExactRole) {
        if (selectedRoleOptions.length === 0 || isAutoOtherSelection) {
          setSelectedRoleOptions([String(exactOption?.value)]);
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to submit prompt.";
      setError(message);
    }
  }

  return (
    <>
      <nav className="v2-crumbs" aria-label="Breadcrumb">
        <Link href="/prompt-catchup-v2">Home</Link>
        <span className="v2-crumb-sep">/</span>
        <span className="v2-crumb-current">Share a Prompt</span>
      </nav>

      <h1 className="v2-cat-title">Share a Prompt with Your Team</h1>
      <p className="v2-cat-sub v2-share-intro">
        Help colleagues discover time-saving prompts for their work. Your contribution helps teammates
        work smarter.
      </p>

      {success ? <div className="v2-success">Your prompt has been shared successfully.</div> : null}
      {error ? (
        <div className="v2-error">
          {error}{" "}
          <button type="button" className="v2-retry" onClick={loadShareData}>
            Retry
          </button>
        </div>
      ) : null}

      <form className="v2-form" onSubmit={onSubmit}>
        <section className="v2-form-section">
          <SectionHead
            title="Basic Information"
            isOpen={openSections.basic}
            onToggle={() => toggleSection("basic")}
          />
          {openSections.basic ? (
            <div className="v2-field-row">
              <label className="v2-field">
                <span className="v2-label">
                  <span className="v2-req">*</span> Title
                </span>
                <input
                  required
                  type="text"
                  name="title"
                  className="v2-input"
                  placeholder="Enter prompt title"
                  onInvalid={() => expandSection("basic")}
                />
              </label>
              <label className="v2-field">
                <span className="v2-label">
                  <span className="v2-req">*</span> Created by
                </span>
                <input
                  required
                  type="text"
                  name="createdBy"
                  className="v2-input"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  onInvalid={() => expandSection("basic")}
                />
              </label>
              <label className="v2-field">
                <span className="v2-label">
                  <span className="v2-req">*</span> SOEID
                </span>
                <input
                  required
                  type="text"
                  name="createdBySoeid"
                  className="v2-input"
                  value={createdBySoeid}
                  onChange={(e) => setCreatedBySoeid(e.target.value)}
                  onInvalid={() => expandSection("basic")}
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="v2-form-section">
          <SectionHead
            title="Your Prompt"
            isOpen={openSections.prompt}
            onToggle={() => toggleSection("prompt")}
          />
          {openSections.prompt ? (
            <>
              <label className="v2-field">
                <span className="v2-label">Description</span>
                <textarea
                  rows={3}
                  name="description"
                  className="v2-input v2-textarea"
                  placeholder="How it works, how to use it, and how to get the most from it."
                />
              </label>
              <label className="v2-field">
                <span className="v2-label">
                  <span className="v2-req">*</span> Prompt Content
                </span>
                <textarea
                  required
                  rows={8}
                  name="prompt"
                  className="v2-input v2-textarea"
                  placeholder='Please ensure to define the variable fields with "[]" for "template" format prompts'
                  onInvalid={() => expandSection("prompt")}
                />
              </label>
              <div className="v2-field-row">
                <label className="v2-field">
                  <span className="v2-label">Upload supporting files (optional)</span>
                  <input type="file" multiple className="v2-file" onChange={onAttachmentsSelected} />
                  {attachments ? <small className="v2-file-names">{attachments}</small> : null}
                </label>
                <label className="v2-field">
                  <span className="v2-label">
                    <span className="v2-req">*</span> Estimated Time Save (minutes per run)
                  </span>
                  <input
                    required
                    type="number"
                    min={0}
                    step={1}
                    name="estimatedTimeSaveMinutes"
                    className="v2-input"
                    placeholder="Enter minutes (e.g., 10)"
                    onInvalid={() => expandSection("prompt")}
                  />
                </label>
              </div>
            </>
          ) : null}
        </section>

        <section className="v2-form-section">
          <SectionHead
            title="Who is this prompt most useful for?"
            isOpen={openSections.audience}
            onToggle={() => toggleSection("audience")}
          />
          {openSections.audience ? (
            <>
          <div className="v2-check-group">
            <h3 className="v2-check-heading">Role</h3>
            <p className="v2-check-note">Who this prompt is most useful for</p>
            <div className="v2-check-grid">
              {roleOptions.map((role) => (
                <label className="v2-check" key={role.value}>
                  <input
                    type="checkbox"
                    name={`role-${role.value}`}
                    value={role.value}
                    checked={isRoleSelected(role.value)}
                    onChange={(e) => toggleRole(role.value, e.target.checked)}
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>
            {isRoleSelected("other") ? (
              <input
                type="text"
                name="customRole"
                className="v2-input v2-other-input"
                placeholder="Enter custom role"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
              />
            ) : null}
          </div>

          <div className="v2-check-group">
            <h3 className="v2-check-heading">
              Who could make use of this Prompt?
            </h3>
            <p className="v2-check-note">e.g., assistants, apps, business org., functions</p>
            <div className="v2-check-grid">
              {audienceGroups.map((g) => (
                <label className="v2-check" key={g.slug}>
                  <input
                    type="checkbox"
                    checked={isAudienceSelected(g.slug)}
                    onChange={(e) => toggleAudience(g.slug, e.target.checked)}
                  />
                  <span>{g.name}</span>
                </label>
              ))}
            </div>

            {audienceGroups.map((g) =>
              isAudienceSelected(g.slug) && getAgentsForGroup(g.slug).length > 0 ? (
                <div className="v2-subgroup" key={`sub-${g.slug}`}>
                  <button
                    type="button"
                    className="v2-subgroup-head"
                    onClick={() => toggleGroupExpanded(g.slug)}
                    aria-expanded={expandedGroups.has(g.slug)}
                  >
                    <span className="v2-expand">{expandedGroups.has(g.slug) ? "▼" : "▶"}</span>
                    {g.name}
                  </button>
                  {expandedGroups.has(g.slug) ? (
                    <div className="v2-check-grid v2-subgroup-items">
                      {getAgentsForGroup(g.slug).map((agent) => {
                        const key = `agent:${agent.id}`;
                        return (
                          <label className="v2-check" key={key}>
                            <input
                              type="checkbox"
                              checked={isAudienceSelected(key)}
                              onChange={(e) => toggleAudience(key, e.target.checked)}
                            />
                            <span>{agent.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null
            )}
          </div>

          <div className="v2-check-group">
            <h3 className="v2-check-heading">Platform</h3>
            <p className="v2-check-note">Where this prompt will run</p>
            <div className="v2-check-grid" role="radiogroup" aria-label="Platform selection">
              {PLATFORM_OPTIONS.map((platform) => (
                <label className="v2-check" key={platform.value}>
                  <input
                    type="radio"
                    name="platform"
                    value={platform.value}
                    checked={selectedPlatformOption === platform.value}
                    onChange={() => setSelectedPlatformOption(platform.value)}
                    required
                    onInvalid={() => expandSection("audience")}
                  />
                  <span>{platform.label}</span>
                </label>
              ))}
            </div>
            {selectedPlatformOption === "other" ? (
              <input
                type="text"
                name="customPlatform"
                className="v2-input v2-other-input"
                placeholder="Enter custom platform name"
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                required
                onInvalid={() => expandSection("audience")}
              />
            ) : null}
          </div>
            </>
          ) : null}
        </section>

        <div className="v2-form-actions">
          <button type="submit" className="v2-primary-btn">
            Submit Prompt
          </button>
          <Link href="/prompt-catchup-v2" className="v2-cancel">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
