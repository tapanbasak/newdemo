// Simple prototype JS to wire up interactions and JSON preview.

function computeKey({ env, country, business, channel, appId, includeEnv }) {
  const parts = [];
  if (includeEnv && env) parts.push(env);
  if (country) parts.push(country);
  if (business) parts.push(business);
  if (channel) parts.push(channel);
  if (appId) parts.push(appId);
  return parts.join("_");
}

function safeParseJson(raw) {
  if (!raw || !raw.trim()) {
    return { error: "JSON configuration is empty." };
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { error: "Configuration must be a JSON object (not array or primitive)." };
    }
    return { value: parsed };
  } catch (e) {
    return { error: e.message || "Invalid JSON." };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const serviceGrid = document.getElementById("service-grid");
  const formTitle = document.getElementById("form-title");
  const formSubtitle = document.getElementById("form-subtitle");

  const environment = document.getElementById("environment");
  const country = document.getElementById("country");
  const business = document.getElementById("business");
  const channel = document.getElementById("channel");
  const applicationId = document.getElementById("applicationId");
  const keyPreview = document.getElementById("key-preview");
  const configJson = document.getElementById("configJson");
  const jsonError = document.getElementById("json-error");
  const form = document.getElementById("config-form");
  const previewOutput = document.getElementById("preview-output");
  const previewBadge = document.getElementById("preview-badge");
  const btnReset = document.getElementById("btn-reset");

  // Microservice selection (left cards)
  if (serviceGrid) {
    serviceGrid.addEventListener("click", (evt) => {
      const card = evt.target.closest(".service-card");
      if (!card) return;

      const selected = serviceGrid.querySelector(".service-selected");
      if (selected && selected !== card) {
        selected.classList.remove("service-selected");
      }
      card.classList.add("service-selected");

      const svc = card.getAttribute("data-service");
      if (svc === "apprule") {
        formTitle.textContent = "App Rule configuration";
        formSubtitle.textContent =
          "Define JSON configuration scoped by environment, country, business, channel, and optional application id.";
      } else if (svc === "mfa") {
        formTitle.textContent = "MFA Service configuration (concept)";
        formSubtitle.textContent =
          "For MFA we could use a similar model: store per-journey policies as JSON documents keyed by country and channel.";
      } else {
        formTitle.textContent = "Generic configuration";
        formSubtitle.textContent =
          "This console can host configuration forms for any microservice that maps to a JSON document.";
      }
    });
  }

  // Update key preview whenever any part of the key changes. (Key never includes env.)
  function updateKeyPreview() {
    const key = computeKey({
      env: environment.value,
      country: country.value,
      business: business.value,
      channel: channel.value,
      appId: applicationId.value.trim(),
      includeEnv: false,
    });
    keyPreview.value = key || "<incomplete key>";
  }

  [environment, country, business, channel, applicationId].forEach((el) => {
    if (!el) return;
    const eventName = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventName, updateKeyPreview);
  });

  // Basic JSON validation on blur / input.
  function validateJson() {
    const raw = configJson.value;
    const result = safeParseJson(raw);

    if (result.error) {
      jsonError.textContent = result.error;
      jsonError.classList.remove("hidden");
      configJson.classList.add("field-error");
      return null;
    }

    jsonError.textContent = "";
    jsonError.classList.add("hidden");
    configJson.classList.remove("field-error");
    return result.value;
  }

  configJson.addEventListener("blur", validateJson);

  // Submit handler – build config key and show prettified preview.
  form.addEventListener("submit", (evt) => {
    evt.preventDefault();

    const value = validateJson();
    if (!value) {
      previewBadge.textContent = "JSON invalid";
      previewBadge.classList.remove("chip-muted", "chip-green");
      previewBadge.classList.add("chip-error");
      return;
    }

    if (!country.value || !business.value || !channel.value) {
      jsonError.textContent =
        "Please select country, business and channel to compute the document key.";
      jsonError.classList.remove("hidden");
      return;
    }

    const key = computeKey({
      env: environment.value,
      country: country.value,
      business: business.value,
      channel: channel.value,
      appId: applicationId.value.trim(),
      includeEnv: false,
    });

    const doc = { [key]: value };
    previewOutput.textContent = JSON.stringify(doc, null, 2);
    previewBadge.textContent = "Preview only – not saved";
    previewBadge.classList.remove("chip-muted");
    previewBadge.classList.add("chip-green");
  });

  // Reset form and preview state.
  btnReset.addEventListener("click", () => {
    form.reset();
    jsonError.textContent = "";
    jsonError.classList.add("hidden");
    configJson.classList.remove("field-error");
    updateKeyPreview();
    previewOutput.textContent = "";
    previewBadge.textContent = "Waiting for input";
    previewBadge.classList.remove("chip-green", "chip-error");
    previewBadge.classList.add("chip-muted");
  });

  // Submit button – in a real app would POST config to backend.
  const btnSubmit = document.getElementById("btn-submit");
  if (btnSubmit) {
    btnSubmit.addEventListener("click", () => {
      const value = validateJson();
      if (!value) {
        jsonError.textContent = "Please fix JSON errors before submitting.";
        jsonError.classList.remove("hidden");
        return;
      }
      if (!country.value || !business.value || !channel.value) {
        jsonError.textContent = "Please select country, business and channel.";
        jsonError.classList.remove("hidden");
        return;
      }
      const key = computeKey({
        env: environment.value,
        country: country.value,
        business: business.value,
        channel: channel.value,
        appId: applicationId.value.trim(),
        includeEnv: false,
      });
      alert("Submit would save configuration for key: " + key + "\n(Not implemented in this prototype.)");
    });
  }

  // Initialise state on load.
  updateKeyPreview();
});

