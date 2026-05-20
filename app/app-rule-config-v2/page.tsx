"use client";

import { useState, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { getAppRuleBaseUrl } from "@/env-config";

function computeKey({
  env,
  country,
  business,
  channel,
  appId,
  includeEnv,
}: {
  env: string;
  country: string;
  business: string;
  channel: string;
  appId: string;
  includeEnv: boolean;
}) {
  const parts: string[] = [];
  const push = (value: string | undefined | null) => {
    const trimmed = (value || "").trim();
    if (trimmed) {
      parts.push(trimmed.toUpperCase());
    }
  };

  if (includeEnv) {
    push(env);
  }
  push(country);
  push(business);
  push(channel);
  push(appId);
  return parts.join("_");
}

function safeParseJson(raw: string): { error: string } | { value: object } {
  if (!raw?.trim()) return { error: "JSON configuration is empty." };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { error: "Configuration must be a JSON object (not array or primitive)." };
    }
    return { value: parsed };
  } catch (e) {
    return { error: (e as Error).message || "Invalid JSON." };
  }
}

const ADD_PLACEHOLDER = `{
  "mob_ac": {
    "useBAUEndpoint": false,
    "urlText": "test.com"
  },
  "mob_invest": {
    "investFlag": true
  }
}`;

type FileConfigMap = Record<string, unknown>;

type FileMeta = {
  updatedBy: string;
  updatedAt: string;
};

const FIXED_META: Record<string, FileMeta> = {
  mob_ac: { updatedBy: "tb97406", updatedAt: "4th May 2026" },
  mob_ac1: { updatedBy: "sk12234", updatedAt: "5th May 2026" },
  mob_invest: { updatedBy: "rt22323", updatedAt: "6th May 2026" },
};

const FALLBACK_USERS = ["tb97406", "sk12234", "rt22323", "jp10010", "mn55512"];
const FALLBACK_DATES = [
  "4th May 2026",
  "5th May 2026",
  "6th May 2026",
  "7th May 2026",
  "8th May 2026",
];

function metaFor(name: string, index: number): FileMeta {
  return (
    FIXED_META[name] ?? {
      updatedBy: FALLBACK_USERS[index % FALLBACK_USERS.length],
      updatedAt: FALLBACK_DATES[index % FALLBACK_DATES.length],
    }
  );
}

type AuditEntry = {
  when: string;
  who: string;
  action: string;
  details: string;
};

function dummyAuditFor(name: string): AuditEntry[] {
  const meta = FIXED_META[name];
  const author = meta?.updatedBy ?? "tb97406";
  const lastDate = meta?.updatedAt ?? "6th May 2026";
  return [
    {
      when: `${lastDate}, 14:22`,
      who: author,
      action: "Updated",
      details: `Edited JSON configuration for ${name}.`,
    },
    {
      when: "2nd May 2026, 09:10",
      who: "sk12234",
      action: "Updated",
      details: `Set urlText for ${name}.`,
    },
    {
      when: "29th April 2026, 16:48",
      who: "rt22323",
      action: "Reviewed",
      details: `Reviewed configuration ${name} as part of release readiness.`,
    },
    {
      when: "20th April 2026, 11:02",
      who: "tb97406",
      action: "Created",
      details: `Created configuration ${name}.`,
    },
  ];
}

type RowMode = "view" | "edit";

