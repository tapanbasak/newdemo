export type AgentStatus = "ADOPT" | "UNDER_EVALUATION";
export type RecommendStatus = "all" | "adopt" | "under_evaluation";
export type SortBy = "most_prompts" | "newest" | "alphabetical";

export interface Agent {
  id: number;
  name: string;
  description: string;
  status: AgentStatus;
  promptCount: number;
  updatedDate?: string;
  category: string;
  roleTags?: string[];
  usageCount?: number;
}

export interface Group {
  name: string;
  count: number;
  slug: string;
}

export interface PromptCatalogItem {
  id: number;
  title: string;
  prompt?: string;
  description: string;
  certified: boolean;
  upvotes: number;
  author: string;
  timesSaved?: string;
  tip?: string;
  lastUpdated?: string;
}

export interface PromptCatalog {
  agentId: number;
  title: string;
  subtitle: string;
  totalPrompts: number;
  prompts: PromptCatalogItem[];
}

export interface SharedPrompt {
  title: string;
  createdBy: string;
  createdBySoeid: string;
  audience: string;
  platform: "stylus" | "copilot";
  prompt: string;
  description: string;
  attachments?: string;
}

export interface StoredComment {
  id: string;
  author: string;
  role: string;
  text: string;
  timeAgo: string;
  agentId: number;
  promptId: number;
}
