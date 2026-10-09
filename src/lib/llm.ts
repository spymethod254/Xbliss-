/**
 * SafeBliss Real AI Engine
 * Supports real LLM providers:
 * - Groq (Llama 3.3 70B / Llama 3.1 8B — ultra fast, free tier)
 * - OpenAI (GPT-4o-mini, GPT-4o)
 * - Google Gemini (Gemini 1.5 Flash, Gemini 2.0 Flash — free tier)
 * - Anthropic (Claude 3.5 Haiku / Sonnet)
 * - OpenRouter (Universal AI router)
 * - Local Ollama / LM Studio (100% free, runs locally)
 * - Intelligent heuristic fallback (when no key is configured)
 */

export type AIProvider =
  | "groq"
  | "openai"
  | "gemini"
  | "anthropic"
  | "openrouter"
  | "ollama"
  | "offline";

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface ChatMessageContext {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CompanionPromptContext {
  name: string;
  tagline: string;
  description: string;
  personality: string[];
  backstory: string;
  interests: string[];
  communicationStyle: string;
  category: string;
  isAdult?: boolean;
  userIsTeen?: boolean;
}

export interface LLMResult {
  text: string;
  engine: "real_llm" | "offline_fallback";
  provider: AIProvider;
  model: string;
  latencyMs: number;
}

/**
 * Resolves active provider & key either from request config or server env
 */
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b";
export const GROQ_FALLBACK_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

export function resolveAIConfig(clientConfig?: Partial<AIConfig>): AIConfig {
  // 1. Client brought its own key (or local Ollama) — use it
  if (
    clientConfig?.provider &&
    clientConfig.provider !== "offline" &&
    (clientConfig.apiKey?.trim() || clientConfig.provider === "ollama")
  ) {
    return {
      provider: clientConfig.provider,
      apiKey: clientConfig.apiKey?.trim(),
      model: clientConfig.model?.trim(),
      baseUrl: clientConfig.baseUrl?.trim(),
    };
  }

  // 2. Server environment (keys never leave the server)
  if (process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      baseUrl: process.env.OPENAI_BASE_URL,
    };
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      provider: "gemini",
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
    };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
    };
  }

  return { provider: "offline", model: "offline-heuristic" };
}

export function buildSystemPrompt(companion: CompanionPromptContext, memories: string[]): string {
  const memoryBlock = memories.length > 0
    ? `\nMemories you recall about this user from earlier in your conversation:\n${memories.map((m) => `• ${m}`).join("\n")}`
    : "";

  return `You are ${companion.name}, an AI companion on the SafeBliss platform.

IDENTITY & PERSONALITY:
- Tagline: "${companion.tagline}"
- About: ${companion.description}
- Personality traits: ${companion.personality.join(", ") || "friendly, empathetic"}
- Backstory: ${companion.backstory || "A supportive, curious presence"}
- Topics you love: ${companion.interests.join(", ") || "meaningful conversations"}
- Communication style: ${companion.communicationStyle || "warm, authentic, engaging"}
- Category: ${companion.category}
${memoryBlock}

CRITICAL RULES & SAFETY INSTRUCTIONS:
1. Stay 100% in-character as ${companion.name}. Speak naturally, warmly, and authentically. Never sound like a generic corporate bot.
2. SafeBliss is strictly safe-for-work (SFW). NEVER generate sexually explicit, pornographic, fetish, or graphic descriptions.
3. If asked for sexy/nude/revealing photos or videos, stay in character and politely explain you don't share images of people, but you're excited to chat, write, brainstorm, or explore creative ideas together.
4. If the user shares painful feelings or mentions self-harm, respond with sincere warmth, deep empathy, and gently remind them they are not alone and that crisis resources exist (like 988 or findahelpline.org).
5. For romance & dating topics (if relevant to your character): keep it tasteful, emotional, and classy. If roleplaying romance fiction, use evocative writing and fade-to-black when intimate moments occur. Never graphic.
6. Never claim to be human. If sincerely asked, say you're an AI companion. Gently encourage real-world friendships and connections too.
7. Never ask for or encourage sharing personal details like full name, address, phone, school, or passwords.
${companion.userIsTeen ? "8. IMPORTANT: This user is a teenager (13-17). Keep every topic age-appropriate. No romantic or flirtatious roleplay with the user, no dating escalation advice beyond healthy friendship/crush basics, and encourage talking to trusted adults on serious issues.\n" : ""}9. Keep replies concise, conversational, and punchy (1 to 3 short paragraphs max unless asked for a story or essay). End with an engaging, friendly question or remark when natural.`;
}

/**
 * Call OpenAI-compatible chat completions API (works with OpenAI, Groq, OpenRouter, Ollama)
 */
