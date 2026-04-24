import { getDb, hasMongo } from "@/lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

function normalizeSoeid(input: unknown) {
  return String(input ?? "").trim().toLowerCase();
}
function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeRoleTag(input: unknown) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
function normalizePlatform(input: unknown) {
  const incoming = String(input ?? "").trim().toLowerCase();
  const normalized = incoming.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (normalized === "citi_stylus") return "stylus";
  if (normalized === "microsoft_365_copilot") return "copilot";
  return normalized;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasMongo()) return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const url = new URL(req.url);
  const soeid = normalizeSoeid(url.searchParams.get("soeid"));
  if (!soeid) return NextResponse.json({ error: "SOEID is required" }, { status: 400 });

  const db = await getDb();
  const _id = new ObjectId(id);
  const row = await db!.collection("shared_prompts").findOne({ _id });
  if (!row) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  if (normalizeSoeid(row.createdBySoeid) !== soeid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { _id: omit, ...rest } = row as Record<string, unknown>;
  return NextResponse.json({ id, ...rest });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasMongo()) return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const soeid = normalizeSoeid(body.soeid);
  if (!soeid) return NextResponse.json({ error: "SOEID is required" }, { status: 400 });

  const db = await getDb();
  const _id = new ObjectId(id);
  const existing = await db!.collection("shared_prompts").findOne({ _id });
  if (!existing) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  if (normalizeSoeid(existing.createdBySoeid) !== soeid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
  if (typeof body.prompt === "string" && body.prompt.trim()) updates.prompt = body.prompt.trim();
  if (typeof body.description === "string") updates.description = body.description;
  if (typeof body.attachments === "string") updates.attachments = body.attachments;
  if (typeof body.platform === "string") {
    const platform = normalizePlatform(body.platform);
    if (!platform) return NextResponse.json({ error: "Invalid platform value" }, { status: 400 });
    updates.platform = platform;
  }
  const incomingRoleTags = Array.isArray(body.roleTags)
    ? body.roleTags.map((v) => normalizeRoleTag(v)).filter(Boolean)
    : [];
  const incomingRole = normalizeRoleTag(body.role);
  const mergedRoleTags = Array.from(new Set([...incomingRoleTags, ...(incomingRole ? [incomingRole] : [])]));
  if (Array.isArray(body.roleTags) || typeof body.role === "string") {
    if (mergedRoleTags.length === 0) {
      return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
    }
    updates.roleTags = mergedRoleTags;
    updates.role = mergedRoleTags[0];
  }
  if (typeof body.customRoleLabel === "string") updates.customRoleLabel = body.customRoleLabel.trim();
  if (body.estimatedTimeSaveMinutes != null) {
    const n = Number(body.estimatedTimeSaveMinutes);
    if (!Number.isInteger(n) || n < 0) {
      return NextResponse.json({ error: "Estimated Time Save must be a whole number (0 or more)." }, { status: 400 });
    }
    updates.estimatedTimeSaveMinutes = n;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }
  updates.updatedAt = new Date();

  await db!.collection("shared_prompts").updateOne({ _id }, { $set: updates });

  const promptUpdates: Record<string, unknown> = {};
  if (updates.title != null) promptUpdates.title = updates.title;
  if (updates.prompt != null) promptUpdates.prompt = updates.prompt;
  if (updates.description != null) promptUpdates.description = updates.description || updates.prompt || existing.prompt || "";
  if (updates.attachments != null) promptUpdates.attachments = updates.attachments;
  if (updates.estimatedTimeSaveMinutes != null) promptUpdates.estimatedTimeSaveMinutes = updates.estimatedTimeSaveMinutes;
  if (updates.platform != null) promptUpdates.platform = updates.platform;
  if (updates.role != null) promptUpdates.role = updates.role;
  if (updates.roleTags != null) promptUpdates.roleTags = updates.roleTags;
  promptUpdates.updatedAt = new Date();

  const linkedRes = await db!.collection("prompts").updateMany(
    {
      sharedPromptId: _id,
      source: "share",
      createdBySoeid: { $regex: `^${escapeRegex(soeid)}$`, $options: "i" },
    },
    { $set: promptUpdates }
  );

  // Backward compatibility for rows created before sharedPromptId linkage.
  if (linkedRes.matchedCount === 0) {
    await db!.collection("prompts").updateMany(
      {
        source: "share",
        createdBySoeid: { $regex: `^${escapeRegex(soeid)}$`, $options: "i" },
        title: String(existing.title ?? ""),
        prompt: String(existing.prompt ?? ""),
      },
      { $set: promptUpdates }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasMongo()) return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const url = new URL(req.url);
  const soeid = normalizeSoeid(url.searchParams.get("soeid"));
  if (!soeid) return NextResponse.json({ error: "SOEID is required" }, { status: 400 });

  const db = await getDb();
  const _id = new ObjectId(id);
  const existing = await db!.collection("shared_prompts").findOne({ _id });
  if (!existing) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  if (normalizeSoeid(existing.createdBySoeid) !== soeid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db!.collection("shared_prompts").deleteOne({ _id });

  const linkedRes = await db!.collection("prompts").deleteMany({
    sharedPromptId: _id,
    source: "share",
    createdBySoeid: { $regex: `^${escapeRegex(soeid)}$`, $options: "i" },
  });
  if (linkedRes.deletedCount === 0) {
    await db!.collection("prompts").deleteMany({
      source: "share",
      createdBySoeid: { $regex: `^${escapeRegex(soeid)}$`, $options: "i" },
      title: String(existing.title ?? ""),
      prompt: String(existing.prompt ?? ""),
    });
  }

  return NextResponse.json({ ok: true });
}
