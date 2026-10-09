import { NextResponse } from "next/server";
import { resolveAIConfig } from "@/lib/llm";

export const dynamic = "force-dynamic";

// Reports which AI engine the server is using — never exposes the key itself.
export async function GET() {
  const cfg = resolveAIConfig();
  return NextResponse.json({
    serverConfigured: cfg.provider !== "offline",
    provider: cfg.provider,
    model: cfg.model,
  });
}