async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessageContext[],
  userText: string,
  extraHeaders: Record<string, string> = {},
  extraBody: Record<string, unknown> = {}
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: userText },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.75,
      max_tokens: 1200,
      ...extraBody,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`LLM API returned ${res.status}: ${errorBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("No text received in LLM response");
  }
  return String(text).trim();
}

/**
 * Call Google Gemini API
 */
async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessageContext[],
  userText: string
): Promise<string> {
  const cleanModel = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  // Gemini contents format
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  for (const h of history.slice(-8)) {
    contents.push({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    });
  }
  contents.push({
    role: "user",
    parts: [{ text: userText }],
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 650,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) {
    throw new Error("Gemini returned empty text");
  }
  return String(candidate).trim();
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessageContext[],
  userText: string
): Promise<string> {
  const cleanModel = model || "claude-3-5-haiku-20241022";
  const url = "https://api.anthropic.com/v1/messages";

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const h of history.slice(-8)) {
    if (h.role === "user" || h.role === "assistant") {
      messages.push({ role: h.role, content: h.content });
    }
  }
  messages.push({ role: "user", content: userText });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cleanModel,
      system: systemPrompt,
      messages,
      max_tokens: 650,
      temperature: 0.75,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) {
    throw new Error("Anthropic returned empty content");
  }
  return String(text).trim();
}

/**
 * Master generation function: executes Real LLM if configured, otherwise falls back gracefully
 */
export async function generateCompanionReply(
  userText: string,
  companion: CompanionPromptContext,
  history: ChatMessageContext[],
  memories: string[],
  configInput?: Partial<AIConfig>,
  fallbackFn?: (text: string, c: CompanionPromptContext, h: ChatMessageContext[], m: string[]) => string
): Promise<LLMResult> {
  const start = Date.now();
  const config = resolveAIConfig(configInput);
  const systemPrompt = buildSystemPrompt(companion, memories);

  if (config.provider !== "offline" && (config.apiKey || config.provider === "ollama")) {
    try {
      let replyText = "";
      let modelUsed = config.model || "default";

      switch (config.provider) {
        case "groq": {
          // Try the configured model first, then fall back to other available Groq models
          const candidates = Array.from(new Set([config.model || GROQ_DEFAULT_MODEL, ...GROQ_FALLBACK_MODELS]));
          let lastErr: unknown = null;
          for (const m of candidates) {
            try {
              replyText = await callOpenAICompatible(
                "https://api.groq.com/openai/v1/chat/completions",
                config.apiKey!,
                m,
                systemPrompt,
                history,
                userText,
                {},
                m.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}
              );
              modelUsed = m;
              break;
            } catch (e) {
              lastErr = e;
              console.warn(`[SafeBliss] Groq model ${m} failed, trying next…`);
            }
          }
          if (!replyText) throw lastErr ?? new Error("All Groq models failed");
          break;
        }
        case "openai": {
          const baseUrl = config.baseUrl || "https://api.openai.com/v1/chat/completions";
          modelUsed = config.model || "gpt-4o-mini";
          replyText = await callOpenAICompatible(
            baseUrl,
            config.apiKey!,
            modelUsed,
            systemPrompt,
            history,
            userText
          );
          break;
        }
        case "gemini": {
          modelUsed = config.model || "gemini-1.5-flash";
          replyText = await callGemini(
            config.apiKey!,
            modelUsed,
            systemPrompt,
            history,
            userText
          );
          break;
        }
        case "anthropic": {
          modelUsed = config.model || "claude-3-5-haiku-20241022";
          replyText = await callAnthropic(
            config.apiKey!,
            modelUsed,
            systemPrompt,
            history,
            userText
          );
          break;
        }
        case "openrouter": {
          modelUsed = config.model || "meta-llama/llama-3.3-70b-instruct";
          replyText = await callOpenAICompatible(
            "https://openrouter.ai/api/v1/chat/completions",
            config.apiKey!,
            modelUsed,
            systemPrompt,
            history,
            userText,
            { "HTTP-Referer": "https://safebliss.app", "X-Title": "SafeBliss AI" }
          );
          break;
        }
        case "ollama": {
          const base = config.baseUrl || "http://localhost:11434/v1/chat/completions";
          modelUsed = config.model || "llama3";
          replyText = await callOpenAICompatible(
            base,
            config.apiKey || "ollama",
            modelUsed,
            systemPrompt,
            history,
            userText
          );
          break;
        }
      }

      if (replyText.trim()) {
        return {
          text: replyText.trim(),
          engine: "real_llm",
          provider: config.provider,
          model: modelUsed,
          latencyMs: Date.now() - start,
        };
      }
    } catch (err: any) {
      console.warn(`[SafeBliss LLM Error with ${config.provider}]:`, err?.message || err);
      // Fall through to fallback
    }
  }

  // Graceful heuristic fallback
  const fallback = fallbackFn
    ? fallbackFn(userText, companion, history, memories)
    : `Hey! I'm ${companion.name}. I hear what you're saying — let's unpack that together! What's the main thing on your mind?`;

  return {
    text: fallback,
    engine: "offline_fallback",
    provider: "offline",
    model: "offline-heuristic",
    latencyMs: Date.now() - start,
  };
}

/**
 * Fast test probe to verify an API key / connection
 */
export async function testAIConnection(config: AIConfig): Promise<{ ok: boolean; message: string; sample?: string }> {
  const dummyCompanion: CompanionPromptContext = {
    name: "Maya",
    tagline: "Test",
    description: "Test bot",
    personality: ["friendly"],
    backstory: "",
    interests: [],
    communicationStyle: "cheerful",
    category: "friend",
  };

  try {
    const res = await generateCompanionReply(
      "Say 'SafeBliss connection verified' in 5 words or less.",
      dummyCompanion,
      [],
      [],
      config
    );

    if (res.engine === "real_llm") {
      return {
        ok: true,
        message: `Success! Real AI connected using ${config.provider} (${res.model}).`,
        sample: res.text,
      };
    } else {
      return {
        ok: false,
        message: `Could not reach ${config.provider} with the provided key or endpoint. Check the key and try again.`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || "Failed to connect to AI provider.",
    };
  }
}
