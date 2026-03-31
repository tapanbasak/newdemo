import { getDb, hasMongo } from "@/lib/db";
import { memoryStore } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET() {
  const counts: Record<string, number> = {};

  if (hasMongo()) {
    const db = await getDb();
    const rows = await db!.collection("upvotes").find({}, { projection: { _id: 0 } }).toArray();
    for (const row of rows) {
      const key = `${row.agentId}_${row.promptId}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return NextResponse.json(counts);
  }

  for (const row of memoryStore.upvotes) {
    const key = `${row.agentId}_${row.promptId}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return NextResponse.json(counts);
}
