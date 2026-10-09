import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

function computeAgeGroup(birthYear: number): "blocked" | "teen" | "adult" {
  const age = new Date().getFullYear() - birthYear;
  if (age < 13) return "blocked";
  if (age < 18) return "teen";
  return "adult";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, displayName, ageVerified, safetyLevel, birthYear } = body;

    const updates: Partial<typeof users.$inferInsert> = {};
    if (typeof displayName === "string" && displayName.trim()) updates.displayName = displayName.slice(0, 40);
    if (typeof ageVerified === "boolean") updates.ageVerified = ageVerified;
    if (safetyLevel === "strict" || safetyLevel === "balanced") updates.safetyLevel = safetyLevel;

    // Server-side age computation — trusts birthYear passed once, computes group honestly
    if (typeof birthYear === "number" && birthYear >= 1925 && birthYear <= new Date().getFullYear()) {
      updates.birthYear = birthYear;
      updates.ageGroup = computeAgeGroup(birthYear);
    }

    if (userId) {
      const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (existing[0]) {
        if (Object.keys(updates).length > 0) {
          await db.update(users).set(updates).where(eq(users.id, userId));
          const updated = await db.select().from(users).where(eq(users.id, userId)).limit(1);
          return NextResponse.json({ user: updated[0] });
        }
        return NextResponse.json({ user: existing[0] });
      }
    }

    const [created] = await db
      .insert(users)
      .values({
        displayName: typeof displayName === "string" && displayName.trim() ? displayName.slice(0, 40) : "Guest",
        ageVerified: !!ageVerified,
        birthYear: updates.birthYear ?? null,
        ageGroup: updates.ageGroup ?? "guest",
        safetyLevel: safetyLevel === "balanced" ? "balanced" : "strict",
      })
      .returning();
    return NextResponse.json({ user: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ user: rows[0] });
}
