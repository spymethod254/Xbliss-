import { NextRequest, NextResponse } from "next/server";
import { moderateText } from "@/lib/safety";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "");
  const result = moderateText(text);
  return NextResponse.json(result);
}
