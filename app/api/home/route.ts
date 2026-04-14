import { getDb, hasMongo } from "@/lib/db";
import { AGENTS, GROUPS, SCOREBOARD_DATA, SIDEBAR_LINKS } from "@/lib/data";
import { buildDynamicScoreboards } from "@/lib/home-scoreboards";
import { NextResponse } from "next/server";

export async function GET() {
  if (!hasMongo()) {
    return NextResponse.json({
      agents: AGENTS,
      groups: GROUPS,
      scoreboards: SCOREBOARD_DATA,
      sidebarLinks: SIDEBAR_LINKS,
      promptTextsByAgent: {},
      promptRolesByAgent: {},
    });
  }

  const db = await getDb();
  const [agentsRaw, groupsRaw, promptsRaw, activityAgg, scoreboards] = await Promise.all([
    db!.collection("agents").find({}).toArray(),
    db!.collection("groups").find({}).sort({ sortOrder: 1 }).toArray(),
    db!
      .collection("prompts")
      .find(
        {},
        { projection: { _id: 0, agentId: 1, prompt: 1, description: 1, role: 1, roleTags: 1 } }
      )
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
    buildDynamicScoreboards(db!),
  ]);

  const usageByAgent: Record<number, number> = {};
  for (const row of activityAgg) {
    const id = Number(row._id);
    if (!Number.isFinite(id)) continue;
    usageByAgent[id] = Number(row.usageCount ?? 0);
  }

  const promptCountsByAgent: Record<number, number> = {};
  const promptTextsByAgent: Record<number, string[]> = {};
  const promptRolesByAgent: Record<number, Array<{ role?: string; roleTags?: string[] }>> = {};
  for (const row of promptsRaw) {
    const id = Number(row.agentId);
    if (!Number.isFinite(id)) continue;
    promptCountsByAgent[id] = (promptCountsByAgent[id] ?? 0) + 1;
    if (!promptTextsByAgent[id]) promptTextsByAgent[id] = [];
    if (row.prompt) promptTextsByAgent[id].push(String(row.prompt));
    if (row.description) promptTextsByAgent[id].push(String(row.description));

    const role = row.role != null && String(row.role).trim() !== "" ? String(row.role) : undefined;
    const roleTags = Array.isArray(row.roleTags)
      ? row.roleTags.map((t: unknown) => String(t)).filter(Boolean)
      : undefined;
    if (role || (roleTags && roleTags.length > 0)) {
      if (!promptRolesByAgent[id]) promptRolesByAgent[id] = [];
      promptRolesByAgent[id].push({ role, roleTags });
    }
  }

  const agents = agentsRaw.map((a) => ({
    id: Number(a.agentId),
    name: String(a.name ?? ""),
    description: String(a.description ?? ""),
    status: a.status === "UNDER_EVALUATION" ? "UNDER_EVALUATION" : "ADOPT",
    promptCount: promptCountsByAgent[Number(a.agentId)] ?? 0,
    updatedDate: a.updatedDate ? String(a.updatedDate) : undefined,
    category: String(a.category ?? ""),
    roleTags: Array.isArray(a.roleTags) ? a.roleTags : [],
    usageCount: usageByAgent[Number(a.agentId)] ?? 0,
  }));

  const groups = groupsRaw.map((g) => {
    const slug = String(g.slug ?? "");
    const countFromAgents =
      slug === "my-upvotes"
        ? Number(g.seedCount ?? 0)
        : agentsRaw.filter((a) => String(a.category ?? "") === slug).length;
    return {
      name: String(g.name ?? ""),
      slug,
      count: countFromAgents,
    };
  });

  return NextResponse.json({
    agents,
    groups,
    scoreboards,
    sidebarLinks: SIDEBAR_LINKS,
    promptTextsByAgent,
    promptRolesByAgent,
  });
}
