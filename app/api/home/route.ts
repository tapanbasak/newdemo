import { getDb, hasMongo } from "@/lib/db";
import { AGENTS, GROUPS, SCOREBOARD_DATA, SIDEBAR_LINKS } from "@/lib/data";
import { NextResponse } from "next/server";

export async function GET() {
  if (!hasMongo()) {
    return NextResponse.json({
      agents: AGENTS,
      groups: GROUPS,
      scoreboards: SCOREBOARD_DATA,
      sidebarLinks: SIDEBAR_LINKS,
      promptTextsByAgent: {},
    });
  }

  const db = await getDb();
  const [agentsRaw, groupsRaw, scoreboardsRaw, promptsRaw, activityAgg] = await Promise.all([
    db!.collection("agents").find({}).toArray(),
    db!.collection("groups").find({}).sort({ sortOrder: 1 }).toArray(),
    db!.collection("scoreboards").find({}).sort({ key: 1 }).toArray(),
    db!
      .collection("prompts")
      .find({}, { projection: { _id: 0, agentId: 1, prompt: 1, description: 1 } })
      .toArray(),
    db!
      .collection("activity_events")
      .aggregate([
        {
          $group: {
            _id: "$agentId",
            usageCount: {
              $sum: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$action", "learn_more"] }, then: 1 },
                    { case: { $eq: ["$action", "run_prompt"] }, then: 3 },
                  ],
                  default: 0,
                },
              },
            },
          },
        },
      ])
      .toArray(),
  ]);

  const usageByAgent: Record<number, number> = {};
  for (const row of activityAgg) {
    const id = Number(row._id);
    if (!Number.isFinite(id)) continue;
    usageByAgent[id] = Number(row.usageCount ?? 0);
  }

  const promptCountsByAgent: Record<number, number> = {};
  const promptTextsByAgent: Record<number, string[]> = {};
  for (const row of promptsRaw) {
    const id = Number(row.agentId);
    if (!Number.isFinite(id)) continue;
    promptCountsByAgent[id] = (promptCountsByAgent[id] ?? 0) + 1;
    if (!promptTextsByAgent[id]) promptTextsByAgent[id] = [];
    if (row.prompt) promptTextsByAgent[id].push(String(row.prompt));
    if (row.description) promptTextsByAgent[id].push(String(row.description));
  }

  const agents = agentsRaw.map((a) => ({
    id: Number(a.agentId),
    name: String(a.name ?? ""),
    description: String(a.description ?? ""),
    status: a.status === "UNDER_EVALUATION" ? "UNDER_EVALUATION" : "ADOPT",
    promptCount: promptCountsByAgent[Number(a.agentId)] ?? Number(a.promptCount ?? 0),
    updatedDate: a.updatedDate ? String(a.updatedDate) : undefined,
    category: String(a.category ?? ""),
    roleTags: Array.isArray(a.roleTags) ? a.roleTags : [],
    usageCount: usageByAgent[Number(a.agentId)] ?? 0,
  }));

  const groups = groupsRaw.map((g) => ({
    name: String(g.name ?? ""),
    slug: String(g.slug ?? ""),
    count: Number(g.seedCount ?? 0),
  }));

  const scoreboards = scoreboardsRaw.map((s) => ({
    title: String(s.title ?? ""),
    columns: Array.isArray(s.columns) ? s.columns : [],
    rows: Array.isArray(s.rows) ? s.rows : [],
    footnote: s.footnote ? String(s.footnote) : undefined,
  }));

  return NextResponse.json({
    agents,
    groups,
    scoreboards,
    sidebarLinks: SIDEBAR_LINKS,
    promptTextsByAgent,
  });
}
