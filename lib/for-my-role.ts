import type { Agent } from "./types";

export type PromptRoleHint = { role?: string; roleTags?: string[] };

function normalizeRoleSlug(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * True if this assistant should appear in the "For my role" bucket when any prompt
 * for this agent has `role` or `roleTags` matching the user role (after normalization).
 *
 * Optional: also match on agent `roleTags` (see commented block below).
 */
export function agentMatchesForMyRole(
  agent: Agent,
  promptRolesByAgent: Record<number, PromptRoleHint[]>,
  userRole: string
): boolean {
  const want = normalizeRoleSlug(userRole);
  if (!want) return false;

  // Agent-level tags (from `agents` collection) — skipped for now; use prompt role data only.
  // const agentTags = agent.roleTags ?? [];
  // if (agentTags.some((t) => normalizeRoleSlug(t) === want)) return true;

  const rows = promptRolesByAgent[agent.id] ?? [];
  for (const row of rows) {
    if (normalizeRoleSlug(row.role) === want) return true;
    const tags = Array.isArray(row.roleTags) ? row.roleTags : [];
    if (tags.some((t) => normalizeRoleSlug(t) === want)) return true;
  }

  return false;
}
