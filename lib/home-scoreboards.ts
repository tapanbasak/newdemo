import type { Db } from "mongodb";

export type ScoreboardRow = { ranking: string; name: string; value: string };

export type HomeScoreboard = {
  title: string;
  columns: string[];
  rows: ScoreboardRow[];
  footnote?: string;
};

function toRows(items: Array<{ name: string; value: number }>): ScoreboardRow[] {
  return items.map((item, i) => ({
    ranking: String(i + 1),
    name: item.name,
    value: String(item.value),
  }));
}

/** Upvote tallies per agentId_promptId from the upvotes collection. */
export async function loadUpvoteTalliesByPrompt(db: Db): Promise<Record<string, number>> {
  const rows = await db
    .collection("upvotes")
    .aggregate<{ _id: { agentId: number; promptId: number }; count: number }>([
      { $group: { _id: { agentId: "$agentId", promptId: "$promptId" }, count: { $sum: 1 } } },
    ])
    .toArray();
  const map: Record<string, number> = {};
  for (const row of rows) {
    const aid = Number(row._id?.agentId);
    const pid = Number(row._id?.promptId);
    if (!Number.isFinite(aid) || !Number.isFinite(pid)) continue;
    map[`${aid}_${pid}`] = Number(row.count ?? 0);
  }
  return map;
}

function effectiveUpvotes(
  agentId: number,
  promptId: number,
  baseUpvotes: number,
  tallyMap: Record<string, number>
): number {
  const key = `${agentId}_${promptId}`;
  return Number(baseUpvotes ?? 0) + (tallyMap[key] ?? 0);
}

/** Prompt Engineering Champions — one count per document in shared_prompts (one per share submission). */
export async function buildChampionsScoreboard(db: Db): Promise<HomeScoreboard> {
  const agg = await db
    .collection("shared_prompts")
    .aggregate<{ _id: string; count: number }>([
      {
        $match: {
          createdBy: { $exists: true, $nin: ["", null] },
        },
      },
      { $group: { _id: "$createdBy", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])
    .toArray();

  const items = agg.map((row) => ({ name: String(row._id), value: row.count }));
  return {
    title: "Prompt Engineering Champions",
    columns: ["Ranking", "Name", "Prompts Shared"],
    rows: toRows(items),
  };
}

/** Top-voted prompts — max effective upvotes (seed base + upvotes collection), global. */
export async function buildTopVotedScoreboard(
  db: Db,
  tallyMap: Record<string, number>
): Promise<HomeScoreboard> {
  const promptDocs = await db
    .collection("prompts")
    .find({}, { projection: { _id: 0, agentId: 1, promptId: 1, title: 1, upvotes: 1 } })
    .toArray();

  const scored = promptDocs
    .map((p) => {
      const agentId = Number(p.agentId);
      const promptId = Number(p.promptId);
      if (!Number.isFinite(agentId) || !Number.isFinite(promptId)) return null;
      const title = String(p.title ?? "").trim() || "Untitled";
      const v = effectiveUpvotes(agentId, promptId, Number(p.upvotes ?? 0), tallyMap);
      return { title, value: v, agentId, promptId };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  scored.sort((a, b) => b.value - a.value || a.title.localeCompare(b.title));

  const seen = new Set<string>();
  const top: Array<{ name: string; value: number }> = [];
  for (const row of scored) {
    const key = `${row.agentId}_${row.promptId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    top.push({ name: row.title, value: row.value });
    if (top.length >= 5) break;
  }

  return {
    title: "Top-voted Prompts",
    columns: ["Ranking", "Name", "#'s Upvotes"],
    rows: toRows(top),
  };
}

const RECENT_BATCH_WINDOW_MS = 3 * 60 * 1000;

/** Recent shares — last 5 shared_prompts; upvotes = sum of effective votes across prompt rows from the same submission batch. */
export async function buildRecentSharedScoreboard(
  db: Db,
  tallyMap: Record<string, number>
): Promise<HomeScoreboard> {
  const recent = await db
    .collection("shared_prompts")
    .find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  const items: Array<{ name: string; value: number }> = [];

  for (const share of recent) {
    const title = String(share.title ?? "").trim() || "Untitled";
    const author = String(share.createdBy ?? "").trim();
    const createdAt = share.createdAt instanceof Date ? share.createdAt : new Date(String(share.createdAt ?? 0));

    const windowStart = new Date(createdAt.getTime() - 2000);
    const windowEnd = new Date(createdAt.getTime() + RECENT_BATCH_WINDOW_MS);

    const batch = await db
      .collection("prompts")
      .find(
        {
          source: "share",
          title,
          author,
          createdAt: { $gte: windowStart, $lte: windowEnd },
        },
        { projection: { _id: 0, agentId: 1, promptId: 1, upvotes: 1 } }
      )
      .toArray();

    let sum = 0;
    for (const p of batch) {
      const agentId = Number(p.agentId);
      const promptId = Number(p.promptId);
      if (!Number.isFinite(agentId) || !Number.isFinite(promptId)) continue;
      sum += effectiveUpvotes(agentId, promptId, Number(p.upvotes ?? 0), tallyMap);
    }

    items.push({ name: title, value: sum });
  }

  return {
    title: "Recent Shared Prompts",
    columns: ["Ranking", "Name", "#'s Upvotes"],
    rows: toRows(items),
    footnote: "Based on latest share activity in the database.",
  };
}

/** Same order as `SCOREBOARD_DATA` in lib/data.ts for consistent layout. */
export async function buildDynamicScoreboards(db: Db): Promise<HomeScoreboard[]> {
  const [tallyMap, champions] = await Promise.all([loadUpvoteTalliesByPrompt(db), buildChampionsScoreboard(db)]);
  const [topVoted, recent] = await Promise.all([
    buildTopVotedScoreboard(db, tallyMap),
    buildRecentSharedScoreboard(db, tallyMap),
  ]);
  /** Match prior UI order (Mongo `scoreboards` key sort: champions → recent → top). */
  return [champions, recent, topVoted];
}
