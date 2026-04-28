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

export async function GET(req: Request) {
  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }
  const url = new URL(req.url);
  const soeid = normalizeSoeid(url.searchParams.get("soeid"));
  if (!ALLOWED_CERTIFY_USERS.has(soeid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") ?? "10") || 10));
  const skip = (page - 1) * pageSize;

  const db = await getDb();
  const total = await db!.collection("shared_prompts").countDocuments();
  const rows = await db!
    .collection("shared_prompts")
    .find({}, { projection: { _id: 1, title: 1, createdBy: 1, createdBySoeid: 1, prompt: 1 } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .toArray();

  const ids = rows.map((row) => row._id);
  const certifiedBySharedPrompt = new Map<string, boolean>();
  if (ids.length > 0) {
    const certAgg = await db!
      .collection("prompts")
      .aggregate([
        { $match: { sharedPromptId: { $in: ids }, source: "share" } },
        { $group: { _id: "$sharedPromptId", certified: { $max: { $cond: [{ $eq: ["$certified", true] }, 1, 0] } } } },
      ])
      .toArray();
    for (const row of certAgg) {
      certifiedBySharedPrompt.set(String(row._id), Boolean(row.certified));
    }
  }

  // Backward compatibility: older prompt rows may not have sharedPromptId.
  // For unresolved rows, detect certification by author+title+prompt linkage.
  const unresolvedRows = rows.filter((row) => !certifiedBySharedPrompt.has(String(row._id)));
  if (unresolvedRows.length > 0) {
    const fallbackChecks = await Promise.all(
      unresolvedRows.map(async (row) => {
        const soeid = normalizeSoeid(row.createdBySoeid);
        if (!soeid) return { id: String(row._id), certified: false };
        const hit = await db!.collection("prompts").findOne(
          {
            source: "share",
            certified: true,
            createdBySoeid: { $regex: `^${escapeRegex(soeid)}$`, $options: "i" },
            title: String(row.title ?? ""),
            prompt: String(row.prompt ?? ""),
          },
          { projection: { _id: 1 } }
        );
        return { id: String(row._id), certified: Boolean(hit) };
      })
    );
    for (const check of fallbackChecks) {
      if (check.certified) {
        certifiedBySharedPrompt.set(check.id, true);
      }
    }
  }

  const items = rows.map((row) => ({
    id: String(row._id),
    title: String(row.title ?? ""),
    authorName: String(row.createdBy ?? ""),
    authorSoeid: normalizeSoeid(row.createdBySoeid),
    certified: certifiedBySharedPrompt.get(String(row._id)) ?? false,
  }));

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: Request) {
  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    soeid?: string;
    id?: string;
    certified?: boolean;
  };
  const soeid = normalizeSoeid(body.soeid);
  if (!ALLOWED_CERTIFY_USERS.has(soeid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Prompt id is required" }, { status: 400 });
  const targetCertified = body.certified !== false;

  const db = await getDb();
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const _id = new ObjectId(id);
  const existing = await db!.collection("shared_prompts").findOne({ _id });
  if (!existing) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  const now = new Date();
  const linkedRes = await db!.collection("prompts").updateMany(
    { sharedPromptId: _id, source: "share" },
    { $set: { certified: targetCertified, updatedAt: now } }
  );
  if (linkedRes.matchedCount === 0) {
    await db!.collection("prompts").updateMany(
      {
        source: "share",
        createdBySoeid: {
          $regex: `^${escapeRegex(normalizeSoeid(existing.createdBySoeid))}$`,
          $options: "i",
        },
        title: String(existing.title ?? ""),
        prompt: String(existing.prompt ?? ""),
      },
      { $set: { certified: targetCertified, updatedAt: now } }
    );
  }

  await db!.collection("shared_prompts").updateOne({ _id }, { $set: { certified: targetCertified, updatedAt: now } });
  return NextResponse.json({ ok: true });
}
