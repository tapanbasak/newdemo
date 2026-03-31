import { AGENTS } from "@/lib/data";
import { PromptCatalog, PromptCatalogItem, SharedPrompt } from "@/lib/types";
import data from "@/public/assets/prompt-catalog-sample.json";

export function getBaseCatalogs(): PromptCatalog[] {
  return data as PromptCatalog[];
}

export function applyCounts(catalog: PromptCatalog, upvoteCounts: Record<string, number>) {
  const prompts = catalog.prompts.map((p) => {
    const key = `${catalog.agentId}_${p.id}`;
    return { ...p, upvotes: upvoteCounts[key] ?? p.upvotes };
  });
  return { ...catalog, prompts, totalPrompts: prompts.length };
}

export function mergeSharedPrompts(catalog: PromptCatalog, shared: SharedPrompt[]) {
  const sharedForAgent = shared.filter((p) =>
    p.audience
      .split(",")
      .map((v) => v.trim())
      .includes(`agent:${catalog.agentId}`)
  );
  const sharedItems: PromptCatalogItem[] = sharedForAgent.map((p, idx) => ({
    id: 1000 + idx,
    title: p.title,
    prompt: p.prompt,
    description: p.description || p.prompt,
    certified: false,
    upvotes: 0,
    author: p.createdBy,
  }));
  return {
    ...catalog,
    prompts: [...catalog.prompts, ...sharedItems],
    totalPrompts: catalog.prompts.length + sharedItems.length,
  };
}

export function buildAgentsWithCounts(catalogs: PromptCatalog[]) {
  const counts: Record<number, number> = {};
  for (const catalog of catalogs) counts[catalog.agentId] = catalog.prompts.length;
  return AGENTS.map((agent) => ({ ...agent, promptCount: counts[agent.id] ?? 0 }));
}

