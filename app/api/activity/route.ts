import { getDb, hasMongo } from "@/lib/db";
import { NextResponse } from "next/server";

type ActivityAction = "learn_more" | "run_prompt";

export async function POST(req: Request) {
  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }

  const body = (await req.json()) as {
    userId?: string;
    action?: ActivityAction;
    agentId?: number;
    promptId?: number;
  };

  if (!body.userId || !body.action || !body.agentId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["learn_more", "run_prompt"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const db = await getDb();
  await db!.collection("activity_events").insertOne({
    userId: String(body.userId),
    action: body.action,
    agentId: Number(body.agentId),
    promptId: body.promptId ? Number(body.promptId) : null,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
