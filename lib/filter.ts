import { Agent, RecommendStatus, SortBy } from "@/lib/types";

/** Millis for "Newest": latest prompt activity if known, else agent card `updatedDate`. */
export function agentNewestMillis(agent: Agent): number {
  const fromPrompt = agent.latestPromptAt ? new Date(agent.latestPromptAt).getTime() : NaN;
  if (Number.isFinite(fromPrompt) && fromPrompt > 0) return fromPrompt;
  const fromAgent = agent.updatedDate ? new Date(agent.updatedDate).getTime() : NaN;
  return Number.isFinite(fromAgent) ? fromAgent : 0;
}

/** Category / name search / status only — no ordering. */
export function filterAgentsNoSort(
  agents: Agent[],
  search: string,
  status: RecommendStatus,
  groupSlug: string | null
): Agent[] {
  let result = [...agents];

  if (groupSlug && groupSlug !== "my-upvotes") {
    result = result.filter((a) => a.category === groupSlug);
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(
      (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    );
  }

  if (status !== "all") {
    const mapped = status === "adopt" ? "ADOPT" : "UNDER_EVALUATION";
    result = result.filter((a) => a.status === mapped);
  }

  return result;
}

/** Sort a copy of agents by catalog sort mode (Most Prompts / Newest / Alphabetical). */
export function sortAgentsBy(agents: Agent[], sort: SortBy): Agent[] {
  const copy = [...agents];
  switch (sort) {
    case "alphabetical":
      copy.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "newest":
      copy.sort((a, b) => agentNewestMillis(b) - agentNewestMillis(a));
      break;
    default:
      copy.sort((a, b) => b.promptCount - a.promptCount);
      break;
  }
  return copy;
}

export function filterAgents(
  agents: Agent[],
  search: string,
  status: RecommendStatus,
  sort: SortBy,
  groupSlug: string | null
): Agent[] {
  return sortAgentsBy(filterAgentsNoSort(agents, search, status, groupSlug), sort);
}
