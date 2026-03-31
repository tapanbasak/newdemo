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
  return res.json();
}

export async function getMyUpvotes() {
  const userId = getUserId();
  const res = await fetch(`/api/upvotes/mine?userId=${encodeURIComponent(userId)}`);
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
  return (await res.json()) as Record<string, number>;
}

export async function sharePrompt(payload: SharedPrompt) {
  const res = await fetch("/api/shared-prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchSharedPrompts() {
  const res = await fetch("/api/shared-prompts");
  return (await res.json()) as SharedPrompt[];
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
