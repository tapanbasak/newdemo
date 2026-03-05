"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { getPsgBaseUrl } from "@/env-config";

const CSI_VALUES = [
  "169073",
  "178695",
  "178634",
  "167349",
  "734622",
  "168723",
  "➕ Enter CSI",
];

export default function PsgPage() {
  const [csiInput, setCsiInput] = useState("");
  const [selectedCsi, setSelectedCsi] = useState("");
  const [newCsi, setNewCsi] = useState("");
  const [showCsiList, setShowCsiList] = useState(false);
  const [domainType, setDomainType] = useState<"nonprod" | "prod" | "both">("both");
  const [nonProdDomains, setNonProdDomains] = useState<string[]>([""]);
  const [prodDomains, setProdDomains] = useState<string[]>([""]);
  const [crNumber, setCrNumber] = useState("");
  const [originHelpOpen, setOriginHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const csiListRef = useRef<HTMLDivElement>(null);
  const psgInstanceRef = useRef<HTMLSelectElement | null>(null);

  const showStep3 = domainType === "nonprod" || domainType === "both";
  const showStep4 = domainType === "prod" || domainType === "both";

  const filteredCsiList = CSI_VALUES.filter((c) =>
    c.toLowerCase().includes(csiInput.toLowerCase())
  );

  const selectCsi = useCallback((value: string) => {
    setCsiInput(value);
    setSelectedCsi(value);
    setShowCsiList(false);
  }, []);

  const isEnterCsi = selectedCsi.includes("Enter CSI");

  const addNonProd = () => setNonProdDomains((prev) => [...prev, ""]);
  const addProd = () => setProdDomains((prev) => [...prev, ""]);

  const setNonProdAt = (index: number, value: string) => {
    setNonProdDomains((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const setProdAt = (index: number, value: string) => {
    setProdDomains((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeNonProd = (index: number) => {
    setNonProdDomains((prev) => prev.filter((_, i) => i !== index));
  };
  const removeProd = (index: number) => {
    setProdDomains((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (csiListRef.current && !csiListRef.current.contains(e.target as Node)) {
        setShowCsiList(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    const instances =
      Array.from(psgInstanceRef.current?.selectedOptions ?? []).map(
        (opt) => opt.value
      );

    const csiValue = isEnterCsi ? newCsi.trim() : selectedCsi || csiInput;
    const baseUrl = getPsgBaseUrl(domainType);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/psg/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csi: csiValue,
          newCsi: isEnterCsi ? newCsi.trim() || null : null,
          domainType,
          nonProdDomains,
          prodDomains,
          crNumber: crNumber.trim() || null,
          instances,
          baseUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      alert(
        `Mock PSG submit succeeded.\nBase URL: ${data.baseUrl}\nCSI: ${data.csi}\nInstances: ${data.instanceCount}`
      );
    } catch (error) {
      alert(
        `Mock PSG submit failed: ${(error as Error).message}.` +
          "\nCheck the browser console or Network tab for details."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AppHeader
        title="Ingress Origin Whitelisting – PSG"
        subtitle="Self-service portal to whitelist application domains for the Platform Security Gateway (PSG)"
      />
      <main className="app-main">
        <section className="panel panel-right">
          <div className="panel-header">
            <h2>PSG Origin Whitelisting</h2>
            <p className="panel-subtitle">
              Whitelist application domains for secure communication with the Platform Security Gateway (PSG). All changes are applied dynamically at runtime.
            </p>
          </div>

          <div className="form-section">
            <h3>Step 1: Application Identification</h3>
            <div className="field">
              <div className="csi-row">
                <label className="csi-label">
                  CSI <span className="required">*</span>
                </label>
                <div className="dropdown-psg csi-input-wrap" ref={csiListRef}>
                  <input
                    type="text"
                    placeholder="Search or select CSI"
                    value={csiInput}
                    onChange={(e) => setCsiInput(e.target.value)}
                    onFocus={() => setShowCsiList(true)}
                  />
                  <div
                    id="csiList"
                    className="dropdown-list"
                    style={{ display: showCsiList ? "block" : "none" }}
                  >
                    {filteredCsiList.map((item) => (
                      <div
                        key={item}
                        onClick={() => selectCsi(item)}
                        onMouseDown={(e) => e.preventDefault()}
                        role="button"
                        tabIndex={0}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {isEnterCsi && (
                <input
                  type="text"
                  placeholder="Enter new CSI"
                  value={newCsi}
                  onChange={(e) => setNewCsi(e.target.value)}
                  style={{ marginTop: "8px" }}
                />
              )}
              <p className="field-hint">
                CSI uniquely identifies your application in PSG. If your CSI is not listed, select <b>Enter CSI</b> and enter a new one.
              </p>
            </div>
          </div>

          <div className="form-section">
            <h3>Step 2: PSG Instance Selection</h3>
            <div className="field">
              <label>
                Select PSG Instance(s) <span className="required">*</span>
              </label>
              <select multiple id="psgInstance" ref={psgInstanceRef}>
                <option>psg-nonprod-ap-south</option>
                <option>psg-nonprod-us-east</option>
                <option>psg-prod-ap-south</option>
              </select>
              <p className="field-hint">
                Select the PSG instance(s) where your application is onboarded. (Multiple selection allowed)
              </p>
            </div>
          </div>

          <div className="collapsible-box">
            <button
              type="button"
              className="collapsible-trigger"
              onClick={() => setOriginHelpOpen(!originHelpOpen)}
              aria-expanded={originHelpOpen}
              id="originHelpTrigger"
            >
              What is an Application Origin?
            </button>
            <div
              className={"collapsible-content" + (originHelpOpen ? " collapsible-content-open" : "")}
              id="originHelpContent"
              aria-hidden={!originHelpOpen}
            >
              An origin is the <b>application domain or hostname</b> from which API requests are sent <b>to PSG</b>.
              PSG will allow requests <b>only from the domains listed below</b>.
              <br />
              <br />
              <b>Examples:</b> https://dev.myapp.company.com, https://uat.myapp.company.com, https://www.myapp.com
            </div>
          </div>

          <div className="form-section">
            <h3>Configure domain type</h3>
            <p className="field-hint" style={{ marginBottom: 0 }}>
              Choose whether you are adding non-production domains, production domains, or both.
            </p>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="domainType"
                  value="nonprod"
                  checked={domainType === "nonprod"}
                  onChange={() => setDomainType("nonprod")}
                />
                Non-production only (DEV / UAT / PERF)
              </label>
              <label>
                <input
                  type="radio"
                  name="domainType"
                  value="prod"
                  checked={domainType === "prod"}
                  onChange={() => setDomainType("prod")}
                />
                Production only
              </label>
              <label>
                <input
                  type="radio"
                  name="domainType"
                  value="both"
                  checked={domainType === "both"}
                  onChange={() => setDomainType("both")}
                />
                Both non-production and production
              </label>
            </div>
          </div>

          {showStep3 && (
            <div id="step3Section" className="form-section">
              <h3>Step 3: Non-Production Application Domains (Calling PSG)</h3>
              <div className="info-box">
                Applies to <span className="env-badge">DEV</span> <span className="env-badge">UAT</span> <span className="env-badge">PERF</span> environments.
                <br />
                Each non-production domain requires <b>one-time approval by the CSI Manager</b> before PSG access is enabled.
              </div>
              <div id="nonProdContainer">
                {nonProdDomains.map((url, i) => (
                  <div key={i} className="origin-row">
                    <input
                      type="text"
                      placeholder="https://dev.example.com"
                      value={url}
                      onChange={(e) => setNonProdAt(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeNonProd(i)}
                      disabled={nonProdDomains.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary" style={{ marginTop: "10px" }} onClick={addNonProd}>
                + Add Another Non-Prod Domain
              </button>
            </div>
          )}

          {showStep4 && (
            <div id="step4Section" className="form-section">
              <h3>Step 4: Production Application Domains (Calling PSG)</h3>
              <div className="warning-box">
                Production access is tightly controlled.
                <br />
                Add only <b>live application domains</b> that will call PSG. A valid <b>Change Request (CR)</b> is mandatory and will be validated automatically.
              </div>
              <div id="prodContainer">
                {prodDomains.map((url, i) => (
                  <div key={i} className="origin-row">
                    <input
                      type="text"
                      placeholder="https://www.example.com"
                      value={url}
                      onChange={(e) => setProdAt(i, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeProd(i)}
                      disabled={prodDomains.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary" style={{ marginTop: "10px" }} onClick={addProd}>
                + Add Another Prod Domain
              </button>

              <div id="crFieldWrap" className="field cr-field-mandatory" style={{ marginTop: "14px" }}>
                <label>
                  Change Request (CR) Number <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="crNumberInput"
                  placeholder="e.g. CHG123456"
                  value={crNumber}
                  onChange={(e) => setCrNumber(e.target.value)}
                />
                <p className="field-hint">
                  This CR will be validated and applied to <b>all production domains</b>. The CR must be in <b>Active / Implementation</b> stage and linked to the selected CSI.
                </p>
              </div>

              <div className="checkbox-row checkbox-row-hidden">
                <input type="checkbox" id="prodConfirm" />
                <label htmlFor="prodConfirm">
                  I confirm this production change is approved, scheduled, and linked to the selected CSI
                </label>
              </div>
            </div>
          )}

          <div className="form-footer">
            <div className="form-footer-right">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => window.location.reload()}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer" />
    </>
  );
}
