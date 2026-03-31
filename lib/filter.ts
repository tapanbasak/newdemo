import { Agent, RecommendStatus, SortBy } from "@/lib/types";

export function filterAgents(
  agents: Agent[],
  search: string,
  status: RecommendStatus,
  sort: SortBy,
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

  switch (sort) {
    case "alphabetical":
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "newest":
      result.sort(
        (a, b) => new Date(b.updatedDate ?? "").getTime() - new Date(a.updatedDate ?? "").getTime()
      );
      break;
    default:
      result.sort((a, b) => b.promptCount - a.promptCount);
      break;
  }

  return result;
}
