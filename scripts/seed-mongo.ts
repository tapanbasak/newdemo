import { Db, MongoClient } from "mongodb";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { AGENTS, GROUPS, SCOREBOARD_DATA } from "../lib/data";
import { AGENT_VIEW_META } from "../lib/view-meta";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "prompt_catchup";

const COLLECTIONS = [
  "agents",
  "groups",
  "scoreboards",
  "prompts",
  "shared_prompts",
  "activity_events",
  "upvotes",
  "comments",
] as const;

async function ensureCollection(db: Db, name: string): Promise<void> {
  const exists = await db.listCollections({ name }).hasNext();
  if (!exists) {
    await db.createCollection(name);
    console.log(`Created collection: ${name}`);
  } else {
    console.log(`Collection exists: ${name}`);
  }
}

async function createIndexes(db: Db): Promise<void> {
  await db.collection("agents").createIndex({ agentId: 1 }, { unique: true, sparse: true });
  await db.collection("agents").createIndex({ category: 1 });
  await db.collection("agents").createIndex({ status: 1 });

  await db.collection("groups").createIndex({ slug: 1 }, { unique: true, sparse: true });
  await db.collection("groups").createIndex({ sortOrder: 1 });

  await db.collection("scoreboards").createIndex({ key: 1 }, { unique: true, sparse: true });

  const promptIndexes = await db.collection("prompts").indexes();
  const legacyPromptIdIndex = promptIndexes.find((idx) => idx.name === "promptId_1");
  if (legacyPromptIdIndex) {
    await db.collection("prompts").dropIndex("promptId_1");
    console.log("Dropped legacy index: prompts.promptId_1");
  }
  await db.collection("prompts").createIndex({ agentId: 1, promptId: 1 }, { unique: true, sparse: true });
  await db.collection("prompts").createIndex({ agentId: 1 });
  await db.collection("prompts").createIndex({ title: "text", prompt: "text", description: "text" });

  await db.collection("shared_prompts").createIndex({ createdAt: -1 });
  await db.collection("shared_prompts").createIndex({ audience: 1 });

  await db.collection("activity_events").createIndex({ createdAt: -1 });
  await db.collection("activity_events").createIndex({ agentId: 1, action: 1, createdAt: -1 });
  await db.collection("activity_events").createIndex({ userId: 1, createdAt: -1 });

  await db.collection("upvotes").createIndex(
    { userId: 1, agentId: 1, promptId: 1 },
    { unique: true, sparse: true }
  );
  await db.collection("upvotes").createIndex({ agentId: 1, promptId: 1 });

  await db.collection("comments").createIndex({ commentId: 1 }, { unique: true, sparse: true });
  await db.collection("comments").createIndex({ agentId: 1, promptId: 1, createdAt: -1 });
  console.log("Indexes ensured.");
}

function toKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

type PromptSeedCatalog = {
  agentId: number;
  title: string;
  subtitle?: string;
  prompts: Array<{
    id: number;
    title: string;
    prompt?: string;
    description: string;
    certified: boolean;
    upvotes: number;
    author: string;
    timesSaved?: string;
    tip?: string;
    lastUpdated?: string;
  }>;
};

async function seedCoreData(db: Db): Promise<void> {
  // Agents
  for (const agent of AGENTS) {
    const viewMeta = AGENT_VIEW_META[agent.id];
    await db.collection("agents").updateOne(
      { agentId: agent.id },
      {
        $set: {
          agentId: agent.id,
          name: agent.name,
          description: agent.description,
          status: agent.status,
          promptCount: agent.promptCount,
          updatedDate: agent.updatedDate,
          category: agent.category,
          roleTags: viewMeta?.roleTags ?? [],
          usageCount: viewMeta?.usageCount ?? 0,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  // Groups
  for (const [index, group] of GROUPS.entries()) {
    await db.collection("groups").updateOne(
      { slug: group.slug },
      {
        $set: {
          slug: group.slug,
          name: group.name,
          sortOrder: index + 1,
          seedCount: group.count,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  // Scoreboards
  for (const board of SCOREBOARD_DATA) {
    const key = toKey(board.title);
    await db.collection("scoreboards").updateOne(
      { key },
      {
        $set: {
          key,
          title: board.title,
          columns: board.columns,
          rows: board.rows,
          footnote: "footnote" in board ? board.footnote : undefined,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  // Prompts from JSON catalog seed
  const filePath = resolve(process.cwd(), "public/assets/prompt-catalog-sample.json");
  const raw = await readFile(filePath, "utf8");
  const catalogs = JSON.parse(raw) as PromptSeedCatalog[];
  for (const catalog of catalogs) {
    for (const prompt of catalog.prompts ?? []) {
      await db.collection("prompts").updateOne(
        { agentId: catalog.agentId, promptId: prompt.id },
        {
          $set: {
            agentId: catalog.agentId,
            promptId: prompt.id,
            catalogTitle: catalog.title,
            catalogSubtitle: catalog.subtitle ?? "",
            title: prompt.title,
            prompt: prompt.prompt ?? "",
            description: prompt.description,
            certified: prompt.certified,
            upvotes: prompt.upvotes,
            author: prompt.author,
            timesSaved: prompt.timesSaved ?? "",
            tip: prompt.tip ?? "",
            lastUpdated: prompt.lastUpdated ?? "",
            source: "seed",
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }
  }

  console.log("Seed data upserted for agents/groups/scoreboards/prompts.");
}

async function run(): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`Connected to ${uri}`);
    console.log(`Using database: ${dbName}`);

    for (const name of COLLECTIONS) {
      await ensureCollection(db, name);
    }

    await createIndexes(db);
    await seedCoreData(db);
    console.log("MongoDB setup complete.");
  } finally {
    await client.close();
  }
}

run().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("MongoDB setup failed:", message);
  process.exit(1);
});
