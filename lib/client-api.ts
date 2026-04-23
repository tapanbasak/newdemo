"use client";

import { SharedPrompt, StoredComment } from "@/lib/types";

export function getUserId() {
  const key = "pcu_user_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function upvotePrompt(input: {
  agentId: number;
  promptId: number;
  title?: string;
  description?: string;
  author?: string;
}) {
  const userId = getUserId();
  const res = await fetch("/api/upvotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to upvote right now.");
  }
  return res.json();
}

export async function getMyUpvotes() {
  const userId = getUserId();
  const res = await fetch(`/api/upvotes/mine?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to load your upvotes.");
  }
  return (await res.json()) as Array<{
    agentId: number;
    promptId: number;
    title?: string;
    description?: string;
    author?: string;
  }>;
}

export async function getUpvoteCounts() {
  const res = await fetch("/api/upvotes/counts");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to load upvote counts.");
  }
  return (await res.json()) as Record<string, number>;
}

export async function sharePrompt(payload: SharedPrompt) {
  const res = await fetch("/api/shared-prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to share prompt right now.");
  }
  return res.json();
}

export async function fetchSharedPrompts() {
  const res = await fetch("/api/shared-prompts");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to load shared prompts.");
  }
  return (await res.json()) as SharedPrompt[];
}

export type ManagedSharedPrompt = SharedPrompt & { id: string; createdAt?: string; updatedAt?: string };

export async function fetchMySharedPrompts(soeid: string) {
  const res = await fetch(
    `/api/shared-prompts?mine=1&soeid=${encodeURIComponent(String(soeid).trim().toLowerCase())}`
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to load your prompts.");
  }
  return (await res.json()) as ManagedSharedPrompt[];
}

export async function fetchMySharedPromptById(id: string, soeid: string) {
  const res = await fetch(
    `/api/shared-prompts/${encodeURIComponent(id)}?soeid=${encodeURIComponent(String(soeid).trim().toLowerCase())}`
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to load your prompt.");
  }
  return (await res.json()) as ManagedSharedPrompt;
}

export async function updateMySharedPrompt(
  id: string,
  soeid: string,
  payload: Partial<
    Pick<
      SharedPrompt,
      | "title"
      | "prompt"
      | "description"
      | "attachments"
      | "estimatedTimeSaveMinutes"
      | "platform"
      | "role"
      | "roleTags"
      | "customRoleLabel"
    >
  >
) {
  const res = await fetch(`/api/shared-prompts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, soeid: String(soeid).trim().toLowerCase() }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to update your prompt.");
  }
  return res.json();
}

export async function deleteMySharedPrompt(id: string, soeid: string) {
  const res = await fetch(
    `/api/shared-prompts/${encodeURIComponent(id)}?soeid=${encodeURIComponent(String(soeid).trim().toLowerCase())}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to delete your prompt.");
  }
  return res.json();
}

export async function fetchComments(agentId: number, promptId: number) {
  const res = await fetch(`/api/comments?agentId=${agentId}&promptId=${promptId}`);
  return (await res.json()) as StoredComment[];
}

export async function addComment(payload: Omit<StoredComment, "id" | "timeAgo" | "role">) {
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as StoredComment;
}

export async function trackActivity(payload: {
  action: "learn_more" | "run_prompt";
  agentId: number;
  promptId?: number;
}) {
  const userId = getUserId();
  const res = await fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...payload }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Unable to track activity.");
  }
  return res.json();
}
