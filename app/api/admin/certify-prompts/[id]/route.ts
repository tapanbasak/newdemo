import { getDb, hasMongo } from "@/lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const ALLOWED_CERTIFY_USERS = new Set(["oo24666", "tb97406"]);

function normalizeSoeid(input: unknown) {
  return String(input ?? "").trim().toLowerCase();
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }
  const url = new URL(req.url);
  const soeid = normalizeSoeid(url.searchParams.get("soeid"));
  if (!ALLOWED_CERTIFY_USERS.has(soeid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = await getDb();
  const _id = new ObjectId(id);
  const existing = await db!.collection("shared_prompts").findOne({ _id });
  if (!existing) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  await db!.collection("shared_prompts").deleteOne({ _id });
  const linkedRes = await db!.collection("prompts").deleteMany({ sharedPromptId: _id, source: "share" });
  if (linkedRes.deletedCount === 0) {
    await db!.collection("prompts").deleteMany({
      source: "share",
      createdBySoeid: {
        $regex: `^${escapeRegex(normalizeSoeid(existing.createdBySoeid))}$`,
        $options: "i",
      },
      title: String(existing.title ?? ""),
      prompt: String(existing.prompt ?? ""),
    });
  }

  return NextResponse.json({ ok: true });
}
