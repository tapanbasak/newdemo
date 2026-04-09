import { getDb, hasMongo } from "@/lib/db";
import { SharedPrompt } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET() {
  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }
  const db = await getDb();
  const rows = await db!
    .collection<SharedPrompt>("shared_prompts")
    .find({}, { projection: { _id: 0 } })
    .toArray();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json()) as SharedPrompt;
  if (!body.title || !body.createdBy || !body.createdBySoeid || !body.prompt || !body.platform) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const incomingPlatform = String(body.platform).trim().toLowerCase();
  const normalizedPlatform =
    incomingPlatform === "stylus" || incomingPlatform === "citi stylus"
      ? "stylus"
      : incomingPlatform === "copilot"
        ? "copilot"
        : null;

  if (!normalizedPlatform) {
    return NextResponse.json({ error: "Invalid platform value" }, { status: 400 });
  }
  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }
  const db = await getDb();
  const audienceTokens = String(body.audience ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const agentIds = audienceTokens
    .map((token) => {
      const match = /^agent:(\d+)$/.exec(token);
      return match ? Number(match[1]) : null;
    })
    .filter((v): v is number => Number.isFinite(v as number));

  if (agentIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one target agent in audience." },
      { status: 400 }
    );
  }

  const uniqueAgentIds = Array.from(new Set(agentIds));
  await db!.collection("shared_prompts").insertOne({
    ...body,
    platform: normalizedPlatform,
    targetAgentIds: uniqueAgentIds,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  for (const agentId of uniqueAgentIds) {
    const maxPrompt = await db!
      .collection("prompts")
      .find({ agentId }, { projection: { _id: 0, promptId: 1 } })
      .sort({ promptId: -1 })
      .limit(1)
      .toArray();
    const nextPromptId = (Number(maxPrompt[0]?.promptId) || 0) + 1;
    await db!.collection("prompts").insertOne({
      agentId,
      promptId: nextPromptId,
      title: body.title,
      prompt: body.prompt,
      description: body.description || body.prompt,
      certified: false,
      upvotes: 0,
      author: body.createdBy,
      timesSaved: "",
      tip: "",
      lastUpdated: "",
      source: "share",
      platform: normalizedPlatform,
      createdBySoeid: body.createdBySoeid,
      audienceTokens,
      attachments: body.attachments || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return NextResponse.json({ ok: true });
}
