import { getDb, hasMongo } from "@/lib/db";
import { NextResponse } from "next/server";

type ActivityAction = "learn_more" | "run_prompt" | "copy_to_clipboard";

function normalizeIdentity(input: unknown) {
  return String(input ?? "").trim().toLowerCase();
}

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

  const normalizedUserId = normalizeIdentity(body.userId);
  const action = body.action;
  const promptId = body.promptId != null ? Number(body.promptId) : null;
  const agentId = Number(body.agentId);
  if (!normalizedUserId || !action || !Number.isFinite(agentId)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["learn_more", "run_prompt", "copy_to_clipboard"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if ((action === "run_prompt" || action === "copy_to_clipboard") && !Number.isFinite(promptId)) {
    return NextResponse.json({ error: "promptId is required for prompt-level actions" }, { status: 400 });
  }

  const db = await getDb();
  await db!.collection("activity_events").insertOne({
    userId: normalizedUserId,
    action,
    agentId,
    promptId: Number.isFinite(promptId) ? promptId : null,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
