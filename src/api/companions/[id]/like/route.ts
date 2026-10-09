import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db
    .update(companions)
    .set({ likes: sql`${companions.likes} + 1` })
    .where(eq(companions.id, id));
  const rows = await db.select().from(companions).where(eq(companions.id, id)).limit(1);
  return NextResponse.json({ companion: rows[0] });
}
