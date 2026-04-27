import { getDb, hasMongo } from "@/lib/db";
import { NextResponse } from "next/server";

function normalizeIdentity(input: unknown) {
  return String(input ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    agentId: number;
    promptId: number;
    userId: string;
    title?: string;
    description?: string;
    author?: string;
  };
  const normalizedUserId = normalizeIdentity(body.userId);
  if (!body.agentId || !body.promptId || !normalizedUserId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }

  const db = await getDb();
  const exists = await db!.collection("upvotes").findOne({
    agentId: body.agentId,
    promptId: body.promptId,
    userId: normalizedUserId,
  });
  if (exists) return NextResponse.json({ ok: true, alreadyUpvoted: true });
  await db!.collection("upvotes").insertOne({ ...body, userId: normalizedUserId, createdAt: new Date() });
  return NextResponse.json({ ok: true, alreadyUpvoted: false });
}
