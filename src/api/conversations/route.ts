import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, companions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(50);
  return NextResponse.json({ conversations: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, companionId } = body;
    if (!userId || !companionId) return NextResponse.json({ error: "userId and companionId required" }, { status: 400 });

    // check companion exists
    const c = await db.select().from(companions).where(eq(companions.id, companionId)).limit(1);
    if (!c[0]) return NextResponse.json({ error: "Companion not found" }, { status: 404 });

    // reuse latest empty? No, always create new
    const [created] = await db
      .insert(conversations)
      .values({
        userId,
        companionId,
        title: `Chat with ${c[0].name}`,
      })
      .returning();
    return NextResponse.json({ conversation: created, companion: c[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
