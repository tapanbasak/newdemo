import { getDb, hasMongo } from "@/lib/db";
import { buildGamificationPayload, ensureGamificationIndexes } from "@/lib/gamification";
import { NextResponse } from "next/server";

function parseWeight(raw: string | null, fallback: number) {
  if (raw == null || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export async function GET(req: Request) {
  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }
  const db = await getDb();
  const url = new URL(req.url);
  const payload = await buildGamificationPayload(db!, {
    run_prompt: parseWeight(url.searchParams.get("runPromptWeight"), 1),
    copy_to_clipboard: parseWeight(url.searchParams.get("copyWeight"), 1),
    learn_more: parseWeight(url.searchParams.get("learnMoreWeight"), 0),
  });
  await ensureGamificationIndexes(db!);
  return NextResponse.json(payload);
}
