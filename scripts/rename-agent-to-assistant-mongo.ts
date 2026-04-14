import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "prompt_catchup";

/** Rename * Agent -> * Assistant in agents.name and prompts.catalogTitle (MongoDB). */
async function run(): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const agentsRes = await db.collection("agents").updateMany(
      { name: { $regex: / Agent$/ } },
      [
        {
          $set: {
            name: {
              $replaceOne: { input: "$name", find: " Agent", replacement: " Assistant" },
            },
            updatedAt: new Date(),
          },
        },
      ]
    );
    console.log(`agents: matched=${agentsRes.matchedCount}, modified=${agentsRes.modifiedCount}`);

    const promptsRes = await db.collection("prompts").updateMany(
      { catalogTitle: { $regex: / Agent/ } },
      [
        {
          $set: {
            catalogTitle: {
              $replaceAll: { input: "$catalogTitle", find: " Agent ", replacement: " Assistant " },
            },
            updatedAt: new Date(),
          },
        },
      ]
    );
    console.log(`prompts (catalogTitle): matched=${promptsRes.matchedCount}, modified=${promptsRes.modifiedCount}`);

    const promptsTail = await db.collection("prompts").updateMany(
      { catalogTitle: { $regex: / Agent Prompt Catalog$/ } },
      [
        {
          $set: {
            catalogTitle: {
              $replaceOne: {
                input: "$catalogTitle",
                find: " Agent Prompt Catalog",
                replacement: " Assistant Prompt Catalog",
              },
            },
            updatedAt: new Date(),
          },
        },
      ]
    );
    console.log(`prompts (Agent Prompt Catalog suffix): matched=${promptsTail.matchedCount}, modified=${promptsTail.modifiedCount}`);

    console.log("Rename Agent -> Assistant in MongoDB complete.");
  } finally {
    await client.close();
  }
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
