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
  const normalizeRoleTag = (input: unknown) =>
    String(input ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  const normalizeAgentName = (input: unknown) =>
    String(input ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

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
        ...bodyRoleTags.map((value) => normalizeRoleTag(value)),
        normalizeRoleTag(body.role ?? ""),
      ].filter(Boolean)
    )
  );
  const canonicalRole = canonicalRoleTags[0] ?? "";
  if (!canonicalRoleTags.length) return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
  const estimatedTimeSaveMinutes = Number(body.estimatedTimeSaveMinutes);
  if (!Number.isInteger(estimatedTimeSaveMinutes) || estimatedTimeSaveMinutes < 0) {
    return NextResponse.json(
      { error: "Estimated Time Save must be a whole number of minutes (0 or more)." },
      { status: 400 }
    );
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

  const roleAgents = await db!
    .collection("agents")
    .find(
      {
        category: { $in: ["roles", "role"] },
      },
      { projection: { _id: 0, agentId: 1, name: 1, roleTags: 1 } }
    )
    .toArray();
  const roleAgentIds = roleAgents
    .filter((agent) => {
      const rowTags = Array.isArray(agent.roleTags) ? agent.roleTags.map((value) => normalizeRoleTag(value)) : [];
      const nameTag = normalizeRoleTag(agent.name ?? "");
      return canonicalRoleTags.some((tag) => rowTags.includes(tag) || tag === nameTag);
    })
    .map((agent) => Number(agent.agentId))
    .filter((id) => Number.isFinite(id));

  const appAgents = await db!
    .collection("agents")
    .find(
      {
        category: { $in: ["apps", "app"] },
      },
      { projection: { _id: 0, agentId: 1, name: 1 } }
    )
    .toArray();
  const platformAppNameAliases: Record<string, string[]> = {
    stylus: ["stylusworkspaces", "citistylusworkspaces"],
    copilot: ["copilot", "microsoft365copilot"],
    gh_copilot_vscode: ["githubcopilot"],
    gh_copilot_jetbrains: ["githubcopilot"],
    devin_ai: ["devinai"],
  };
  const targetAppNames = new Set(platformAppNameAliases[canonicalPlatform] ?? []);
  const platformAgentIds =
    targetAppNames.size === 0
      ? []
      : appAgents
          .filter((agent) => targetAppNames.has(normalizeAgentName(agent.name)))
          .map((agent) => Number(agent.agentId))
          .filter((id) => Number.isFinite(id));

  const uniqueAgentIds = Array.from(new Set([...agentIds, ...roleAgentIds, ...platformAgentIds]));
  if (uniqueAgentIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one target assistant in audience or choose a mapped role/platform." },
      { status: 400 }
    );
  }
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
    estimatedTimeSaveMinutes,
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
        estimatedTimeSaveMinutes,
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
