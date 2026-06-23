import type { Db } from "mongodb";

type ActionWeightConfig = {
  run_prompt: number;
  copy_to_clipboard: number;
  learn_more: number;
};

export type GamificationAuthorRow = {
  rank: number;
  soeid: string;
  name: string;
  role: string;
  promptsShared: number;
  certifiedPrompts: number;
  totalUpvotes: number;
  timeSavedMinutes: number;
  timeSavedHours: string;
  score: number;
};

export type GamificationPayload = {
  generatedAt: string;
  actionWeights: ActionWeightConfig;
  totals: {
    totalUsers: number;
    totalPrompts: number;
    certifiedPrompts: number;
    totalUpvotes: number;
    timeSavedMinutes: number;
    timeSavedHours: string;
  };
  topCards: GamificationAuthorRow[];
  leaderboard: GamificationAuthorRow[];
};

function toNumber(input: unknown): number {
  const n = Number(input);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSoeid(input: unknown): string {
  return String(input ?? "").trim().toLowerCase();
}

function displayName(input: unknown, fallback: string): string {
  const value = String(input ?? "").trim();
  if (value) return value;
  return fallback || "Unknown";
}

/** Turn a role tag like "software-engineer" into a label like "Software Engineer". */
function roleLabelFromTag(tag: unknown): string {
  return String(tag ?? "")
    .trim()
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function ensureGamificationIndexes(db: Db) {
  await db.collection("activity_events").createIndex({ promptId: 1, action: 1, createdAt: -1 });
  await db.collection("activity_events").createIndex({ agentId: 1, promptId: 1, action: 1, createdAt: -1 });
  await db.collection("activity_events").createIndex({ userId: 1, action: 1, createdAt: -1 });
  await db.collection("upvotes").createIndex({ agentId: 1, promptId: 1, userId: 1 });
  await db.collection("prompts").createIndex({ createdBySoeid: 1, agentId: 1, promptId: 1 });
  await db.collection("shared_prompts").createIndex({ createdBySoeid: 1, createdAt: -1 });
}

export async function buildGamificationPayload(
  db: Db,
  actionWeights: Partial<ActionWeightConfig> = {}
): Promise<GamificationPayload> {
  const weights: ActionWeightConfig = {
    run_prompt: actionWeights.run_prompt ?? 1,
    copy_to_clipboard: actionWeights.copy_to_clipboard ?? 1,
    // Agent-card click; excluded from default prompt time-saved calculation.
    learn_more: actionWeights.learn_more ?? 0,
  };

  const [sharedPrompts, prompts, upvotes, events] = await Promise.all([
    db
      .collection("shared_prompts")
      .find({}, { projection: { _id: 0, createdBySoeid: 1, createdBy: 1, role: 1, roleTags: 1 } })
      .toArray(),
    db
      .collection("prompts")
      .find(
        {},
        {
          projection: {
            _id: 0,
            agentId: 1,
            promptId: 1,
            title: 1,
            author: 1,
            createdBySoeid: 1,
            certified: 1,
            estimatedTimeSaveMinutes: 1,
          },
        }
      )
      .toArray(),
    db
      .collection("upvotes")
      .find({}, { projection: { _id: 0, agentId: 1, promptId: 1 } })
      .toArray(),
    db
      .collection("activity_events")
      .find(
        { action: { $in: ["run_prompt", "copy_to_clipboard", "learn_more"] } },
        { projection: { _id: 0, agentId: 1, promptId: 1, action: 1 } }
      )
      .toArray(),
  ]);

  const authorsBySoeid = new Map<string, { name: string }>();
  for (const row of sharedPrompts) {
    const soeid = normalizeSoeid((row as Record<string, unknown>).createdBySoeid);
    if (!soeid) continue;
    const name = displayName((row as Record<string, unknown>).createdBy, soeid);
    if (!authorsBySoeid.has(soeid)) authorsBySoeid.set(soeid, { name });
  }

  const promptKeyToAuthor = new Map<string, string>();
  const promptKeyToEstimatedMinutes = new Map<string, number>();
  const promptKeyToCertified = new Map<string, boolean>();
  for (const row of prompts) {
    const record = row as Record<string, unknown>;
    const key = `${toNumber(record.agentId)}_${toNumber(record.promptId)}`;
    const authorSoeid = normalizeSoeid(record.createdBySoeid);
    if (!authorSoeid) continue;
    promptKeyToAuthor.set(key, authorSoeid);
    promptKeyToEstimatedMinutes.set(key, toNumber(record.estimatedTimeSaveMinutes));
    promptKeyToCertified.set(key, Boolean(record.certified));
    if (!authorsBySoeid.has(authorSoeid)) {
      const name = displayName(record.author, authorSoeid);
      authorsBySoeid.set(authorSoeid, { name });
    }
  }

  const promptsSharedByAuthor = new Map<string, number>();
  // Tally role tags per author so the card subtitle reflects their most common role.
  const roleTagCountsByAuthor = new Map<string, Map<string, number>>();
  for (const row of sharedPrompts) {
    const record = row as Record<string, unknown>;
    const soeid = normalizeSoeid(record.createdBySoeid);
    if (!soeid) continue;
    promptsSharedByAuthor.set(soeid, (promptsSharedByAuthor.get(soeid) ?? 0) + 1);

    const tags = Array.isArray(record.roleTags) && record.roleTags.length
      ? (record.roleTags as unknown[])
      : [record.role];
    const counts = roleTagCountsByAuthor.get(soeid) ?? new Map<string, number>();
    for (const rawTag of tags) {
      const tag = String(rawTag ?? "").trim().toLowerCase();
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    roleTagCountsByAuthor.set(soeid, counts);
  }

  function roleForAuthor(soeid: string): string {
    const counts = roleTagCountsByAuthor.get(soeid);
    if (!counts || counts.size === 0) return "Contributor";
    let topTag = "";
    let topCount = -1;
    for (const [tag, count] of counts.entries()) {
      if (count > topCount || (count === topCount && tag.localeCompare(topTag) < 0)) {
        topTag = tag;
        topCount = count;
      }
    }
    return roleLabelFromTag(topTag) || "Contributor";
  }

  const certifiedByAuthor = new Map<string, number>();
  for (const [key, certified] of promptKeyToCertified.entries()) {
    if (!certified) continue;
    const authorSoeid = promptKeyToAuthor.get(key);
    if (!authorSoeid) continue;
    certifiedByAuthor.set(authorSoeid, (certifiedByAuthor.get(authorSoeid) ?? 0) + 1);
  }

  const upvotesByAuthor = new Map<string, number>();
  for (const row of upvotes) {
    const record = row as Record<string, unknown>;
    const key = `${toNumber(record.agentId)}_${toNumber(record.promptId)}`;
    const authorSoeid = promptKeyToAuthor.get(key);
    if (!authorSoeid) continue;
    upvotesByAuthor.set(authorSoeid, (upvotesByAuthor.get(authorSoeid) ?? 0) + 1);
  }

  const weightedEventCountByPromptKey = new Map<string, number>();
  for (const row of events) {
    const record = row as Record<string, unknown>;
    const agentId = toNumber(record.agentId);
    const promptId = toNumber(record.promptId);
    if (!agentId || !promptId) continue;
    const action = String(record.action ?? "");
    const weight = action === "run_prompt" ? weights.run_prompt : action === "copy_to_clipboard" ? weights.copy_to_clipboard : action === "learn_more" ? weights.learn_more : 0;
    if (!weight) continue;
    const key = `${agentId}_${promptId}`;
    weightedEventCountByPromptKey.set(key, (weightedEventCountByPromptKey.get(key) ?? 0) + weight);
  }

  const timeSavedByAuthor = new Map<string, number>();
  for (const [promptKey, weightedCount] of weightedEventCountByPromptKey.entries()) {
    const authorSoeid = promptKeyToAuthor.get(promptKey);
    if (!authorSoeid) continue;
    const estimated = promptKeyToEstimatedMinutes.get(promptKey) ?? 0;
    const minutes = estimated * weightedCount;
    if (!minutes) continue;
    timeSavedByAuthor.set(authorSoeid, (timeSavedByAuthor.get(authorSoeid) ?? 0) + minutes);
  }

  const authorRows: GamificationAuthorRow[] = Array.from(authorsBySoeid.entries()).map(([soeid, meta]) => {
    const promptsShared = promptsSharedByAuthor.get(soeid) ?? 0;
    const certifiedPrompts = certifiedByAuthor.get(soeid) ?? 0;
    const totalUpvotes = upvotesByAuthor.get(soeid) ?? 0;
    const timeSavedMinutes = Number((timeSavedByAuthor.get(soeid) ?? 0).toFixed(2));
    const score = Number((promptsShared * 2 + certifiedPrompts * 3 + totalUpvotes + timeSavedMinutes / 60).toFixed(2));
    return {
      rank: 0,
      soeid,
      name: meta.name,
      role: roleForAuthor(soeid),
      promptsShared,
      certifiedPrompts,
      totalUpvotes,
      timeSavedMinutes,
      timeSavedHours: `${(timeSavedMinutes / 60).toFixed(1)}h`,
      score,
    };
  });

  authorRows.sort(
    (a, b) =>
      b.score - a.score ||
      b.timeSavedMinutes - a.timeSavedMinutes ||
      b.totalUpvotes - a.totalUpvotes ||
      b.promptsShared - a.promptsShared ||
      a.name.localeCompare(b.name)
  );
  authorRows.forEach((row, idx) => {
    row.rank = idx + 1;
  });

  // Use shared_prompts for unique prompt count. `prompts` can have one
  // logical prompt duplicated across multiple agent catalogs.
  const totalPrompts = sharedPrompts.length;
  const certifiedPrompts = Array.from(promptKeyToCertified.values()).filter(Boolean).length;
  const totalUpvotes = upvotes.length;
  const timeSavedMinutes = Number(authorRows.reduce((sum, row) => sum + row.timeSavedMinutes, 0).toFixed(2));
  const totals = {
    totalUsers: authorRows.length,
    totalPrompts,
    certifiedPrompts,
    totalUpvotes,
    timeSavedMinutes,
    timeSavedHours: `${(timeSavedMinutes / 60).toFixed(1)}h`,
  };

  return {
    generatedAt: new Date().toISOString(),
    actionWeights: weights,
    totals,
    topCards: authorRows.slice(0, 3),
    leaderboard: authorRows,
  };
}
