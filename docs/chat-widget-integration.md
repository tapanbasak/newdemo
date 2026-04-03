# Prompt Catchup Chat Widget Integration

Use this standalone widget in any MFE app (Angular, React, Vue, plain HTML) without importing React components.

## 1) Add script

```html
<script src="http://localhost:3000/widget/prompt-catchup-chat-widget.js"></script>
```

For production, replace with your hosted CDN/static URL.

## 2) Initialize widget

```html
<script>
  PromptCatchupChat.init({
    openUrl: "https://www.vortexiq.ai/contact-us",
    launcherAriaLabel: "Open prompt chatbox",
    inputPlaceholder: "ASK PROMPT CATCH UP",
    zIndex: 1200,
    copyToClipboard: true,
    openInNewTab: true,
    onSubmit: function (message) {
      console.log("Submitted message:", message);
      // Optional host-side action (analytics/API call)
    },
  });
</script>
```

## 3) Optional programmatic controls

```html
<script>
  // Open panel
  PromptCatchupChat.open();

  // Close panel
  PromptCatchupChat.close();

  // Toggle panel
  PromptCatchupChat.toggle();

  // Remove widget from page
  PromptCatchupChat.destroy();
</script>
```

## Notes

- On submit, widget copies typed text to clipboard (if enabled), then opens `openUrl` in a new tab (if enabled).
- Widget CSS is auto-injected and class-prefixed with `pcu-chat-*`.
- Call `PromptCatchupChat.init(...)` once per page load.
