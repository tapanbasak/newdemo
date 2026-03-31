import { StoredComment } from "@/lib/types";

type Upvote = {
  agentId: number;
  promptId: number;
  userId: string;
  title?: string;
  description?: string;
  author?: string;
};

type SharedPromptDoc = {
  title: string;
  createdBy: string;
  createdBySoeid: string;
  audience: string;
  prompt: string;
  description: string;
  attachments?: string;
};

const memory = {
  upvotes: [] as Upvote[],
  comments: [] as StoredComment[],
  sharedPrompts: [] as SharedPromptDoc[],
};

export const memoryStore = memory;
