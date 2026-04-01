import { getDb, hasMongo } from "@/lib/db";
import { AGENTS } from "@/lib/data";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await ctx.params;
  const agentIdNum = Number(agentId);
  if (!Number.isFinite(agentIdNum)) {
    return NextResponse.json({ error: "Invalid agentId" }, { status: 400 });
  }

  if (!hasMongo()) {
    const agent = AGENTS.find((a) => a.id === agentIdNum);
    return NextResponse.json({
      agentId: agentIdNum,
      title: `${agent?.name ?? "Agent"} Prompt Catalog`,
      subtitle: "",
      totalPrompts: 0,
      prompts: [],
    });
  }

  const db = await getDb();
  const [promptRows, upvoteRows, agent] = await Promise.all([
    db!.collection("prompts").find({ agentId: agentIdNum }).sort({ promptId: 1 }).toArray(),
    db!
      .collection("upvotes")
      .find({ agentId: agentIdNum }, { projection: { _id: 0, promptId: 1 } })
      .toArray(),
    db!.collection("agents").findOne({ agentId: agentIdNum }),
  ]);

  const upvoteCounts: Record<number, number> = {};
  for (const row of upvoteRows) {
    const promptId = Number(row.promptId);
    if (!Number.isFinite(promptId)) continue;
    upvoteCounts[promptId] = (upvoteCounts[promptId] ?? 0) + 1;
  }

  const prompts = promptRows.map((p) => {
    const pid = Number(p.promptId);
    return {
      id: pid,
      title: String(p.title ?? ""),
      prompt: String(p.prompt ?? ""),
      description: String(p.description ?? ""),
      certified: Boolean(p.certified),
      upvotes: Number(p.upvotes ?? 0) + (upvoteCounts[pid] ?? 0),
      author: String(p.author ?? ""),
      timesSaved: p.timesSaved ? String(p.timesSaved) : undefined,
      tip: p.tip ? String(p.tip) : undefined,
      lastUpdated: p.lastUpdated ? String(p.lastUpdated) : undefined,
    };
  });

  const title =
    promptRows[0]?.catalogTitle ??
    `${String(agent?.name ?? "Agent")} Prompt Catalog`;
  const subtitle = String(promptRows[0]?.catalogSubtitle ?? "");

  return NextResponse.json({
    agentId: agentIdNum,
    title,
    subtitle,
    totalPrompts: prompts.length,
    prompts,
  });
}
