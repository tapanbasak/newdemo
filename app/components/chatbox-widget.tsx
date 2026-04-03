"use client";

import { useState } from "react";

export default function ChatboxWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedMessage = message.trim();
    if (!submittedMessage) return;

    // Use this value for API calls or navigation.
    // Example API call:
    // await fetch("/api/chat", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ message: submittedMessage }),
    // });

    await navigator.clipboard.writeText(submittedMessage);
    window.open("https://www.workspaces.genai.citi.net/chat", "_blank", "noopener,noreferrer");
    setMessage("");
  }

  return (
    <>
      <button
        type="button"
        className="pcu-chat-launcher"
        aria-label={isOpen ? "Close prompt chatbox" : "Open prompt chatbox"}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="pcu-chat-launcher-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="2 3"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <form className="pcu-chatbox-panel" onSubmit={submitMessage}>
          <input
            type="text"
            className="pcu-chatbox-input"
            placeholder="ASK PROMPT CATCH UP"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit" className="pcu-chatbox-send" aria-label="Send chat message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 18V6M12 6l-5 5M12 6l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      ) : null}
    </>
  );
}
