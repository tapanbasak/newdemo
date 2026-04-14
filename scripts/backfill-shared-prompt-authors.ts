import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "prompt_catchup";
const AUTHOR_POOL = ["Rick", "Oswaldo", "Akash", "Mayukh"] as const;
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
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type SharedPromptDoc = {
  _id: ObjectId;
  title?: string;
  prompt?: string;
  platform?: string;
  createdBySoeid?: string;
  createdBy?: string;
  targetAgentIds?: number[];
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

function pickAuthor(row: PromptDoc): (typeof AUTHOR_POOL)[number] {
  const soeid = String(row.createdBySoeid ?? "").trim().toLowerCase();
  const title = String(row.title ?? "").trim().toLowerCase();
  const seed = soeid || title || "default";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AUTHOR_POOL[hash % AUTHOR_POOL.length];
}

async function run(): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const now = new Date();

    const promptRows = await db.collection<PromptDoc>("prompts").find({}).sort({ createdAt: 1, _id: 1 }).toArray();

    if (!promptRows.length) {
      console.log("No prompts found. Nothing to update.");
      return;
    }

    const promptBulk = db.collection("prompts").initializeUnorderedBulkOp();
    let promptUpdates = 0;

    for (let i = 0; i < promptRows.length; i += 1) {
      const row = promptRows[i];
      const author = pickAuthor(row);
      if (String(row.author ?? "") === author) continue;
      promptBulk.find({ _id: row._id }).updateOne({
        $set: { author, updatedAt: now },
      });
      promptUpdates += 1;
      row.author = author;
    }

    if (promptUpdates > 0) {
      await promptBulk.execute();
    }
    console.log(`prompts: updated author for ${promptUpdates} row(s)`);

    const grouped = new Map<
      string,
      { rows: PromptDoc[]; createdBy: string; targetAgentIds: number[]; representative: PromptDoc }
    >();

    for (const row of promptRows) {
      const key = createBatchKey(row);
      const existing = grouped.get(key);
      const author = String(row.author ?? "").trim() || pickAuthor(row);
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
        existing.createdBy = author;
        if (Number.isFinite(agentId) && !existing.targetAgentIds.includes(agentId)) {
          existing.targetAgentIds.push(agentId);
        }
      }
    }

    let sharedInserted = 0;
    let sharedUpdated = 0;

    for (const [, batch] of grouped) {
      const sample = batch.representative;
      const title = String(sample.title ?? "").trim();
      const prompt = String(sample.prompt ?? "").trim();
      const platform = String(sample.platform ?? "").trim() || "unknown";
      const createdBySoeid = String(sample.createdBySoeid ?? "").trim();
      const createdAt = asDate(sample.createdAt);

      const existing = await db.collection<SharedPromptDoc>("shared_prompts").findOne({
        title,
        prompt,
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
        await db.collection("shared_prompts").updateOne(
          { _id: existing._id },
          {
            $set: {
              createdBy: batch.createdBy,
              targetAgentIds: batch.targetAgentIds,
              updatedAt: now,
            },
          }
        );
        sharedUpdated += 1;
      } else {
        const audienceTokens = Array.isArray(sample.audienceTokens) ? sample.audienceTokens : [];
        const fallbackCreatedAt = createdAt.getTime() > 0 ? createdAt : new Date();
        await db.collection("shared_prompts").insertOne({
          title,
          prompt,
          description: String(sample.description ?? ""),
          platform,
          createdBy: batch.createdBy,
          createdBySoeid,
          audience: audienceTokens.join(", "),
          audienceTokens,
          targetAgentIds: batch.targetAgentIds,
          attachments: String(sample.attachments ?? ""),
          createdAt: fallbackCreatedAt,
          updatedAt: now,
        });
        sharedInserted += 1;
      }
    }

    console.log(`shared_prompts: inserted ${sharedInserted}, updated ${sharedUpdated}`);
    console.log("Backfill complete.");
  } finally {
    await client.close();
  }
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
