(function (global) {
  "use strict";

  var STYLE_ID = "pcu-chat-widget-v2-style";
  var ROOT_ID = "pcu-chat-widget-v2-root";

  var defaultConfig = {
    openUrl: "https://www.workspaces.genai.citi.net/chat",
    launcherAriaLabel: "Open prompt assistant",
    inputPlaceholder: "Ask Prompt Catch Up...",
    zIndex: 1200,
    width: "540px",
    copyToClipboard: true,
    openInNewTab: true,
    onSubmit: null,
  };

  var state = {
    initialized: false,
    isOpen: false,
    config: null,
    rootEl: null,
    launcherBtn: null,
    panelEl: null,
    inputEl: null,
    sendBtn: null,
    bound: {},
  };

  function mergeConfig(config) {
    var merged = {};
    var key;
    for (key in defaultConfig) merged[key] = defaultConfig[key];
    if (config && typeof config === "object") {
      for (key in config) merged[key] = config[key];
    }
    return merged;
  }

  function injectStyles(config) {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".pcu-chat-v2-wrap{position:fixed;right:20px;bottom:20px;z-index:" +
      config.zIndex +
      ";display:flex;flex-direction:column;align-items:flex-end;gap:11px}" +
      ".pcu-chat-v2-panel{width:min(" +
      config.width +
      ",calc(100vw - 2rem));border-radius:14px;border:1px solid rgba(148,163,184,.28);background:linear-gradient(160deg,#0c1d33 0%,#0a1629 58%,#081425 100%);box-shadow:0 18px 42px rgba(2,6,23,.45);padding:13px}" +
      ".pcu-chat-v2-panel[hidden]{display:none !important}" +
      ".pcu-chat-v2-header{display:flex;align-items:center;gap:7px;margin-bottom:10px;color:#bfdbfe;font-size:12px;text-transform:uppercase;letter-spacing:.06em}" +
      ".pcu-chat-v2-dot{width:8px;height:8px;border-radius:999px;background:#22d3ee;box-shadow:0 0 0 4px rgba(34,211,238,.16)}" +
      ".pcu-chat-v2-title{font-weight:700}" +
      ".pcu-chat-v2-input-row{display:flex;align-items:flex-end;gap:9px}" +
      ".pcu-chat-v2-input{flex:1;min-width:0;border:1px solid rgba(148,163,184,.32);border-radius:10px;background:rgba(15,23,42,.65);color:#e2e8f0;padding:10px 12px;font-size:14px;line-height:1.35;resize:vertical;min-height:44px;max-height:140px}" +
      ".pcu-chat-v2-input::placeholder{color:#94a3b8}" +
      ".pcu-chat-v2-input:focus{outline:none;border-color:rgba(34,211,238,.75);box-shadow:0 0 0 3px rgba(34,211,238,.2)}" +
      ".pcu-chat-v2-send{border:none;border-radius:10px;padding:10px 13px;font-size:13px;font-weight:700;background:linear-gradient(180deg,#67e8f9 0%,#06b6d4 100%);color:#042f40;min-width:64px;cursor:pointer}" +
      ".pcu-chat-v2-launcher{border:1px solid rgba(148,163,184,.4);border-radius:999px;height:52px;padding:0 14px 0 9px;background:linear-gradient(180deg,#0f2138 0%,#0b1a2e 100%);color:#e2e8f0;display:inline-flex;align-items:center;gap:8px;box-shadow:0 12px 28px rgba(2,6,23,.35);cursor:pointer}" +
      ".pcu-chat-v2-launcher.open{border-color:rgba(103,232,249,.7)}" +
      ".pcu-chat-v2-launcher-icon{width:34px;height:34px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:rgba(30,41,59,.9);color:#67e8f9}" +
      ".pcu-chat-v2-launcher-text{font-size:13px;font-weight:700;letter-spacing:.01em}" +
      "@media (max-width:1024px){.pcu-chat-v2-wrap{right:10px;bottom:10px}.pcu-chat-v2-panel{width:min(" +
      config.width +
      ",calc(100vw - 1rem))}}";
    document.head.appendChild(style);
  }

  function buildDom(config) {
    var root = document.createElement("div");
    root.id = ROOT_ID;
    root.className = "pcu-chat-v2-wrap";

    var panel = document.createElement("form");
    panel.className = "pcu-chat-v2-panel";
    panel.hidden = true;
    panel.innerHTML =
      '<div class="pcu-chat-v2-header">' +
      '<span class="pcu-chat-v2-dot" aria-hidden="true"></span>' +
      '<span class="pcu-chat-v2-title">Prompt Assistant</span>' +
      "</div>" +
      '<div class="pcu-chat-v2-input-row">' +
      '<textarea class="pcu-chat-v2-input" rows="2"></textarea>' +
      '<button type="submit" class="pcu-chat-v2-send" aria-label="Send to Prompt Assistant">Ask</button>' +
      "</div>";
    panel.querySelector(".pcu-chat-v2-input").setAttribute("placeholder", config.inputPlaceholder);

    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "pcu-chat-v2-launcher";
    launcher.setAttribute("aria-label", config.launcherAriaLabel);
    launcher.innerHTML =
      '<span class="pcu-chat-v2-launcher-icon" aria-hidden="true">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">' +
      '<path d="M6.2 8.4c0-1.77 1.43-3.2 3.2-3.2h5.2c1.77 0 3.2 1.43 3.2 3.2v4.1c0 1.77-1.43 3.2-3.2 3.2h-3.9L7.9 18v-2.3c-1-.52-1.7-1.58-1.7-2.8V8.4z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />' +
      "</svg></span>" +
      '<span class="pcu-chat-v2-launcher-text">Ask Assistant</span>';

    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    state.rootEl = root;
    state.launcherBtn = launcher;
    state.panelEl = panel;
    state.inputEl = panel.querySelector(".pcu-chat-v2-input");
    state.sendBtn = panel.querySelector(".pcu-chat-v2-send");
  }

  function open() {
    if (!state.initialized) return;
    state.isOpen = true;
    state.panelEl.hidden = false;
    state.launcherBtn.classList.add("open");
    state.inputEl.focus();
  }

  function close() {
    if (!state.initialized) return;
    state.isOpen = false;
    state.panelEl.hidden = true;
    state.launcherBtn.classList.remove("open");
  }

  function toggle() {
    if (state.isOpen) close();
    else open();
  }

  function handleSubmit(event) {
    event.preventDefault();
    var message = state.inputEl.value.trim();
    if (!message) return;

    if (typeof state.config.onSubmit === "function") {
      try {
        state.config.onSubmit(message);
      } catch (_err) {
        // Ignore host callback errors to avoid breaking widget UX.
      }
    }

    var afterCopy = function () {
      if (state.config.openInNewTab && state.config.openUrl) {
        window.open(state.config.openUrl, "_blank", "noopener,noreferrer");
      }
      state.inputEl.value = "";
    };

    if (state.config.copyToClipboard && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).then(afterCopy).catch(afterCopy);
    } else {
      afterCopy();
    }
  }

  function handleTextareaHotkeys(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      state.panelEl.requestSubmit();
    }
  }

  function attachEvents() {
    state.bound.toggle = toggle;
    state.bound.submit = handleSubmit;
    state.bound.hotkeys = handleTextareaHotkeys;
    state.launcherBtn.addEventListener("click", state.bound.toggle);
    state.panelEl.addEventListener("submit", state.bound.submit);
    state.inputEl.addEventListener("keydown", state.bound.hotkeys);
  }

  function detachEvents() {
    if (!state.initialized) return;
    state.launcherBtn.removeEventListener("click", state.bound.toggle);
    state.panelEl.removeEventListener("submit", state.bound.submit);
    state.inputEl.removeEventListener("keydown", state.bound.hotkeys);
  }

  function init(config) {
    if (state.initialized) return api;
    state.config = mergeConfig(config);
    injectStyles(state.config);
    buildDom(state.config);
    attachEvents();
    state.initialized = true;
    return api;
  }

  function destroy() {
    if (!state.initialized) return;
    detachEvents();
    if (state.rootEl && state.rootEl.parentNode) state.rootEl.parentNode.removeChild(state.rootEl);
    state.initialized = false;
    state.isOpen = false;
    state.rootEl = null;
    state.launcherBtn = null;
    state.panelEl = null;
    state.inputEl = null;
    state.sendBtn = null;
    state.bound = {};
  }

  var api = {
    init: init,
    open: open,
    close: close,
    toggle: toggle,
    destroy: destroy,
  };

  global.PromptCatchupChatV2 = api;
})(window);
