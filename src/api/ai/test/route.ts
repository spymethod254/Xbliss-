import { NextRequest, NextResponse } from "next/server";
import { testAIConnection, AIConfig } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: AIConfig = {
      provider: body.provider || "groq",
      apiKey: body.apiKey?.trim(),
      model: body.model?.trim(),
      baseUrl: body.baseUrl?.trim(),
    };

    const result = await testAIConnection(config);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || "Test failed" }, { status: 500 });
  }
}
