import { getDb, hasMongo } from "@/lib/db";
import { NextResponse } from "next/server";

function normalizeIdentity(input: unknown) {
  return String(input ?? "").trim().toLowerCase();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = normalizeIdentity(searchParams.get("userId"));
  if (!userId) return NextResponse.json([]);

  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }

  const db = await getDb();
  const escaped = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = await db!
    .collection("upvotes")
    .find({ userId: { $regex: `^${escaped}$`, $options: "i" } }, { projection: { _id: 0 } })
    .toArray();

  const pairs = rows
    .map((r) => ({ agentId: Number(r.agentId), promptId: Number(r.promptId) }))
    .filter((p) => Number.isFinite(p.agentId) && Number.isFinite(p.promptId));
  const seen = new Set<string>();
  const orFilter = pairs.filter((p) => {
    const key = `${p.agentId}_${p.promptId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let platformByKey = new Map<string, string | undefined>();
  if (orFilter.length > 0) {
    const promptDocs = await db!
      .collection("prompts")
      .find({ $or: orFilter }, { projection: { _id: 0, agentId: 1, promptId: 1, platform: 1 } })
      .toArray();
    platformByKey = new Map(
      promptDocs.map((d) => [`${Number(d.agentId)}_${Number(d.promptId)}`, d.platform != null ? String(d.platform) : undefined])
    );
  }

  const enriched = rows.map((row) => {
    const agentId = Number(row.agentId);
    const promptId = Number(row.promptId);
    const key = `${agentId}_${promptId}`;
    const fromPrompt = platformByKey.get(key);
    const platform = fromPrompt ?? (row as { platform?: string }).platform;
    return { ...row, platform };
  });

  return NextResponse.json(enriched);
}
