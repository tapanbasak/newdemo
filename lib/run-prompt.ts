/**
 * Maps stored `platform` values to the chat URL opened after copying the prompt.
 * Returns `null` for all other platforms — UI should only show "Prompt copied".
 */
export function getRunPromptTargetUrl(platform: string | undefined): string | null {
  const p = String(platform ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  if (!p) return null;
  if (p === "copilot" || p === "microsoft_365_copilot") {
    return "https://m365.cloud.microsoft/chat";
  }
  if (p === "stylus" || p === "citi_stylus") {
    return "https://workspaces.genai.citi.net/chat";
  }
  return null;
}
