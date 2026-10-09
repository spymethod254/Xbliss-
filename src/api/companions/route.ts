import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { companions } from "@/db/schema";
import { desc, ilike, or, eq, and, ne } from "drizzle-orm";
import { moderateCompanionFields } from "@/lib/safety";
import { SEED_COMPANIONS, SEED_ADULT_COMPANIONS } from "@/lib/seed";

export const dynamic = "force-dynamic";

async function ensureSeeded() {
  try {
    const existing = await db.select({ id: companions.id }).from(companions).limit(1);
    if (existing.length === 0) {
      await db.insert(companions).values(
        SEED_COMPANIONS.map((c) => ({
          ...c,
          isPublic: true,
          isSeeded: true,
          likes: Math.floor(Math.random() * 500) + 50,
          messageCount: Math.floor(Math.random() * 5000) + 200,
        }))
      );
    }
    // Top-up the 18+ love-life seeds (runs once even on the pre-gate DB)
    const adult = await db
      .select({ id: companions.id })
      .from(companions)
      .where(and(eq(companions.isSeeded, true), eq(companions.category, "love-life")))
      .limit(1);
    if (adult.length === 0) {
      await db.insert(companions).values(
        SEED_ADULT_COMPANIONS.map((c) => ({
          ...c,
          isPublic: true,
          isSeeded: true,
          likes: Math.floor(Math.random() * 500) + 80,
          messageCount: Math.floor(Math.random() * 4000) + 300,
        }))
      );
    }
  } catch (e) {
    console.error("seed error", e);
  }
}

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const mode = searchParams.get("mode") || "adult";

  const conditions = [];
  if (q) {
    conditions.push(
      or(ilike(companions.name, `%${q}%`), ilike(companions.tagline, `%${q}%`), ilike(companions.description, `%${q}%`))
    );
  }
  if (category && category !== "all") {
    conditions.push(eq(companions.category, category));
  }
  // Under-18s never see love-life themed companions — enforced server-side
  if (mode === "teen") {
    conditions.push(ne(companions.category, "love-life"));
  }

  const rows = await db
    .select()
    .from(companions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(companions.likes))
    .limit(100);

  return NextResponse.json({ companions: rows });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, tagline, description, personality, backstory, interests, communicationStyle, category, creatorId, avatarEmoji } = body;

    if (!name || !description) {
      return NextResponse.json({ error: "Name and description are required." }, { status: 400 });
    }
    if (String(name).length > 30 || String(description).length > 800) {
      return NextResponse.json({ error: "Name max 30 chars, description max 800 chars." }, { status: 400 });
    }

    const mod = moderateCompanionFields({
      name: String(name),
      tagline: String(tagline || ""),
      description: String(description),
      backstory: String(backstory || ""),
    });

    if (mod.blocked) {
      return NextResponse.json({ error: mod.warning || "Blocked by safety filter." }, { status: 422 });
    }

    const gradients = [
      "from-violet-500 to-fuchsia-500",
      "from-cyan-500 to-blue-600",
      "from-emerald-500 to-teal-600",
      "from-amber-400 to-pink-500",
      "from-orange-500 to-red-500",
      "from-indigo-500 to-purple-600",
      "from-lime-500 to-emerald-600",
      "from-sky-500 to-indigo-600",
      "from-rose-500 to-pink-600",
    ];
    const safeEmojis = ["✨", "🌸", "🌙", "☀️", "🎯", "📚", "🧘", "🌈", "⚡", "🌿", "💫", "🦊", "🐼", "🦋", "🍀"];
    const emoji = safeEmojis.includes(avatarEmoji) ? avatarEmoji : safeEmojis[Math.floor(Math.random() * safeEmojis.length)];

    const [created] = await db
      .insert(companions)
      .values({
        name: String(name).slice(0, 30),
        tagline: String(tagline || "A friendly new companion ✨").slice(0, 80),
        description: String(description).slice(0, 800),
        personality: Array.isArray(personality) ? personality.slice(0, 6).map(String) : ["friendly", "supportive"],
        backstory: String(backstory || "").slice(0, 1000),
        interests: Array.isArray(interests) ? interests.slice(0, 8).map(String) : ["chatting"],
        communicationStyle: String(communicationStyle || "warm and friendly").slice(0, 120),
        avatarEmoji: emoji,
        avatarGradient: gradients[Math.floor(Math.random() * gradients.length)],
        category: ["friend", "mentor", "wellness", "study", "creative", "adventure", "love-life"].includes(category) ? category : "friend",
        isPublic: true,
        isSeeded: false,
        creatorId: creatorId || null,
        likes: 0,
        messageCount: 0,
      })
      .returning();

    return NextResponse.json({ companion: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create companion." }, { status: 500 });
  }
}
