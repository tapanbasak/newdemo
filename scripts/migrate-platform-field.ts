import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "prompt_catchup";
const defaultPlatform = "stylus";

async function run(): Promise<void> {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const sharedLegacyResult = await db.collection("shared_prompts").updateMany(
      { platform: { $in: ["CITI Stylus", "Copilot"] } },
      [
        {
          $set: {
            platform: {
              $cond: [{ $eq: ["$platform", "CITI Stylus"] }, "stylus", "copilot"],
            },
          },
        },
      ]
    );
    const sharedResult = await db
      .collection("shared_prompts")
      .updateMany({ platform: { $exists: false } }, { $set: { platform: defaultPlatform } });

    const promptsLegacyResult = await db.collection("prompts").updateMany(
      { platform: { $in: ["CITI Stylus", "Copilot"] } },
      [
        {
          $set: {
            platform: {
              $cond: [{ $eq: ["$platform", "CITI Stylus"] }, "stylus", "copilot"],
            },
          },
        },
      ]
    );
    const promptsResult = await db
      .collection("prompts")
      .updateMany({ platform: { $exists: false } }, { $set: { platform: defaultPlatform } });

    console.log(
      `Converted legacy shared_prompts: matched=${sharedLegacyResult.matchedCount}, modified=${sharedLegacyResult.modifiedCount}`
    );
    console.log(
      `Updated shared_prompts: matched=${sharedResult.matchedCount}, modified=${sharedResult.modifiedCount}`
    );
    console.log(
      `Converted legacy prompts: matched=${promptsLegacyResult.matchedCount}, modified=${promptsLegacyResult.modifiedCount}`
    );
    console.log(
      `Updated prompts: matched=${promptsResult.matchedCount}, modified=${promptsResult.modifiedCount}`
    );
    console.log("Platform migration completed.");
  } finally {
    await client.close();
  }
}

run().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Platform migration failed:", message);
  process.exit(1);
});
