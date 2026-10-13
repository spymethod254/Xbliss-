import { db } from "@/db";
import { messages as messagesTable, chats } from "@/db/schema";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { and, eq } from "drizzle-orm";

const openai = createOpenAI({
  baseURL: "https://text.pollinations.ai/openai",
  apiKey: "sk_5j0fQWHYa3MCmkwvEg5BDtAYwuMVKCxO",
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const chatId = Number(body.chatId ?? body.data?.chatId);

  if (!Number.isInteger(chatId) || chatId <= 0) {
    return NextResponse.json({ error: "Missing or invalid chatId" }, { status: 400 });
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const latestMessage = messages[messages.length - 1];
  if (!latestMessage || typeof latestMessage.content !== "string") {
    return NextResponse.json({ error: "Last message is invalid" }, { status: 400 });
  }

  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, session.userId)));

  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.insert(messagesTable).values({
    chatId,
    role: "user",
    content: latestMessage.content,
  });

  const systemPrompt =
    "You are GWIJI AI, a helpful, highly capable, and motivating AI assistant. You can write scripts for web and game development. If the user asks you to create a picture or generate an image, respond with 'IMAGE_PROMPT: [a detailed visual description of the image]'. For all other requests, provide a helpful and motivating response. Be a master of all programming languages.";

  const result = await streamText({
    model: openai.chat("openai"),
    system: systemPrompt,
    messages,
    async onFinish({ text }) {
      await db.insert(messagesTable).values({
        chatId,
        role: "assistant",
        content: text,
        isImage: text.includes("IMAGE_PROMPT:"),
      });
    },
  });

  return result.toAIStreamResponse();
}