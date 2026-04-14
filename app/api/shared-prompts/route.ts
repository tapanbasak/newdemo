import { getDb, hasMongo } from "@/lib/db";
import { SharedPrompt } from "@/lib/types";
import { ObjectId } from "mongodb";
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
  const normalizedPlatform = incomingPlatform
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const canonicalPlatform =
    normalizedPlatform === "citi_stylus" ? "stylus" : normalizedPlatform === "microsoft_365_copilot" ? "copilot" : normalizedPlatform;
  if (!canonicalPlatform) return NextResponse.json({ error: "Invalid platform value" }, { status: 400 });
  const bodyRoleTags = Array.isArray(body.roleTags) ? body.roleTags : [];
  const canonicalRoleTags = Array.from(
    new Set(
      [
        ...bodyRoleTags.map((value) =>
          String(value)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
        ),
        String(body.role ?? "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      ].filter(Boolean)
    )
  );
  const canonicalRole = canonicalRoleTags[0] ?? "";
  if (!canonicalRoleTags.length) return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
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
  /** Primary role for filtering; `roleTags` can store multiple selections. */
  const roleTags = canonicalRoleTags;

  /** Explicit document only — avoids stray client fields breaking `shared_prompts` inserts. */
  const sharedDoc = {
    title: body.title,
    createdBy: body.createdBy,
    createdBySoeid: body.createdBySoeid,
    audience: body.audience,
    prompt: body.prompt,
    description: body.description ?? "",
    attachments: body.attachments ?? "",
    platform: canonicalPlatform,
    role: canonicalRole,
    roleTags,
    targetAgentIds: uniqueAgentIds,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let sharedInsertId: ObjectId | undefined;
  const insertedPromptIds: ObjectId[] = [];

  try {
    const sharedRes = await db!.collection("shared_prompts").insertOne(sharedDoc);
    sharedInsertId = sharedRes.insertedId as ObjectId;

    for (const agentId of uniqueAgentIds) {
      const maxPrompt = await db!
        .collection("prompts")
        .find({ agentId }, { projection: { _id: 0, promptId: 1 } })
        .sort({ promptId: -1 })
        .limit(1)
        .toArray();
      const nextPromptId = (Number(maxPrompt[0]?.promptId) || 0) + 1;
      const promptRes = await db!.collection("prompts").insertOne({
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
        platform: canonicalPlatform,
        role: canonicalRole,
        roleTags,
        createdBySoeid: body.createdBySoeid,
        audienceTokens,
        attachments: body.attachments || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      if (promptRes.insertedId) insertedPromptIds.push(promptRes.insertedId as ObjectId);
    }
  } catch (err) {
    if (insertedPromptIds.length > 0) {
      await db!.collection("prompts").deleteMany({ _id: { $in: insertedPromptIds } });
    }
    if (sharedInsertId) {
      await db!.collection("shared_prompts").deleteOne({ _id: sharedInsertId });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
