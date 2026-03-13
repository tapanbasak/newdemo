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

export default function AppRuleSearchPage() {
  const [environment, setEnvironment] = useState("");
  const [country, setCountry] = useState("");
  const [business, setBusiness] = useState("");
  const [channel, setChannel] = useState("");
  const [applicationId, setApplicationId] = useState("");

  const [searchKey, setSearchKey] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [files, setFiles] = useState<FileConfigMap | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
  const [editFileName, setEditFileName] = useState<string | null>(null);
  const [editJson, setEditJson] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitMessage, setEditSubmitMessage] = useState("");
  const [editSubmitError, setEditSubmitError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [deleteFileName, setDeleteFileName] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [countryInputMode, setCountryInputMode] = useState(false);
  const [businessInputMode, setBusinessInputMode] = useState(false);
  const [channelInputMode, setChannelInputMode] = useState(false);
  const editTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const addTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

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
    if (editFileName && editTextAreaRef.current) {
      // Focus and scroll the inline editor into view when starting an edit.
      editTextAreaRef.current.focus();
      editTextAreaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editFileName]);

  useEffect(() => {
    if (addMode && addTextAreaRef.current) {
      // Focus and scroll the add configuration textarea into view when entering add mode.
      addTextAreaRef.current.focus();
      addTextAreaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [addMode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setFiles(null);
    setExpanded({});
    setAddMode(false);
    setAddJson("");
    setAddError("");
    setCrNumber("");
    setCrError("");
    setEditFileName(null);
    setEditJson("");
    setEditError("");

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
        headers: {
          "Content-Type": "application/json",
        },
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

  const toggleFile = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleEditClick = (name: string, value: unknown) => {
    setIsDeleteMode(false);
    setEditFileName(name);
    setEditJson(JSON.stringify(value, null, 2));
    setEditError("");
    setEditSubmitMessage("");
    setEditSubmitError("");
    setEditConfirmOpen(false);
  };

  const handleDeleteClick = (name: string, value: unknown) => {
    // Open the inline editor in delete mode so the user can review JSON before deleting.
    setIsDeleteMode(true);
    setEditFileName(name);
    setEditJson(JSON.stringify(value, null, 2));
    setEditError("");
    setEditSubmitMessage("");
    setEditSubmitError("");
    setEditConfirmOpen(false);
    setDeleteFileName(name);
    setDeleteError("");
    setDeleteModalOpen(false);
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
    const wrapped = {
      [keyForPreview]: parsed,
    };
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
    const wrappedConfig = {
      [keyForSubmit]: parsed,
    };

    const baseUrl = getAppRuleBaseUrl(environment);
    const simulateError =
      applicationId.trim().toUpperCase() === "ERROR";

    setAddSubmitMessage("");
    setAddSubmitError("");
    setAddSubmitting(true);

    try {
      const response = await fetch("/api/app-rule/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        return {
          ...base,
          ...(parsed as FileConfigMap),
        };
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          environment,
          country,
          business,
          channel,
          applicationId: applicationId.trim() || null,
          key: keyForSubmit,
          fileName: editFileName,
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
        if (!prev || !editFileName) return prev;
        return {
          ...prev,
          [editFileName]: parsed,
        };
      });
      // Automatically hide the inline editor a few seconds after a successful save.
      setTimeout(() => {
        setEditFileName(null);
        setEditJson("");
        setEditError("");
        setEditSubmitMessage("");
        setEditSubmitError("");
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

  return (
    <>
      <AppHeader
        title="App Rule Service Config Console"
        subtitle="Search existing JSON configuration by environment, country, business, channel, and optional application id."
      />
      <main className="app-main">
        <section className="panel panel-right">
          <form className="config-form" onSubmit={handleSearch} noValidate>
            <div className="field-row field-row-scope">
              <div className="field">
                <label htmlFor="environment-search">
                  Environment<span className="required">*</span>
                </label>
                <select
                  id="environment-search"
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
                <label htmlFor="country-search">
                  Country code<span className="required">*</span>
                </label>
                {!countryInputMode ? (
                  <select
                    id="country-search"
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
                  <>
                    <div className="input-with-icon">
                      <input
                        id="country-search"
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
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.5 5L7 9.5L11.5 14"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7 9.5H15"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="field-hint-row">
                      <p className="field-hint field-hint-compact">
                        Country code will be used as entered (e.g. AU, IN, HK).
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="field">
                <label htmlFor="business-search">
                  Business code<span className="required">*</span>
                </label>
                {!businessInputMode ? (
                  <select
                    id="business-search"
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
                  <>
                    <div className="input-with-icon">
                      <input
                        id="business-search"
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
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.5 5L7 9.5L11.5 14"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7 9.5H15"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="field-hint-row">
                      <p className="field-hint field-hint-compact">
                        Business code will be used as entered.
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="field">
                <label htmlFor="channel-search">
                  Channel ID<span className="required">*</span>
                </label>
                {!channelInputMode ? (
                  <select
                    id="channel-search"
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
                  <>
                    <div className="input-with-icon">
                      <input
                        id="channel-search"
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
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.5 5L7 9.5L11.5 14"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7 9.5H15"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="field-hint-row">
                      <p className="field-hint field-hint-compact">
                        Channel id will be used as entered.
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="field">
                <label htmlFor="applicationId-search">
                  Application ID <span className="optional">(optional)</span>
                </label>
                <input
                  id="applicationId-search"
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
                <label htmlFor="key-preview-search">Computed key</label>
                <input
                  id="key-preview-search"
                  name="key-preview-search"
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
                    setExpanded({});
                    setAddMode(false);
                    setAddJson("");
                    setAddError("");
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
              <div className="file-list">
                {Object.entries(files).map(([name, value]) => (
                  <div key={name} className="file-item">
                    <div className="file-row">
                      <button
                        type="button"
                        className="file-toggle"
                        onClick={() => toggleFile(name)}
                      >
                        <span>{name}</span>
                        <span className="file-toggle-icon">
                          {expanded[name] ? "▾" : "▸"}
                        </span>
                      </button>
                      <div className="file-actions">
                        <button
                          type="button"
                          className="file-action"
                          onClick={() => handleEditClick(name, value)}
                          aria-label={`Edit ${name}`}
                          title="Edit"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4 13.5L4.5 10.5L12.5 2.5L15.5 5.5L7.5 13.5L4 13.5Z"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M3 17H17"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="file-action file-action-danger"
                          onClick={() => handleDeleteClick(name, value)}
                          aria-label={`Delete ${name}`}
                          title="Delete"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M5 6H15"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                            <path
                              d="M8 6V4H12V6"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M6.5 6H13.5L13 15.5H7L6.5 6Z"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {expanded[name] && (
                      <pre className="file-json">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {editFileName && (
            <div className="form-section" style={{ marginTop: 16 }}>
              <h3>
                {isDeleteMode ? "Review configuration before delete" : "Edit configuration for file"}{" "}
                {editFileName} (key {searchKey || keyPreview || "CONFIG_KEY"})
              </h3>
              {editSubmitMessage && (
                <div className="status-banner status-banner-success">
                  {editSubmitMessage}
                </div>
              )}
              {editSubmitError && (
                <div className="status-banner status-banner-error">
                  {editSubmitError}
                </div>
              )}
              <div className="field">
                <div className="label-row">
                  <label htmlFor="editJson">
                    File JSON<span className="required">*</span>
                  </label>
                </div>
                <textarea
                  id="editJson"
                  name="editJson"
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
              <div className="form-footer">
                <div className="form-footer-right">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditFileName(null);
                      setEditJson("");
                      setEditError("");
                      setEditSubmitMessage("");
                      setEditSubmitError("");
                      setIsDeleteMode(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isDeleteMode ? deleteSubmitting : editSubmitting}
                    onClick={() => {
                      if (isDeleteMode) {
                        // Open delete confirmation modal
                        if (editFileName) {
                          setDeleteFileName(editFileName);
                          setDeleteModalOpen(true);
                        }
                      } else {
                        setEditConfirmOpen(true);
                      }
                    }}
                  >
                    {isDeleteMode
                      ? deleteSubmitting
                        ? "Deleting..."
                        : "Delete"
                      : editSubmitting
                      ? "Updating..."
                      : "Update"}
                  </button>
                </div>
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
                    <label htmlFor="crNumber-add">
                      Change Request (CR) Number<span className="required">*</span>
                    </label>
                    <input
                      id="crNumber-add"
                      name="crNumber-add"
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
                    <label htmlFor="addJson">
                      Configuration JSON<span className="required">*</span>
                    </label>
                    <span className="label-badge">Basic validation only</span>
                  </div>
                  <textarea
                    id="addJson"
                    name="addJson"
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
      {addMode && addModalOpen && (
        <div
          id="review-modal-search"
          className={"modal-backdrop open"}
          aria-hidden={false}
        >
          <div className="modal">
            <div className="modal-header">
              <h3>Review configuration</h3>
            </div>
            <div className="modal-body">
              {addSubmitMessage && (
                <div className="status-banner status-banner-success">
                  {addSubmitMessage}
                </div>
              )}
              {addSubmitError && (
                <div className="status-banner status-banner-error">
                  {addSubmitError}
                </div>
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
                    {applicationId.trim()
                      ? applicationId.trim().toUpperCase()
                      : "-"}
                  </span>
                </div>
                {envRequiresCr && (
                  <div className="scope-pair">
                    <span className="scope-label">CR</span>
                    <span className="scope-value">
                      {crNumber.trim() || "-"}
                    </span>
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
      {editConfirmOpen && editFileName && (
        <div
          id="edit-confirm-modal"
          className={"modal-backdrop open"}
          aria-hidden={false}
        >
          <div className="modal">
            <div className="modal-header">
              <h3>Apply changes to file</h3>
            </div>
            <div className="modal-body">
              <p className="field-hint">
                Do you want to apply changes for file <b>{editFileName}</b> under key{" "}
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
      {deleteFileName && (
        <div
          id="delete-modal-search"
          className={"modal-backdrop" + (deleteModalOpen ? " open" : "")}
          aria-hidden={!deleteModalOpen}
        >
          <div className="modal">
            <div className="modal-header">
              <h3>Delete file configuration</h3>
            </div>
            <div className="modal-body">
              {deleteError && (
                <div className="status-banner status-banner-error">
                  {deleteError}
                </div>
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
                  if (!deleteFileName) {
                    return;
                  }
                  setDeleteSubmitting(true);
                  setDeleteError("");
                  try {
                    const keyForSubmit = searchKey || keyPreview || "CONFIG_KEY";
                    const response = await fetch("/api/app-rule/file-delete", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
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
                    setExpanded((prev) => {
                      const next = { ...prev };
                      delete next[deleteFileName];
                      return next;
                    });
                    setDeleteModalOpen(false);
                    setDeleteFileName(null);
                    // Also clear inline editor if it was open in delete mode.
                    setEditFileName(null);
                    setEditJson("");
                    setEditError("");
                    setEditSubmitMessage("");
                    setEditSubmitError("");
                    setIsDeleteMode(false);
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

