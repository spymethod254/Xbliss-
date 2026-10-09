import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { safetyReports } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reporterUserId, conversationId, messageId, reason, details } = body;
    if (!reporterUserId || !reason) return NextResponse.json({ error: "reporterUserId and reason required" }, { status: 400 });
    const allowed = ["inappropriate", "harassment", "selfharm", "privacy", "other"];
    const [created] = await db.insert(safetyReports).values({
      reporterUserId,
      conversationId: conversationId || null,
      messageId: messageId || null,
      reason: allowed.includes(reason) ? reason : "other",
      details: String(details || "").slice(0, 1000),
      status: "pending",
    }).returning();
    return NextResponse.json({ report: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
