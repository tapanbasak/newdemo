import { getDb, hasMongo } from "@/lib/db";
import { memoryStore } from "@/lib/store";
import { SharedPrompt } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET() {
  if (hasMongo()) {
    const db = await getDb();
    const rows = await db!.collection<SharedPrompt>("shared_prompts").find({}).toArray();
    return NextResponse.json(rows);
  }
  return NextResponse.json(memoryStore.sharedPrompts);
}

export async function POST(req: Request) {
  const body = (await req.json()) as SharedPrompt;
  if (!body.title || !body.createdBy || !body.createdBySoeid || !body.prompt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (hasMongo()) {
    const db = await getDb();
    await db!.collection("shared_prompts").insertOne({ ...body, createdAt: new Date() });
  } else {
    memoryStore.sharedPrompts.push(body);
  }
  return NextResponse.json({ ok: true });
}
