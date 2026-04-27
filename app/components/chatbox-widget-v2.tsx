"use client";

import { useState } from "react";

export default function ChatboxWidgetV2() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedMessage = message.trim();
    if (!submittedMessage) return;

    await navigator.clipboard.writeText(submittedMessage);
    window.open("https://www.workspaces.genai.citi.net/chat", "_blank", "noopener,noreferrer");
    setMessage("");
  }

  return (
    <div className="pcu-chat-v2-wrap">
      {isOpen ? (
        <form className="pcu-chat-v2-panel" onSubmit={submitMessage}>
          <div className="pcu-chat-v2-header">
            <span className="pcu-chat-v2-dot" aria-hidden="true" />
            <span className="pcu-chat-v2-title">Prompt Assistant</span>
          </div>
          <div className="pcu-chat-v2-input-row">
            <textarea
              className="pcu-chat-v2-input"
              placeholder="Ask Prompt Catch Up..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
            <button type="submit" className="pcu-chat-v2-send" aria-label="Send to Prompt Assistant">
              Ask
            </button>
          </div>
        </form>
      ) : null}

      <button
        type="button"
        className={`pcu-chat-v2-launcher ${isOpen ? "open" : ""}`}
        aria-label={isOpen ? "Close prompt assistant" : "Open prompt assistant"}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="pcu-chat-v2-launcher-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M6.2 8.4c0-1.77 1.43-3.2 3.2-3.2h5.2c1.77 0 3.2 1.43 3.2 3.2v4.1c0 1.77-1.43 3.2-3.2 3.2h-3.9L7.9 18v-2.3c-1-.52-1.7-1.58-1.7-2.8V8.4z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="pcu-chat-v2-launcher-text">Ask Assistant</span>
      </button>
    </div>
  );
}
