import { Injectable } from '@angular/core';

type PromptCatchupChatApi = {
  init: (config?: {
    openUrl?: string;
    launcherAriaLabel?: string;
    inputPlaceholder?: string;
    copyToClipboard?: boolean;
    openInNewTab?: boolean;
  }) => unknown;
  destroy: () => void;
};

declare global {
  interface Window {
    PromptCatchupChat?: PromptCatchupChatApi;
  }
}

@Injectable({ providedIn: 'root' })
export class PromptCatchupWidgetService {
  private readonly widgetScriptId = 'prompt-catchup-chat-widget-script';
  private readonly widgetScriptSrc = 'assets/prompt-catchup-chat-widget.js';
  private initialized = false;

  init(): void {
    if (this.initialized) return;

    if (window.PromptCatchupChat) {
      this.initializeWidget();
      return;
    }

    let script = document.getElementById(this.widgetScriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = this.widgetScriptId;
      script.src = this.widgetScriptSrc;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener('load', () => this.initializeWidget(), { once: true });
  }

  destroy(): void {
    if (!this.initialized) return;
    window.PromptCatchupChat?.destroy();
    this.initialized = false;
  }

  private initializeWidget(): void {
    window.PromptCatchupChat?.init({
      openUrl: 'https://www.workspaces.genai.citi.net/chat',
      launcherAriaLabel: 'Open prompt chatbox',
      inputPlaceholder: 'ASK PROMPT CATCH UP',
      copyToClipboard: true,
      openInNewTab: true,
    });
    this.initialized = true;
  }
}
