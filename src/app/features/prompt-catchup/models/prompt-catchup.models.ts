export interface ScoreboardRow {
  ranking: number;
  name: string;
  value: number;
}

export interface ScoreboardCardData {
  title: string;
  columns: [string, string, string];
  rows: ScoreboardRow[];
  footnote?: string;
}

export interface Group {
  name: string;
  count: number;
  slug: string;
}

export type AgentStatus = 'ADOPT' | 'UNDER_EVALUATION';

export interface Agent {
  id: number;
  name: string;
  description: string;
  status: AgentStatus;
  promptCount: number;
  updatedDate?: string;
  category: string;
}

export interface SidebarLink {
  label: string;
  icon?: string;
  route?: any[];
}

export type RecommendStatus = 'all' | 'adopt' | 'under_evaluation';

export type SortBy = 'most_prompts' | 'newest' | 'alphabetical';

export interface PromptCatalogItem {
  id: number;
  title: string;
  description: string;
  certified: boolean;
  upvotes: number;
  author: string;
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
  prompt: string;
  description: string;
  attachments?: string;
}
