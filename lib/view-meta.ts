export type ViewMode = "for_my_role" | "most_used" | "all_agents";
export type UserRole =
  | "developer"
  | "release-manager"
  | "incident-manager"
  | "quality-engineer"
  | "business-analyst";

export const CURRENT_USER_ROLE: UserRole = "developer";

export const AGENT_VIEW_META: Record<number, { roleTags: UserRole[]; usageCount: number }> = {
  1: { roleTags: ["developer", "release-manager"], usageCount: 250 },
  3: { roleTags: ["developer", "incident-manager"], usageCount: 190 },
  4: { roleTags: ["developer"], usageCount: 140 },
  5: { roleTags: ["developer", "release-manager"], usageCount: 310 },
  7: { roleTags: ["developer", "quality-engineer"], usageCount: 170 },
  8: { roleTags: ["developer"], usageCount: 130 },
  9: { roleTags: ["developer"], usageCount: 120 },
  10: { roleTags: ["developer"], usageCount: 95 },
  11: { roleTags: ["developer"], usageCount: 340 },
  12: { roleTags: ["developer"], usageCount: 300 },
  19: { roleTags: ["developer"], usageCount: 280 },
  20: { roleTags: ["developer", "business-analyst"], usageCount: 360 },
  21: { roleTags: ["incident-manager"], usageCount: 260 },
  22: { roleTags: ["release-manager"], usageCount: 220 },
  24: { roleTags: ["quality-engineer"], usageCount: 180 },
  25: { roleTags: ["developer"], usageCount: 330 },
  26: { roleTags: ["business-analyst"], usageCount: 210 },
};
