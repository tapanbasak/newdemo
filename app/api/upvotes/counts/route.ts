import { getDb, hasMongo } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const counts: Record<string, number> = {};

  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }

  const db = await getDb();
  const rows = await db!
    .collection("upvotes")
    .aggregate([
      { $group: { _id: { agentId: "$agentId", promptId: "$promptId" }, count: { $sum: 1 } } },
    ])
    .toArray();
  for (const row of rows) {
    const key = `${row._id.agentId}_${row._id.promptId}`;
    counts[key] = Number(row.count ?? 0);
  }
  return NextResponse.json(counts);
}
