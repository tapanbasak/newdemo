import { getDb, hasMongo } from "@/lib/db";
import { memoryStore } from "@/lib/store";
import { StoredComment } from "@/lib/types";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = Number(searchParams.get("agentId"));
  const promptId = Number(searchParams.get("promptId"));

  if (!agentId || !promptId) return NextResponse.json([]);

  if (hasMongo()) {
    const db = await getDb();
    const rows = await db!
      .collection<StoredComment>("comments")
      .find({ agentId, promptId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json(rows);
  }

  return NextResponse.json(
    memoryStore.comments.filter((c) => c.agentId === agentId && c.promptId === promptId)
  );
}

export async function POST(req: Request) {
  const body = (await req.json()) as Omit<StoredComment, "id" | "timeAgo" | "role">;
  if (!body.text || !body.agentId || !body.promptId || !body.author) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const comment: StoredComment = {
    ...body,
    id: uuidv4(),
    role: "USER",
    timeAgo: "Just now",
  };

  if (hasMongo()) {
    const db = await getDb();
    await db!.collection("comments").insertOne({ ...comment, createdAt: new Date() });
  } else {
    memoryStore.comments.unshift(comment);
  }
  return NextResponse.json(comment);
}