export default function AppRuleSearchPageV2() {
  const [environment, setEnvironment] = useState("");
  const [country, setCountry] = useState("");
  const [business, setBusiness] = useState("");
  const [channel, setChannel] = useState("");
  const [applicationId, setApplicationId] = useState("");

  const [searchKey, setSearchKey] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [files, setFiles] = useState<FileConfigMap | null>(null);

  // Only one row can be active at a time.
  const [activeRow, setActiveRow] = useState<{ name: string; mode: RowMode } | null>(null);
  const [editJson, setEditJson] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitMessage, setEditSubmitMessage] = useState("");
  const [editSubmitError, setEditSubmitError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);

  // Delete
  const [deleteFileName, setDeleteFileName] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Add new file
  const [addMode, setAddMode] = useState(false);
  const [addJson, setAddJson] = useState("");
  const [addError, setAddError] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addPreviewJson, setAddPreviewJson] = useState("");
  const [addSubmitMessage, setAddSubmitMessage] = useState("");
  const [addSubmitError, setAddSubmitError] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [crNumber, setCrNumber] = useState("");
  const [crError, setCrError] = useState("");

  // Audit history panel
  const [auditFileName, setAuditFileName] = useState<string | null>(null);

  // New-value inputs for scope fields
  const [countryInputMode, setCountryInputMode] = useState(false);
  const [businessInputMode, setBusinessInputMode] = useState(false);
  const [channelInputMode, setChannelInputMode] = useState(false);

  const editTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const addTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const keyPreview = computeKey({
    env: environment,
    country,
    business,
    channel,
    appId: applicationId.trim(),
    includeEnv: false,
  });

  const envRequiresCr = environment === "PERF" || environment === "PROD";

  useEffect(() => {
    if (activeRow?.mode === "edit" && editTextAreaRef.current) {
      editTextAreaRef.current.focus();
    }
  }, [activeRow]);

  useEffect(() => {
    if (addMode && addTextAreaRef.current) {
      addTextAreaRef.current.focus();
      addTextAreaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [addMode]);

  const resetActiveRow = () => {
    setActiveRow(null);
    setEditJson("");
    setEditError("");
    setEditSubmitMessage("");
    setEditSubmitError("");
    setEditConfirmOpen(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setFiles(null);
    resetActiveRow();
    setAddMode(false);
    setAddJson("");
    setAddError("");
    setCrNumber("");
    setCrError("");
    setAuditFileName(null);

    if (!environment || !country || !business || !channel) {
      setSearchError("Please select environment, country, business and channel before searching.");
      return;
    }

    const key = computeKey({
      env: environment,
      country,
      business,
      channel,
      appId: applicationId.trim(),
      includeEnv: false,
    });
    setSearchKey(key);

    setSearchLoading(true);
    try {
      const response = await fetch("/api/app-rule/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment,
          country,
          business,
          channel,
          applicationId: applicationId.trim() || null,
          key,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const cfg = (data && (data[key] as FileConfigMap | undefined)) || null;

      if (!cfg || Object.keys(cfg).length === 0) {
        setFiles(null);
      } else {
        setFiles(cfg);
      }
    } catch (error) {
      setSearchError(
        `Search failed: ${(error as Error).message}. Check console / Network tab for details.`
      );
      setFiles(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleViewClick = (name: string) => {
    if (activeRow?.name === name && activeRow.mode === "view") {
      resetActiveRow();
      return;
    }
    setActiveRow({ name, mode: "view" });
    setEditError("");
    setEditSubmitMessage("");
    setEditSubmitError("");
  };

  const handleEditClick = (name: string, value: unknown) => {
    if (activeRow?.name === name && activeRow.mode === "edit") {
      // Toggle off
      resetActiveRow();
      return;
    }
    setActiveRow({ name, mode: "edit" });
    setEditJson(JSON.stringify(value, null, 2));
    setEditError("");
    setEditSubmitMessage("");
    setEditSubmitError("");
    setEditConfirmOpen(false);
  };

  const handleAuditClick = (name: string) => {
    setAuditFileName(name);
  };

  const handleEditSave = async () => {
    const result = safeParseJson(editJson);
    if ("error" in result) {
      setEditError(result.error);
      return;
    }
    setEditError("");
    const parsed = (result as { value: object }).value;
    const keyForSubmit = searchKey || keyPreview || "CONFIG_KEY";
    setEditSubmitting(true);
    setEditSubmitMessage("");
    setEditSubmitError("");
    try {
      const response = await fetch("/api/app-rule/file-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment,
          country,
          business,
          channel,
          applicationId: applicationId.trim() || null,
          key: keyForSubmit,
          fileName: activeRow?.name,
          config: parsed,
        }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      setEditSubmitMessage(
        `Update succeeded for file ${data.fileName} (key ${data.key}).`
      );
      setEditSubmitError("");
      setFiles((prev) => {
        if (!prev || !activeRow) return prev;
        return { ...prev, [activeRow.name]: parsed };
      });
      setTimeout(() => {
        resetActiveRow();
      }, 6000);
    } catch (error) {
      setEditSubmitError(
        `Update failed: ${(error as Error).message}. Check console / Network tab for details.`
      );
      setEditSubmitMessage("");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteIconClick = (name: string) => {
    setDeleteFileName(name);
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const handleAddPreview = (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitMessage("");
    setAddSubmitError("");
    if (envRequiresCr && !crNumber.trim()) {
      setCrError("Please enter a Change Request (CR) number for PERF / PROD.");
      return;
    }
    setCrError("");
    const result = safeParseJson(addJson);
    if ("error" in result) {
      setAddError(result.error);
      return;
    }
    setAddError("");
    const parsed = (result as { value: object }).value;
    const keyForPreview = searchKey || keyPreview || "CONFIG_KEY";
    const wrapped = { [keyForPreview]: parsed };
    setAddPreviewJson(JSON.stringify(wrapped, null, 2));
    setAddModalOpen(true);
  };

  const handleAddConfirm = async () => {
    const result = safeParseJson(addJson);
    if ("error" in result) {
      setAddError(result.error);
      setAddSubmitError(result.error);
      setAddSubmitMessage("");
      return;
    }

    const parsed = (result as { value: object }).value;
    const keyForSubmit = searchKey || keyPreview || "CONFIG_KEY";
    const wrappedConfig = { [keyForSubmit]: parsed };

    const baseUrl = getAppRuleBaseUrl(environment);
    const simulateError = applicationId.trim().toUpperCase() === "ERROR";

    setAddSubmitMessage("");
    setAddSubmitError("");
    setAddSubmitting(true);

    try {
      const response = await fetch("/api/app-rule/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment,
          country,
          business,
          channel,
          applicationId: applicationId.trim() || null,
          crNumber: envRequiresCr ? crNumber.trim() || null : null,
          key: keyForSubmit,
          baseUrl,
          config: wrappedConfig,
          simulateError,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setAddSubmitMessage(
        `Add succeeded for key ${data.key} (env: ${data.environment}).`
      );
      setAddSubmitError("");

      setFiles((prev) => {
        const base = (prev || {}) as FileConfigMap;
        return { ...base, ...(parsed as FileConfigMap) };
      });
    } catch (error) {
      setAddSubmitError(
        `Add failed: ${(error as Error).message}. Check console / Network tab for details.`
      );
      setAddSubmitMessage("");
    } finally {
      setAddSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader
        title="App Rule Service Config Console (v2)"
        subtitle="Tabular view of JSON configuration files for the selected key."
      />
      <main className="app-main">
        <section className="panel panel-right">
          <form className="config-form" onSubmit={handleSearch} noValidate>
            <div className="field-row field-row-scope">
              <div className="field">
                <label htmlFor="environment-search-v2">
                  Environment<span className="required">*</span>
                </label>
                <select
                  id="environment-search-v2"
                  name="environment"
                  required
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                >
                  <option value="">Select environment</option>
                  <option value="DEV1">DEV1</option>
                  <option value="DEV2">DEV2</option>
                  <option value="DEV3">DEV3</option>
                  <option value="UAT1">UAT1</option>
                  <option value="UAT2">UAT2</option>
                  <option value="UAT3">UAT3</option>
                  <option value="PERF">PERF</option>
                  <option value="PROD">PROD</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="country-search-v2">
                  Country code<span className="required">*</span>
                </label>
                {!countryInputMode ? (
                  <select
                    id="country-search-v2"
                    name="country"
                    required
                    value={country}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "__NEW_COUNTRY__") {
                        setCountryInputMode(true);
                        setCountry("");
                      } else {
                        setCountry(value);
                      }
                    }}
                  >
                    <option value="">Select country</option>
                    <option value="US">US</option>
                    <option value="CA">CA</option>
                    <option value="UK">UK</option>
                    <option value="SG">SG</option>
                    <option value="__NEW_COUNTRY__">+ Enter new country code</option>
                  </select>
                ) : (
                  <div className="input-with-icon">
                    <input
                      id="country-search-v2"
                      name="country"
                      type="text"
                      required
                      placeholder="e.g. AU"
                      value={country}
                      onChange={(e) => setCountry(e.target.value.toUpperCase())}
                    />
                    <button
                      type="button"
                      className="input-icon-button"
                      aria-label="Back to country list"
                      title="Back to country list"
                      onClick={() => {
                        setCountryInputMode(false);
                        setCountry("");
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.5 5L7 9.5L11.5 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 9.5H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="field">
                <label htmlFor="business-search-v2">
                  Business code<span className="required">*</span>
                </label>
                {!businessInputMode ? (
                  <select
                    id="business-search-v2"
                    name="business"
                    required
                    value={business}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "__NEW_BUSINESS__") {
                        setBusinessInputMode(true);
                        setBusiness("");
                      } else {
                        setBusiness(value);
                      }
                    }}
                  >
                    <option value="">Select business</option>
                    <option value="GCB">GCB</option>
                    <option value="CRS">CRS</option>
                    <option value="__NEW_BUSINESS__">+ Enter new business code</option>
                  </select>
                ) : (
                  <div className="input-with-icon">
                    <input
                      id="business-search-v2"
                      name="business"
                      type="text"
                      required
                      placeholder="e.g. CCB"
                      value={business}
                      onChange={(e) => setBusiness(e.target.value.toUpperCase())}
                    />
                    <button
                      type="button"
                      className="input-icon-button"
                      aria-label="Back to business list"
                      title="Back to business list"
                      onClick={() => {
                        setBusinessInputMode(false);
                        setBusiness("");
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.5 5L7 9.5L11.5 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 9.5H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="field">
                <label htmlFor="channel-search-v2">
                  Channel ID<span className="required">*</span>
                </label>
                {!channelInputMode ? (
                  <select
                    id="channel-search-v2"
                    name="channel"
                    required
                    value={channel}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "__NEW_CHANNEL__") {
                        setChannelInputMode(true);
                        setChannel("");
                      } else {
                        setChannel(value);
                      }
                    }}
                  >
                    <option value="">Select channel</option>
                    <option value="CBOL">CBOL (Online)</option>
                    <option value="MOB">MOB (Mobile)</option>
                    <option value="IVR">IVR</option>
                    <option value="__NEW_CHANNEL__">+ Enter new channel id</option>
                  </select>
                ) : (
                  <div className="input-with-icon">
                    <input
                      id="channel-search-v2"
                      name="channel"
                      type="text"
                      required
                      placeholder="e.g. WEB"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value.toUpperCase())}
                    />
                    <button
                      type="button"
                      className="input-icon-button"
                      aria-label="Back to channel list"
                      title="Back to channel list"
                      onClick={() => {
                        setChannelInputMode(false);
                        setChannel("");
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.5 5L7 9.5L11.5 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 9.5H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="field">
                <label htmlFor="applicationId-search-v2">
                  Application ID <span className="optional">(optional)</span>
                </label>
                <input
                  id="applicationId-search-v2"
                  name="applicationId"
                  type="text"
                  placeholder="e.g. ANDROID, IOS, WEB"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                />
                <p className="field-hint field-hint-compact">
                  If blank, key uses country, business and channel.
                </p>
              </div>
              <div className="field">
                <label htmlFor="key-preview-search-v2">Computed key</label>
                <input
                  id="key-preview-search-v2"
                  name="key-preview-search-v2"
                  type="text"
                  readOnly
                  className="readonly-input"
                  value={keyPreview || "<incomplete key>"}
                />
                <p className="field-hint field-hint-compact">
                  This is the key used to search configuration.
                </p>
              </div>
            </div>

            <div className="form-footer">
              <div className="form-footer-right">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEnvironment("");
                    setCountry("");
                    setBusiness("");
                    setChannel("");
                    setApplicationId("");
                    setSearchKey("");
                    setSearchError("");
                    setFiles(null);
                    resetActiveRow();
                    setAddMode(false);
                    setAddJson("");
                    setAddError("");
                    setAuditFileName(null);
                  }}
                >
                  Reset
                </button>
                <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                  {searchLoading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </form>

          {searchError && (
            <p className="json-error" style={{ marginTop: 6 }}>
              {searchError}
            </p>
          )}

          {searchKey && !searchLoading && !files && !addMode && !searchError && (
            <p className="field-hint" style={{ marginTop: 10 }}>
              No configuration found for key <b>{searchKey}</b>.
            </p>
          )}

          {files && (
            <div className="form-section" style={{ marginTop: 16 }}>
              <h3>Files under key {searchKey}</h3>
              <div className="files-table-wrap">
                <table className="files-table">
                  <thead>
                    <tr>
                      <th>File object key name</th>
                      <th>Last updated by</th>
                      <th>Last updated at</th>
                      <th className="files-table-actions-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(files).map(([name, value], index) => {
                      const meta = metaFor(name, index);
                      const isActive = activeRow?.name === name;
                      const isViewing = isActive && activeRow?.mode === "view";
                      const isEditing = isActive && activeRow?.mode === "edit";
                      return (
                        <FragmentRow
                          key={name}
                          name={name}
                          value={value}
                          meta={meta}
                          isActive={!!isActive}
                          isViewing={!!isViewing}
                          isEditing={!!isEditing}
                          editJson={editJson}
                          setEditJson={setEditJson}
                          editError={editError}
                          editSubmitMessage={editSubmitMessage}
                          editSubmitError={editSubmitError}
                          editSubmitting={editSubmitting}
                          editTextAreaRef={editTextAreaRef}
                          onView={() => handleViewClick(name)}
                          onEdit={() => handleEditClick(name, value)}
                          onAudit={() => handleAuditClick(name)}
                          onDelete={() => handleDeleteIconClick(name)}
                          onCancel={() => resetActiveRow()}
                          onUpdate={() => setEditConfirmOpen(true)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {searchKey && !searchLoading && !searchError && (
            <div className="form-section" style={{ marginTop: 16 }}>
              {!addMode && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setAddMode(true);
                    setAddError("");
                    setCrNumber("");
                    setCrError("");
                  }}
                >
                  + Add new file configuration
                </button>
              )}
            </div>
          )}

          {addMode && (
            <div className="form-section" style={{ marginTop: 16 }}>
              <h3>Add new configuration for key {searchKey || "<incomplete key>"}</h3>
              <form onSubmit={handleAddPreview} noValidate>
                {envRequiresCr && (
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label htmlFor="crNumber-add-v2">
                      Change Request (CR) Number<span className="required">*</span>
                    </label>
                    <input
                      id="crNumber-add-v2"
                      name="crNumber-add-v2"
                      type="text"
                      className="cr-input-short"
                      placeholder="e.g. CHG123456"
                      value={crNumber}
                      onChange={(e) => setCrNumber(e.target.value)}
                    />
                    <p className="field-hint">
                      Required for PERF and PROD. This CR should be approved and linked to this change.
                    </p>
                    {crError && (
                      <p className="json-error" aria-live="polite">
                        {crError}
                      </p>
                    )}
                  </div>
                )}
                <div className="field">
                  <div className="label-row">
                    <label htmlFor="addJson-v2">
                      Configuration JSON<span className="required">*</span>
                    </label>
                    <span className="label-badge">Basic validation only</span>
                  </div>
                  <textarea
                    id="addJson-v2"
                    name="addJson-v2"
                    rows={10}
                    spellCheck={false}
                    placeholder={ADD_PLACEHOLDER}
                    required
                    ref={addTextAreaRef}
                    value={addJson}
                    onChange={(e) => setAddJson(e.target.value)}
                  />
                  {addError && (
                    <p className="json-error" aria-live="polite">
                      {addError}
                    </p>
                  )}
                </div>
                <div className="form-footer">
                  <div className="form-footer-right">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setAddMode(false);
                        setAddJson("");
                        setAddError("");
                        setCrNumber("");
                        setCrError("");
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Preview
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </section>
      </main>

      {/* Audit history slide-in panel */}
      <div
        className={"audit-panel-backdrop" + (auditFileName ? " open" : "")}
        onClick={() => setAuditFileName(null)}
        aria-hidden={!auditFileName}
      />
      <aside
        className={"audit-panel" + (auditFileName ? " open" : "")}
        aria-hidden={!auditFileName}
        aria-label="Audit history"
      >
        <div className="audit-panel-header">
          <div>
            <h3>Audit history</h3>
            {auditFileName && (
              <p className="audit-panel-subtitle">
                File <b>{auditFileName}</b> (key {searchKey || keyPreview || "CONFIG_KEY"})
              </p>
            )}
          </div>
          <button
            type="button"
            className="audit-panel-close"
            aria-label="Close audit history"
            onClick={() => setAuditFileName(null)}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5L15 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="audit-panel-body">
          {auditFileName ? (
            <ul className="audit-timeline">
              {dummyAuditFor(auditFileName).map((entry, idx) => (
                <li key={idx} className="audit-timeline-item">
                  <div className="audit-timeline-dot" />
                  <div className="audit-timeline-content">
                    <div className="audit-timeline-meta">
                      <span className={"audit-action-pill audit-action-" + entry.action.toLowerCase()}>
                        {entry.action}
                      </span>
                      <span className="audit-when">{entry.when}</span>
                    </div>
                    <div className="audit-who">by {entry.who}</div>
                    <div className="audit-details">{entry.details}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </aside>

      {/* Edit confirm modal */}
      {editConfirmOpen && activeRow?.mode === "edit" && (
        <div id="edit-confirm-modal-v2" className={"modal-backdrop open"} aria-hidden={false}>
          <div className="modal">
            <div className="modal-header">
              <h3>Apply changes to file</h3>
            </div>
            <div className="modal-body">
              <p className="field-hint">
                Do you want to apply changes for file <b>{activeRow.name}</b> under key{" "}
                <b>{searchKey || keyPreview || "CONFIG_KEY"}</b>?
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={editSubmitting}
                onClick={async () => {
                  await handleEditSave();
                  setEditConfirmOpen(false);
                }}
              >
                {editSubmitting ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add review modal */}
      {addMode && addModalOpen && (
        <div id="review-modal-search-v2" className={"modal-backdrop open"} aria-hidden={false}>
          <div className="modal">
            <div className="modal-header">
              <h3>Review configuration</h3>
            </div>
            <div className="modal-body">
              {addSubmitMessage && (
                <div className="status-banner status-banner-success">{addSubmitMessage}</div>
              )}
              {addSubmitError && (
                <div className="status-banner status-banner-error">{addSubmitError}</div>
              )}
              <div className="review-scope">
                <div className="scope-pair">
                  <span className="scope-label">Environment</span>
                  <span className="scope-value">{environment || "-"}</span>
                </div>
                <div className="scope-pair">
                  <span className="scope-label">Country</span>
                  <span className="scope-value">{country || "-"}</span>
                </div>
                <div className="scope-pair">
                  <span className="scope-label">Business</span>
                  <span className="scope-value">{business || "-"}</span>
                </div>
                <div className="scope-pair">
                  <span className="scope-label">Channel</span>
                  <span className="scope-value">{channel || "-"}</span>
                </div>
                <div className="scope-pair">
                  <span className="scope-label">App ID</span>
                  <span className="scope-value">
                    {applicationId.trim() ? applicationId.trim().toUpperCase() : "-"}
                  </span>
                </div>
                {envRequiresCr && (
                  <div className="scope-pair">
                    <span className="scope-label">CR</span>
                    <span className="scope-value">{crNumber.trim() || "-"}</span>
                  </div>
                )}
              </div>
              <div className="modal-json">
                <label>Configuration JSON</label>
                <pre className="modal-json-block">{addPreviewJson}</pre>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setAddModalOpen(false);
                  setAddMode(false);
                  setAddJson("");
                  setAddError("");
                  setAddSubmitMessage("");
                  setAddSubmitError("");
                  setAddPreviewJson("");
                  setCrNumber("");
                  setCrError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddConfirm}
                disabled={addSubmitting}
              >
                {addSubmitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteFileName && (
        <div
          id="delete-modal-search-v2"
          className={"modal-backdrop" + (deleteModalOpen ? " open" : "")}
          aria-hidden={!deleteModalOpen}
        >
          <div className="modal">
            <div className="modal-header">
              <h3>Delete file configuration</h3>
            </div>
            <div className="modal-body">
              {deleteError && (
                <div className="status-banner status-banner-error">{deleteError}</div>
              )}
              <p className="field-hint">
                You are about to delete file <b>{deleteFileName}</b> for key{" "}
                <b>{searchKey || keyPreview || "CONFIG_KEY"}</b>. This will remove the file from
                the configuration for this key.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteFileName(null);
                  setDeleteSubmitting(false);
                  setDeleteError("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={deleteSubmitting}
                onClick={async () => {
                  if (!deleteFileName) return;
                  setDeleteSubmitting(true);
                  setDeleteError("");
                  try {
                    const keyForSubmit = searchKey || keyPreview || "CONFIG_KEY";
                    const response = await fetch("/api/app-rule/file-delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        environment,
                        country,
                        business,
                        channel,
                        applicationId: applicationId.trim() || null,
                        key: keyForSubmit,
                        fileName: deleteFileName,
                      }),
                    });
                    if (!response.ok) {
                      throw new Error(`Request failed with status ${response.status}`);
                    }
                    setFiles((prev) => {
                      if (!prev) return prev;
                      const next: FileConfigMap = { ...prev };
                      delete next[deleteFileName];
                      if (Object.keys(next).length === 0) {
                        return null;
                      }
                      return next;
                    });
                    setDeleteModalOpen(false);
                    setDeleteFileName(null);
                    if (activeRow?.name === deleteFileName) {
                      resetActiveRow();
                    }
                  } catch (error) {
                    setDeleteError(
                      `Delete failed: ${(error as Error).message}. Check console / Network tab for details.`
                    );
                  } finally {
                    setDeleteSubmitting(false);
                  }
                }}
              >
                {deleteSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer" />
    </>
  );
}

type FragmentRowProps = {
  name: string;
  value: unknown;
  meta: FileMeta;
  isActive: boolean;
  isViewing: boolean;
  isEditing: boolean;
  editJson: string;
  setEditJson: (v: string) => void;
  editError: string;
  editSubmitMessage: string;
  editSubmitError: string;
  editSubmitting: boolean;
  editTextAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  onView: () => void;
  onEdit: () => void;
  onAudit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onUpdate: () => void;
};

function FragmentRow({
  name,
  value,
  meta,
  isActive,
  isViewing,
  isEditing,
  editJson,
  setEditJson,
  editError,
  editSubmitMessage,
  editSubmitError,
  editSubmitting,
  editTextAreaRef,
  onView,
  onEdit,
  onAudit,
  onDelete,
  onCancel,
  onUpdate,
}: FragmentRowProps) {
  return (
    <>
      <tr className={isActive ? "files-table-row is-active" : "files-table-row"}>
        <td className="files-table-name">{name}</td>
        <td>{meta.updatedBy}</td>
        <td>{meta.updatedAt}</td>
        <td className="files-table-actions">
          <button
            type="button"
            className={"file-action" + (isViewing ? " is-active" : "")}
            onClick={onView}
            aria-label={`View ${name}`}
            title="View"
          >
            {/* eye icon */}
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M1.5 10C3 6 6 4 10 4C14 4 17 6 18.5 10C17 14 14 16 10 16C6 16 3 14 1.5 10Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <button
            type="button"
            className={"file-action" + (isEditing ? " is-active" : "")}
            onClick={onEdit}
            aria-label={`Edit ${name}`}
            title="Edit"
          >
            {/* pencil icon */}
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 13.5L4.5 10.5L12.5 2.5L15.5 5.5L7.5 13.5L4 13.5Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M3 17H17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            className="file-action"
            onClick={onAudit}
            aria-label={`Audit history for ${name}`}
            title="Audit history"
          >
            {/* clock with arrow icon */}
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3.5 10C3.5 6.4 6.4 3.5 10 3.5C13.6 3.5 16.5 6.4 16.5 10C16.5 13.6 13.6 16.5 10 16.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path d="M3.5 13.5L3.5 16.5L6.5 16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 6.5V10L12.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </td>
      </tr>
      {isViewing && (
        <tr className="files-table-detail-row">
          <td colSpan={4}>
            <pre className="file-json">{JSON.stringify(value, null, 2)}</pre>
          </td>
        </tr>
      )}
      {isEditing && (
        <tr className="files-table-detail-row">
          <td colSpan={4}>
            {editSubmitMessage && (
              <div className="status-banner status-banner-success">{editSubmitMessage}</div>
            )}
            {editSubmitError && (
              <div className="status-banner status-banner-error">{editSubmitError}</div>
            )}
            <div className="field">
              <div className="label-row">
                <label htmlFor={`editJson-v2-${name}`}>
                  File JSON<span className="required">*</span>
                </label>
              </div>
              <textarea
                id={`editJson-v2-${name}`}
                name={`editJson-v2-${name}`}
                className="modal-json-textarea"
                spellCheck={false}
                ref={editTextAreaRef}
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
              />
              {editError && (
                <p className="json-error" aria-live="polite">
                  {editError}
                </p>
              )}
            </div>
            <div className="form-footer form-footer-split">
              <div className="form-footer-left">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={onDelete}
                  disabled={editSubmitting}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="M5 6H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path
                      d="M8 6V4H12V6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.5 6H13.5L13 15.5H7L6.5 6Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Delete
                </button>
              </div>
              <div className="form-footer-right">
                <button type="button" className="btn btn-ghost" onClick={onCancel}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={editSubmitting}
                  onClick={onUpdate}
                >
                  {editSubmitting ? "Updating..." : "Update"}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
