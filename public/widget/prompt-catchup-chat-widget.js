(function (global) {
  "use strict";

  var STYLE_ID = "pcu-chat-widget-style";
  var ROOT_ID = "pcu-chat-widget-root";

  var defaultConfig = {
    openUrl: "https://www.vortexiq.ai/contact-us",
    launcherAriaLabel: "Open prompt chatbox",
    inputPlaceholder: "ASK PROMPT CATCH UP",
    zIndex: 1200,
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

  function injectStyles(zIndex) {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".pcu-chat-launcher{position:fixed;right:20px;bottom:20px;z-index:" +
      zIndex +
      ";display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:2px;width:58px;height:58px;padding:0;background:#111827;color:#f3f4f6;box-shadow:0 10px 22px rgba(0,0,0,.28);cursor:pointer}" +
      ".pcu-chat-launcher-icon{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:999px;background:#5b6069;color:#e5e7eb}" +
      ".pcu-chatbox-panel{position:fixed;left:50%;bottom:21px;transform:translateX(-50%);z-index:" +
      zIndex +
      ";width:min(620px,calc(100vw - 2rem));display:flex;align-items:center;gap:.55rem;padding:.55rem .65rem;border-radius:4px;background:#111827;box-shadow:0 12px 28px rgba(0,0,0,.35)}" +
      ".pcu-chatbox-panel[hidden]{display:none !important}" +
      ".pcu-chatbox-input{flex:1;min-width:0;border:none;border-radius:999px;background:#6b7280;color:#fff;padding:.5rem .85rem;font-size:15px}" +
      ".pcu-chatbox-input::placeholder{color:#e5e7eb}" +
      ".pcu-chatbox-input:focus{outline:2px solid #cbd5e1;outline-offset:1px}" +
      ".pcu-chatbox-send{width:34px;height:34px;border:none;border-radius:999px;background:#e5e7eb;color:#111827;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}";
    document.head.appendChild(style);
  }

  function buildDom(config) {
    var root = document.createElement("div");
    root.id = ROOT_ID;

    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "pcu-chat-launcher";
    launcher.setAttribute("aria-label", config.launcherAriaLabel);
    launcher.innerHTML =
      '<span class="pcu-chat-launcher-icon" aria-hidden="true">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">' +
      '<circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="2" stroke-dasharray="2 3" stroke-linecap="round" />' +
      "</svg></span>";

    var panel = document.createElement("form");
    panel.className = "pcu-chatbox-panel";
    panel.hidden = true;
    panel.innerHTML =
      '<input type="text" class="pcu-chatbox-input" />' +
      '<button type="submit" class="pcu-chatbox-send" aria-label="Send chat message">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none">' +
      '<path d="M12 18V6M12 6l-5 5M12 6l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
      "</svg></button>";
    panel.querySelector(".pcu-chatbox-input").setAttribute("placeholder", config.inputPlaceholder);

    root.appendChild(launcher);
    root.appendChild(panel);
    document.body.appendChild(root);

    state.rootEl = root;
    state.launcherBtn = launcher;
    state.panelEl = panel;
    state.inputEl = panel.querySelector(".pcu-chatbox-input");
    state.sendBtn = panel.querySelector(".pcu-chatbox-send");
  }

  function open() {
    if (!state.initialized) return;
    state.isOpen = true;
    state.panelEl.hidden = false;
    state.inputEl.focus();
  }

  function close() {
    if (!state.initialized) return;
    state.isOpen = false;
    state.panelEl.hidden = true;
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

  function attachEvents() {
    state.bound.toggle = toggle;
    state.bound.submit = handleSubmit;
    state.launcherBtn.addEventListener("click", state.bound.toggle);
    state.panelEl.addEventListener("submit", state.bound.submit);
  }

  function detachEvents() {
    if (!state.initialized) return;
    state.launcherBtn.removeEventListener("click", state.bound.toggle);
    state.panelEl.removeEventListener("submit", state.bound.submit);
  }

  function init(config) {
    if (state.initialized) return api;
    state.config = mergeConfig(config);
    injectStyles(state.config.zIndex);
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

  global.PromptCatchupChat = api;
})(window);
