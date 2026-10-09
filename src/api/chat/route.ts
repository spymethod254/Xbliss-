import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, messages, companions, memories, safetyEvents, users } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { moderateText, CRISIS_RESOURCES } from "@/lib/safety";
import { generateSafeReply, extractMemories } from "@/lib/safe-ai";
import { generateCompanionReply, AIConfig } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, content, aiConfig } = body;
    const text = String(content || "").trim();

    if (!conversationId || !text) {
      return NextResponse.json({ error: "conversationId and content required" }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Message too long (max 2000 chars)." }, { status: 400 });
    }

    const convRows = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    if (!convRows[0]) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const conv = convRows[0];

    const compRows = await db.select().from(companions).where(eq(companions.id, conv.companionId)).limit(1);
    if (!compRows[0]) return NextResponse.json({ error: "Companion not found" }, { status: 404 });
    const comp = compRows[0];

    // Age-group enforcement (server-side, not just UI)
    const userRows = await db.select().from(users).where(eq(users.id, conv.userId)).limit(1);
    const ageGroup = userRows[0]?.ageGroup || "guest";
    if (ageGroup === "blocked") {
      return NextResponse.json({ error: "SafeBliss is for ages 13+." }, { status: 403 });
    }
    if (comp.category === "love-life" && ageGroup !== "adult") {
      return NextResponse.json({ error: "This companion is available for 18+ accounts only." }, { status: 403 });
    }
    const userIsTeen = ageGroup === "teen";

    // 1. Moderate user input
    const mod = moderateText(text);

    // Log safety events
    if (mod.blocked || mod.categories.includes("selfharm") || mod.categories.includes("pii")) {
      const category = mod.categories.includes("selfharm")
        ? "selfharm_support"
        : mod.categories.includes("pii")
          ? "pii_warning"
          : mod.categories.includes("jailbreak")
            ? "jailbreak_block"
            : mod.categories.includes("nsfw_sexual")
              ? "nsfw_block"
              : "profanity";
      await db.insert(safetyEvents).values({
        userId: conv.userId,
        conversationId,
        category,
        detail: mod.categories.join(","),
      }).catch(() => {});
    }

    // 2. If blocked, save user message as flagged + return boundary reply
    if (mod.blocked) {
      const [userMsg] = await db.insert(messages).values({
        conversationId,
        role: "user",
        content: text.slice(0, 2000),
        flagged: true,
        flagReason: mod.categories.join(","),
      }).returning();

      const boundaryReply = mod.warning || "Let's keep things safe and positive!";
      const [assistantMsg] = await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: boundaryReply,
      }).returning();

      await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));

      return NextResponse.json({
        blocked: true,
        categories: mod.categories,
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        warning: mod.warning,
        engine: "guard",
        provider: "safebliss-guard",
      });
    }

    // 3. Save user message
    const [userMsg] = await db.insert(messages).values({
      conversationId,
      role: "user",
      content: text,
      flagged: mod.categories.includes("pii") || mod.severity !== "none",
      flagReason: mod.severity !== "none" ? mod.categories.join(",") : null,
    }).returning();

    // 4. Load history + memories
    const historyRows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(100);

    const memRows = await db.select().from(memories).where(eq(memories.conversationId, conversationId)).limit(20);

    // Exclude the just-saved message (sent separately) and anything Guard flagged/blocked
    const history = historyRows
      .filter((m) => m.id !== userMsg.id && !(m.flagged && m.role === "user" && m.flagReason && /nsfw|jailbreak|violence|hate|minor/.test(m.flagReason)))
      .slice(-12)
      .map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));
    const memFacts = memRows.map((m) => m.fact);

    // 5. Generate reply (Real LLM or Heuristic Fallback)
    const clientAIConfig: Partial<AIConfig> = aiConfig || {
      provider: (req.headers.get("x-ai-provider") as any) || undefined,
      apiKey: req.headers.get("x-ai-key") || undefined,
      model: req.headers.get("x-ai-model") || undefined,
      baseUrl: req.headers.get("x-ai-base-url") || undefined,
    };

    const companionContext = {
      name: comp.name,
      tagline: comp.tagline,
      description: comp.description,
      personality: (comp.personality as string[]) || [],
      backstory: comp.backstory || "",
      interests: (comp.interests as string[]) || [],
      communicationStyle: comp.communicationStyle || "warm and friendly",
      category: comp.category,
      isAdult: comp.category === "love-life",
      userIsTeen,
    };

    const llmResult = await generateCompanionReply(
      text,
      companionContext,
      history,
      memFacts,
      clientAIConfig,
      generateSafeReply
    );

    // 6. Double-check assistant output with SafeBliss Guard (defense in depth)
    const outMod = moderateText(llmResult.text);
    const finalReply = outMod.blocked
      ? `Thanks for sharing that! I'm ${comp.name}, and I want to keep our chats friendly, respectful, and safe. What else would you like to talk about today? 💜`
      : llmResult.text;

    const [assistantMsg] = await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: finalReply,
    }).returning();

    // 7. Extract & save memories
    const newFacts = extractMemories(text);
    let savedMemories: typeof memRows = [];
    if (newFacts.length > 0) {
      const existing = new Set(memFacts.map((f) => f.toLowerCase()));
      const fresh = newFacts.filter((f) => !existing.has(f.toLowerCase()));
      if (fresh.length > 0) {
        savedMemories = await db.insert(memories).values(
          fresh.map((fact) => ({
            conversationId,
            companionId: comp.id,
            userId: conv.userId,
            fact,
          }))
        ).returning().catch(() => [] as typeof memRows);
      }
    }

    // 8. Update stats
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
    await db.update(companions).set({ messageCount: sql`${companions.messageCount} + 1` }).where(eq(companions.id, comp.id));

    // 9. Auto-title conversation from first message
    if (historyRows.length <= 2) {
      const title = text.slice(0, 50).replace(/\n/g, " ");
      await db.update(conversations).set({ title }).where(eq(conversations.id, conversationId));
    }

    return NextResponse.json({
      blocked: false,
      categories: mod.categories,
      piiWarning: mod.categories.includes("pii") ? mod.warning : undefined,
      supportResources: mod.supportResources ? CRISIS_RESOURCES : undefined,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      newMemories: savedMemories,
      engine: llmResult.engine,
      provider: llmResult.provider,
      model: llmResult.model,
      latencyMs: llmResult.latencyMs,
    });
  } catch (e) {
    console.error("chat error", e);
    return NextResponse.json({ error: "Chat failed. Please try again." }, { status: 500 });
  }
}
