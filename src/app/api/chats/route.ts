import { db } from "@/db";
import { chats } from "@/db/schema";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userChats = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, session.userId))
    .orderBy(desc(chats.createdAt));

  return NextResponse.json(userChats);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json();

  const [chat] = await db
    .insert(chats)
    .values({
      userId: session.userId,
      title: title || "New Chat",
    })
    .returning();

  return NextResponse.json(chat);
}
