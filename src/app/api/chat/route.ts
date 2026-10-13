import { db } from "@/db";
import { messages as messagesTable, chats } from "@/db/schema";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { eq, and } from "drizzle-orm";

const openai = createOpenAI({
  baseURL: "https://text.pollinations.ai/openai",
  apiKey: "dummy-key",
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json();
  const messages = json.messages;
  const chatId = json.chatId || (json.data && json.data.chatId);
  const latestMessage = messages[messages.length - 1];

  // Save user message
  await db.insert(messagesTable).values({
    chatId: chatId,
    role: "user",
    content: latestMessage.content,
  });

  // Verify chat belongs to user
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, session.userId)));

  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // System prompt to instruct it
  const systemPrompt = "You are GWIJI AI, a helpful, highly capable, and motivating AI assistant. You can write scripts for web and game development. If the user asks you to create a picture or generate an image, respond with 'IMAGE_PROMPT: [a detailed visual description of the image]'. For all other requests, provide a helpful and motivating response. Be a master of all programming languages.";

  const result = await streamText({
    model: openai.chat("openai"),
    system: systemPrompt,
    messages,
    async onFinish({ text }) {
      // If it's an image prompt, we handle it on the client side, but we also save the message
      const isImage = text.includes("IMAGE_PROMPT:");
      await db.insert(messagesTable).values({
        chatId: chatId,
        role: "assistant",
        content: text,
        isImage: isImage,
      });
    },
  });

  return result.toAIStreamResponse();
}
