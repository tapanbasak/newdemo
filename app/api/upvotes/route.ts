import { getDb, hasMongo } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    agentId: number;
    promptId: number;
    userId: string;
    title?: string;
    description?: string;
    author?: string;
  };
  if (!body.agentId || !body.promptId || !body.userId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }

  const db = await getDb();
  const exists = await db!.collection("upvotes").findOne({
    agentId: body.agentId,
    promptId: body.promptId,
    userId: body.userId,
  });
  if (exists) return NextResponse.json({ ok: true, alreadyUpvoted: true });
  await db!.collection("upvotes").insertOne({ ...body, createdAt: new Date() });
  return NextResponse.json({ ok: true, alreadyUpvoted: false });
}
