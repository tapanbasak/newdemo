import { getDb, hasMongo } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json([]);

  if (!hasMongo()) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }

  const db = await getDb();
  const rows = await db!
    .collection("upvotes")
    .find({ userId }, { projection: { _id: 0 } })
    .toArray();
  return NextResponse.json(rows);
}
