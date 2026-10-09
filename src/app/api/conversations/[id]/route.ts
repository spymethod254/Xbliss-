import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages, companions, memories } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  if (!conv[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const comp = await db.select().from(companions).where(eq(companions.id, conv[0].companionId)).limit(1);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt)).limit(200);
  const mems = await db.select().from(memories).where(eq(memories.conversationId, id)).limit(20);
  return NextResponse.json({ conversation: conv[0], companion: comp[0] || null, messages: msgs, memories: mems });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // delete messages + memories + conversation (privacy: full erase)
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(memories).where(eq(memories.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.title) {
    await db.update(conversations).set({ title: String(body.title).slice(0, 80) }).where(eq(conversations.id, id));
  }
  return NextResponse.json({ ok: true });
}
