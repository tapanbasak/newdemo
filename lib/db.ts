import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "prompt_catchup";

let clientPromise: Promise<MongoClient> | null = null;

export function hasMongo(): boolean {
  return Boolean(uri);
}

export async function getDb() {
  if (!uri) return null;
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  const client = await clientPromise;
  return client.db(dbName);
}
