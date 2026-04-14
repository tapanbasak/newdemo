import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "prompt_catchup";
const BATCH_WINDOW_MS = 3 * 60 * 1000;

type PromptDoc = {
  _id: ObjectId;
  agentId?: number;
  title?: string;
  prompt?: string;
  description?: string;
  platform?: string;
  createdBySoeid?: string;
  audienceTokens?: string[];
  attachments?: string;
  source?: string;
  author?: string;
  role?: string;
  roleTags?: string[];
  createdAt?: Date | string;
};

type SharedPromptDoc = {
  _id: ObjectId;
  title?: string;
  prompt?: string;
  platform?: string;
  createdBySoeid?: string;
  createdBy?: string;
  createdAt?: Date | string;
};

function asDate(value: Date | string | undefined): Date {
  if (value instanceof Date) return value;
  const parsed = value ? new Date(value) : new Date(0);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function createBatchKey(row: PromptDoc): string {
  const title = String(row.title ?? "").trim();
  const prompt = String(row.prompt ?? "").trim();
  const platform = String(row.platform ?? "").trim().toLowerCase();
  const soeid = String(row.createdBySoeid ?? "").trim().toLowerCase();
  const author = String(row.author ?? "").trim().toLowerCase();
  const createdAt = asDate(row.createdAt).getTime();
  const bucket = Math.floor(createdAt / BATCH_WINDOW_MS);
  return `${soeid}::${author}::${platform}::${title}::${prompt}::${bucket}`;
}

/**
 * Inserts one shared_prompts row per share batch when prompts exist with source=share
 * but the matching shared_prompts document is missing (e.g. legacy data or partial writes).
 */
async function run(): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const now = new Date();

    const promptRows = await db
      .collection<PromptDoc>("prompts")
      .find({ source: "share" })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();

    if (!promptRows.length) {
      console.log("No prompts with source='share'. Nothing to backfill.");
      return;
    }

    const grouped = new Map<
      string,
      { rows: PromptDoc[]; createdBy: string; targetAgentIds: number[]; representative: PromptDoc }
    >();

    for (const row of promptRows) {
      const key = createBatchKey(row);
      const existing = grouped.get(key);
      const author = String(row.author ?? "").trim();
      const agentId = Number(row.agentId);
      if (!existing) {
        grouped.set(key, {
          rows: [row],
          createdBy: author,
          targetAgentIds: Number.isFinite(agentId) ? [agentId] : [],
          representative: row,
        });
      } else {
        existing.rows.push(row);
        if (author) existing.createdBy = author;
        if (Number.isFinite(agentId) && !existing.targetAgentIds.includes(agentId)) {
          existing.targetAgentIds.push(agentId);
        }
      }
    }

    let inserted = 0;
    let skipped = 0;

    for (const [, batch] of grouped) {
      const sample = batch.representative;
      const title = String(sample.title ?? "").trim();
      const promptText = String(sample.prompt ?? "").trim();
      const platform = String(sample.platform ?? "").trim() || "unknown";
      const createdBySoeid = String(sample.createdBySoeid ?? "").trim();
      const createdAt = asDate(sample.createdAt);

      const existing = await db.collection<SharedPromptDoc>("shared_prompts").findOne({
        title,
        prompt: promptText,
        platform,
        createdBySoeid,
        $or: [
          {
            createdAt: {
              $gte: new Date(createdAt.getTime() - 2000),
              $lte: new Date(createdAt.getTime() + BATCH_WINDOW_MS),
            },
          },
          { createdAt: { $exists: false } },
          { createdAt: null },
        ],
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      const audienceTokens = Array.isArray(sample.audienceTokens) ? sample.audienceTokens : [];
      const canonicalRole = String(sample.role ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const roleTags =
        Array.isArray(sample.roleTags) && sample.roleTags.length > 0
          ? sample.roleTags
          : canonicalRole
            ? [canonicalRole]
            : ["developer"];

      const fallbackCreatedAt = createdAt.getTime() > 0 ? createdAt : new Date();

      await db.collection("shared_prompts").insertOne({
        title,
        prompt: promptText,
        description: String(sample.description ?? ""),
        platform,
        createdBy: batch.createdBy || "unknown",
        createdBySoeid,
        audience: audienceTokens.join(", "),
        audienceTokens,
        targetAgentIds: batch.targetAgentIds,
        attachments: String(sample.attachments ?? ""),
        role: canonicalRole || roleTags[0],
        roleTags,
        createdAt: fallbackCreatedAt,
        updatedAt: now,
      });
      inserted += 1;
    }

    console.log(`shared_prompts: inserted ${inserted} missing row(s); batches already present: ${skipped}`);
    console.log("Backfill complete.");
  } finally {
    await client.close();
  }
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
