"use client";

import { useState, useCallback } from "react";
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

const CONFIG_PLACEHOLDER = `{
  "mob_ac": {
    "useBAUEndpoint": false,
    "urlText": "test.com"
  },
  "mob_invest": {
    "investFlag": true
  }
}`;

export default function AppRulePage() {
  const [environment, setEnvironment] = useState("");
  const [country, setCountry] = useState("");
  const [business, setBusiness] = useState("");
  const [channel, setChannel] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [configJson, setConfigJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [jsonErrorVisible, setJsonErrorVisible] = useState(false);
  const [crNumber, setCrNumber] = useState("");
  const [crError, setCrError] = useState("");
  const [crErrorVisible, setCrErrorVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [lastReviewKey, setLastReviewKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const keyPreview = computeKey({
    env: environment,
    country,
    business,
    channel,
    appId: applicationId.trim(),
    includeEnv: false,
  });

  const envRequiresCr = environment === "PERF" || environment === "PROD";

  const validateJson = useCallback((): object | null => {
    const result = safeParseJson(configJson);
    if ("error" in result) {
      setJsonError(result.error);
      setJsonErrorVisible(true);
      return null;
    }
    setJsonError("");
    setJsonErrorVisible(false);
    return result.value;
  }, [configJson]);

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    const value = validateJson();
    if (!value) return;
    if (!environment || !country || !business || !channel) {
      setJsonError("Please select environment, country, business and channel before previewing.");
      setJsonErrorVisible(true);
      return;
    }
    if (envRequiresCr && !crNumber.trim()) {
      setCrError("Please enter a Change Request (CR) number for PERF / PROD.");
      setCrErrorVisible(true);
      return;
    }
    setCrError("");
    setCrErrorVisible(false);
    const key = computeKey({
      env: environment,
      country,
      business,
      channel,
      appId: applicationId.trim(),
      includeEnv: false,
    });
    setLastReviewKey(key);
    setModalOpen(true);
  };

  const handleReset = () => {
    setEnvironment("");
    setCountry("");
    setBusiness("");
    setChannel("");
    setApplicationId("");
    setConfigJson("");
    setJsonError("");
    setJsonErrorVisible(false);
    setCrNumber("");
    setCrError("");
    setCrErrorVisible(false);
    setSubmitMessage("");
    setSubmitError("");
    setModalOpen(false);
  };

  const handleModalSubmit = async () => {
    if (!lastReviewKey) {
      setModalOpen(false);
      return;
    }

    const parsed = safeParseJson(configJson);
    if ("error" in parsed) {
      setJsonError(parsed.error);
      setJsonErrorVisible(true);
      return;
    }

    if (envRequiresCr && !crNumber.trim()) {
      setCrError("Please enter a Change Request (CR) number for PERF / PROD.");
      setCrErrorVisible(true);
      return;
    }

    const baseUrl = getAppRuleBaseUrl(environment);
    const keyForSubmit = lastReviewKey;
    const wrappedConfig = {
      [keyForSubmit]: (parsed as { value: object }).value,
    };

    setSubmitMessage("");
    setSubmitError("");
    setIsSubmitting(true);
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
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setSubmitMessage(
        `Mock submit succeeded for key ${data.key} (env: ${data.environment}).`
      );
      setSubmitError("");
    } catch (error) {
      setSubmitError(
        `Mock submit failed: ${(error as Error).message}. Check console / Network tab for details.`
      );
      setSubmitMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfigBlur = () => validateJson();

  const reviewEnv = environment || "-";
  const reviewCountry = country || "-";
  const reviewBusiness = business || "-";
  const reviewChannel = channel || "-";
  const reviewAppId = applicationId.trim()
    ? applicationId.trim().toUpperCase()
    : "-";
  const reviewCr = envRequiresCr && crNumber.trim() ? crNumber.trim() : "-";

  let reviewJsonStr = "";
  if (configJson.trim()) {
    const parsedForPreview = safeParseJson(configJson);
    if (!("error" in parsedForPreview)) {
      const keyForPreview = lastReviewKey || keyPreview || "CONFIG_KEY";
      const wrapped = {
        [keyForPreview]: (parsedForPreview as { value: object }).value,
      };
      reviewJsonStr = JSON.stringify(wrapped, null, 2);
    }
  }

  return (
    <>
      <AppHeader
        title="App Rule Service Config Console"
        subtitle="Submit and manage JSON configuration scoped by environment, country, business, channel, and optional application id."
      />
      <main className="app-main">
        <section className="panel panel-right">
          <form className="config-form" onSubmit={handlePreview} noValidate>
            <div className="field-row field-row-scope">
              <div className="field">
                <label htmlFor="environment">
                  Environment<span className="required">*</span>
                </label>
                <select
                  id="environment"
                  name="environment"
                  required
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                >
                  <option value="">Select environment</option>
                  <option value="DEV">DEV</option>
                  <option value="UAT">UAT</option>
                  <option value="PERF">PERF</option>
                  <option value="PROD">PROD</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="country">
                  Country code<span className="required">*</span>
                </label>
                <select
                  id="country"
                  name="country"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="">Select country</option>
                  <option value="US">US</option>
                  <option value="CA">CA</option>
                  <option value="UK">UK</option>
                  <option value="SG">SG</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="business">
                  Business code<span className="required">*</span>
                </label>
                <select
                  id="business"
                  name="business"
                  required
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                >
                  <option value="">Select business</option>
                  <option value="GCB">GCB</option>
                  <option value="CRS">CRS</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="channel">
                  Channel ID<span className="required">*</span>
                </label>
                <select
                  id="channel"
                  name="channel"
                  required
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <option value="">Select channel</option>
                  <option value="CBOL">CBOL (Online)</option>
                  <option value="MOB">MOB (Mobile)</option>
                  <option value="IVR">IVR</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="applicationId">
                  Application ID <span className="optional">(optional)</span>
                </label>
                <input
                  id="applicationId"
                  name="applicationId"
                  type="text"
                  placeholder="e.g. ANDROID, IOS, WEB"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                />
                <p className="field-hint field-hint-compact">If blank, key uses country, business and channel.</p>
              </div>
              <div className="field">
                <label htmlFor="key-preview">Computed key</label>
                <input
                  id="key-preview"
                  name="key-preview"
                  type="text"
                  readOnly
                  className="readonly-input"
                  value={keyPreview || "<incomplete key>"}
                />
                <p className="field-hint field-hint-compact">
                  This is how the config key will be stored.
                </p>
              </div>
            </div>

          {envRequiresCr && (
            <div className="field">
              <label htmlFor="crNumber">
                Change Request (CR) Number<span className="required">*</span>
              </label>
              <input
                id="crNumber"
                name="crNumber"
                type="text"
                className="cr-input-short"
                placeholder="e.g. CHG123456"
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
              />
              <p className="field-hint">
                Required for PERF and PROD. This CR should be approved and linked to this change.
              </p>
              <p
                className={"json-error" + (crErrorVisible && crError ? "" : " hidden")}
                aria-live="polite"
              >
                {crError}
              </p>
            </div>
          )}

            <div className="field">
              <div className="label-row">
                <label htmlFor="configJson">
                  Configuration JSON<span className="required">*</span>
                </label>
                <span className="label-badge">Basic validation only</span>
              </div>
              <textarea
                id="configJson"
                name="configJson"
                rows={10}
                spellCheck={false}
                placeholder={CONFIG_PLACEHOLDER}
                required
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                onBlur={handleConfigBlur}
                className={jsonErrorVisible && jsonError ? "field-error" : ""}
              />
              <p
                id="json-error"
                className={"json-error" + (jsonErrorVisible && jsonError ? "" : " hidden")}
                aria-live="polite"
              >
                {jsonError}
              </p>
            </div>

            <div className="form-footer">
              <div className="form-footer-right">
                <button type="button" className="btn btn-ghost" onClick={handleReset}>
                  Reset
                </button>
                <button type="submit" className="btn btn-primary">
                  Preview
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>

      {/* Review modal */}
      <div
        id="review-modal"
        className={"modal-backdrop" + (modalOpen ? " open" : "")}
        aria-hidden={!modalOpen}
      >
        <div className="modal">
          <div className="modal-header">
            <h3>Review configuration</h3>
          </div>
          <div className="modal-body">
            <div className="review-scope">
              <div className="scope-pair">
                <span className="scope-label">Environment</span>
                <span className="scope-value">{reviewEnv}</span>
              </div>
              <div className="scope-pair">
                <span className="scope-label">Country</span>
                <span className="scope-value">{reviewCountry}</span>
              </div>
              <div className="scope-pair">
                <span className="scope-label">Business</span>
                <span className="scope-value">{reviewBusiness}</span>
              </div>
              <div className="scope-pair">
                <span className="scope-label">Channel</span>
                <span className="scope-value">{reviewChannel}</span>
              </div>
              <div className="scope-pair">
                <span className="scope-label">App ID</span>
                <span className="scope-value">{reviewAppId}</span>
              </div>
              <div className="scope-pair">
                <span className="scope-label">CR</span>
                <span className="scope-value">{reviewCr}</span>
              </div>
            </div>
            <div className="modal-json">
              <label>Configuration JSON</label>
              <pre className="modal-json-block">{reviewJsonStr}</pre>
              {submitMessage && (
                <p className="field-hint" style={{ marginTop: 6, color: "#16a34a" }}>
                  {submitMessage}
                </p>
              )}
              {submitError && (
                <p className="json-error" style={{ marginTop: 4 }}>
                  {submitError}
                </p>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleModalSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>

      <footer className="app-footer" />
    </>
  );
}
