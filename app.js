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
  const btnReset = document.getElementById("btn-reset");

  // Review modal elements
  const reviewModal = document.getElementById("review-modal");
  const reviewEnv = document.getElementById("review-env");
  const reviewCountry = document.getElementById("review-country");
  const reviewBusiness = document.getElementById("review-business");
  const reviewChannel = document.getElementById("review-channel");
  const reviewAppId = document.getElementById("review-appId");
  const reviewJson = document.getElementById("review-json");
  const modalCancel = document.getElementById("modal-cancel");
  const modalSubmit = document.getElementById("modal-submit");

  let lastReviewKey = "";

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

  function openReviewModal({ key, json }) {
    if (!reviewModal) return;
    lastReviewKey = key;
    if (reviewEnv) reviewEnv.textContent = environment.value || "-";
    if (reviewCountry) reviewCountry.textContent = country.value || "-";
    if (reviewBusiness) reviewBusiness.textContent = business.value || "-";
    if (reviewChannel) reviewChannel.textContent = channel.value || "-";
    if (reviewAppId) reviewAppId.textContent = applicationId.value.trim() || "-";
    reviewJson.textContent = JSON.stringify(json, null, 2);
    reviewModal.classList.add("open");
    reviewModal.setAttribute("aria-hidden", "false");
  }

  function closeReviewModal() {
    if (!reviewModal) return;
    reviewModal.classList.remove("open");
    reviewModal.setAttribute("aria-hidden", "true");
  }

  // Preview handler – validate and open review modal.
  form.addEventListener("submit", (evt) => {
    evt.preventDefault();

    const value = validateJson();
    if (!value) {
      return;
    }

    if (!environment.value || !country.value || !business.value || !channel.value) {
      jsonError.textContent =
        "Please select environment, country, business and channel before previewing.";
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

    openReviewModal({ key, json: value });
  });

  // Reset form and preview state.
  btnReset.addEventListener("click", () => {
    form.reset();
    jsonError.textContent = "";
    jsonError.classList.add("hidden");
    configJson.classList.remove("field-error");
    updateKeyPreview();
    closeReviewModal();
  });

  if (modalCancel) {
    modalCancel.addEventListener("click", () => {
      closeReviewModal();
    });
  }

  if (modalSubmit) {
    modalSubmit.addEventListener("click", () => {
      if (!lastReviewKey) {
        closeReviewModal();
        return;
      }
      alert(
        "Submit would save configuration for key: " +
          lastReviewKey +
          "\n(Not implemented in this prototype.)"
      );
      closeReviewModal();
    });
  }

  // Initialise state on load.
  updateKeyPreview();
});

