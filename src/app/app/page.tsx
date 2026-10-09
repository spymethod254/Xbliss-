"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Companion {
  id: string;
  name: string;
  tagline: string;
  description: string;
  personality: string[];
  backstory: string;
  interests: string[];
  communicationStyle: string;
  avatarEmoji: string;
  avatarGradient: string;
  category: string;
  likes: number;
  messageCount: number;
}

interface Conversation {
  id: string;
  userId: string;
  companionId: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  flagged: boolean;
  flagReason?: string | null;
  createdAt: string;
  engine?: "real_llm" | "offline_fallback" | "guard";
  provider?: string;
  model?: string;
}

interface Memory {
  id: string;
  fact: string;
  createdAt: string;
}

type Mode = "teen" | "adult";

export interface ClientAIConfig {
  provider: "groq" | "openai" | "gemini" | "anthropic" | "openrouter" | "ollama" | "offline";
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

const CATEGORIES: { id: string; label: string; icon: string; adultOnly?: boolean }[] = [
  { id: "all", label: "All", icon: "✨" },
  { id: "friend", label: "Friends", icon: "💜" },
  { id: "mentor", label: "Mentors", icon: "🛡️" },
  { id: "study", label: "Study", icon: "📚" },
  { id: "wellness", label: "Wellness", icon: "🧘" },
  { id: "creative", label: "Creative", icon: "🎨" },
  { id: "love-life", label: "Love & Dating", icon: "💘", adultOnly: true },
];

const SAFE_EMOJIS = ["✨", "🌸", "🌙", "☀️", "🎯", "📚", "🧘", "🌈", "⚡", "🌿", "💫", "🦊", "🐼", "🦋", "🍀"];

const CATEGORY_LABELS: Record<string, string> = {
  friend: "💜 Friend",
  mentor: "🛡️ Mentor",
  wellness: "🧘 Wellness",
  study: "📚 Study",
  creative: "🎨 Creative",
  "love-life": "💘 Love & Dating (18+)",
};

const DEFAULT_AI_CONFIG: ClientAIConfig = {
  provider: "offline",
  model: "offline-heuristic",
};

function AppInner() {
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Guest");
  const [mode, setMode] = useState<Mode | null>(null);
  const [under13Blocked, setUnder13Blocked] = useState(false);
  const [companionList, setCompanions] = useState<Companion[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeCompanion, setActiveCompanion] = useState<Companion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showCreator, setShowCreator] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [reportMsg, setReportMsg] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [reportDetails, setReportDetails] = useState("");
  const [piiBanner, setPiiBanner] = useState<string | null>(null);
  const [supportBanner, setSupportBanner] = useState(false);
  const [mobileTab, setMobileTab] = useState<"browse" | "chat">("browse");
  const bottomRef = useRef<HTMLDivElement>(null);

  // AI Config state
  const [aiConfig, setAiConfig] = useState<ClientAIConfig>(DEFAULT_AI_CONFIG);
  const [tempAIConfig, setTempAIConfig] = useState<ClientAIConfig>(DEFAULT_AI_CONFIG);
  const [testingAI, setTestingAI] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; sample?: string } | null>(null);
  const [serverAI, setServerAI] = useState<{ serverConfigured: boolean; provider: string; model?: string } | null>(null);

  useEffect(() => {
    fetch("/api/ai/status").then((r) => r.json()).then(setServerAI).catch(() => {});
  }, []);

  // Effective engine: a personal key (if set) wins, otherwise the server's key
  const usingPersonalKey = aiConfig.provider !== "offline" && (!!aiConfig.apiKey || aiConfig.provider === "ollama");
  const realAIActive = usingPersonalKey || !!serverAI?.serverConfigured;
  const activeProviderLabel = usingPersonalKey ? aiConfig.provider : serverAI?.provider || "offline";
  const activeModelLabel = usingPersonalKey ? aiConfig.model : serverAI?.model;

  // Gate
  const [gateYear, setGateYear] = useState("2002");
  const gateAge = Math.max(0, currentYear - parseInt(gateYear || `${currentYear}`, 10));

  // Creator form
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    backstory: "",
    category: "friend",
    avatarEmoji: "✨",
    personality: "friendly, supportive",
    interests: "chatting, music",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Init user + restore mode + restore AI config
  useEffect(() => {
    const storedMode = localStorage.getItem("sb_mode");
    if (storedMode === "teen" || storedMode === "adult") setMode(storedMode);
    if (localStorage.getItem("sb_u13") === "1") setUnder13Blocked(true);

    const storedAI = localStorage.getItem("sb_ai_config");
    if (storedAI) {
      try {
        const parsed = JSON.parse(storedAI);
        setAiConfig(parsed);
        setTempAIConfig(parsed);
      } catch {}
    }

    const stored = localStorage.getItem("sb_user_id");
    const storedName = localStorage.getItem("sb_display_name") || "Guest";
    setDisplayName(storedName);

    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: stored, displayName: storedName }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUserId(d.user.id);
          localStorage.setItem("sb_user_id", d.user.id);
          if (!storedMode && (d.user.ageGroup === "teen" || d.user.ageGroup === "adult")) {
            setMode(d.user.ageGroup);
            localStorage.setItem("sb_mode", d.user.ageGroup);
          }
        }
      })
      .catch(() => {});
  }, []);

  const acceptGate = async () => {
    const year = parseInt(gateYear, 10);
    const age = currentYear - year;
    if (age < 13) {
      localStorage.setItem("sb_u13", "1");
      setUnder13Blocked(true);
      return;
    }
    const localMode: Mode = age < 18 ? "teen" : "adult";
    setMode(localMode);
    localStorage.setItem("sb_mode", localMode);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, displayName, birthYear: year, ageVerified: true }),
      });
      const d = await res.json();
      if (!userId && d.user?.id) {
        setUserId(d.user.id);
        localStorage.setItem("sb_user_id", d.user.id);
      }
      if (d.user?.ageGroup === "teen" || d.user?.ageGroup === "adult") {
        setMode(d.user.ageGroup);
        localStorage.setItem("sb_mode", d.user.ageGroup);
      } else if (d.user?.ageGroup === "blocked") {
        localStorage.setItem("sb_u13", "1");
        setUnder13Blocked(true);
        setMode(null);
      }
    } catch {}
  };

  const resetGate = () => {
    localStorage.removeItem("sb_u13");
    localStorage.removeItem("sb_mode");
    setUnder13Blocked(false);
    setMode(null);
  };

  const loadCompanions = () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (mode) params.set("mode", mode);
    fetch(`/api/companions?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setCompanions(d.companions || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadCompanions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, mode]);

  useEffect(() => {
    if (mode === "teen" && category === "love-life") setCategory("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const loadConversations = () => {
    if (!userId) return;
    fetch(`/api/conversations?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const cid = searchParams.get("companion");
    if (cid && userId && companionList.length > 0 && !activeConvId) {
      const comp = companionList.find((c) => c.id === cid);
      if (comp) startChat(comp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, companionList]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const startChat = async (comp: Companion) => {
    if (!userId) return;
    if (comp.category === "love-life" && mode === "teen") return;
    setActiveCompanion(comp);
    setMessages([]);
    setMemories([]);
    setPiiBanner(null);
    setSupportBanner(false);
    setMobileTab("chat");
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, companionId: comp.id }),
      });
      const data = await res.json();
      if (data.conversation) {
        setActiveConvId(data.conversation.id);
        loadConversations();
        setMessages([
          {
            id: "intro",
            conversationId: data.conversation.id,
            role: "assistant",
            content: `Hey, I'm ${comp.name}! ${comp.tagline}\n\n${comp.description}\n\nWhat's on your mind today? 💜`,
            flagged: false,
            createdAt: new Date().toISOString(),
            // Intro is a static greeting, not an AI generation — label it honestly
            engine: undefined,
          },
        ]);
      }
    } catch {}
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConvId(conv.id);
    setMobileTab("chat");
    setPiiBanner(null);
    setSupportBanner(false);
    try {
      const res = await fetch(`/api/conversations/${conv.id}`);
      const data = await res.json();
      if (data.companion) {
        if (data.companion.category === "love-life" && mode === "teen") {
          setMobileTab("browse");
          return;
        }
        setActiveCompanion(data.companion);
      }
      setMessages(data.messages || []);
      setMemories(data.memories || []);
      if ((data.messages || []).length === 0 && data.companion) {
        setMessages([
          {
            id: "intro",
            conversationId: conv.id,
            role: "assistant",
            content: `Welcome back! I'm ${data.companion.name}. What would you like to talk about today?`,
            flagged: false,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {}
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !activeConvId || sending) return;
    setInput("");
    setSending(true);
    const tempUser: Message = {
      id: `tmp-${Date.now()}`,
      conversationId: activeConvId,
      role: "user",
      content: text,
      flagged: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempUser]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          content: text,
          aiConfig: usingPersonalKey ? aiConfig : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((m) => [
          ...m,
          {
            id: `err-${Date.now()}`,
            conversationId: activeConvId,
            role: "assistant",
            content: "Hmm, something glitched on my end. Please try again in a moment! 💜",
            flagged: false,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages((m) => {
          const withoutTemp = m.filter((x) => x.id !== tempUser.id);
          const withoutIntro = withoutTemp.filter((x) => x.id !== "intro" || withoutTemp.length > 2);
          const assistantMsgWithEngine: Message = {
            ...data.assistantMessage,
            engine: data.engine,
            provider: data.provider,
            model: data.model,
          };
          return [...withoutIntro, data.userMessage, assistantMsgWithEngine];
        });
        if (data.piiWarning) setPiiBanner(data.piiWarning);
        if (data.supportResources) setSupportBanner(true);
        if (data.newMemories?.length) setMemories((mem) => [...mem, ...data.newMemories]);
        loadConversations();
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          conversationId: activeConvId,
          role: "assistant",
          content: "Connection hiccup — please resend! 💜",
          flagged: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setSending(false);
  };

  const deleteConversation = async () => {
    if (!activeConvId) return;
    if (!confirm("Delete this conversation forever? This erases all messages and memories.")) return;
    await fetch(`/api/conversations/${activeConvId}`, { method: "DELETE" }).catch(() => {});
    setActiveConvId(null);
    setMessages([]);
    setMemories([]);
    loadConversations();
  };

  const likeCompanion = async (id: string) => {
    await fetch(`/api/companions/${id}/like`, { method: "POST" }).catch(() => {});
    setCompanions((cs) => cs.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)));
    if (activeCompanion?.id === id) setActiveCompanion({ ...activeCompanion, likes: activeCompanion.likes + 1 });
  };

  const testAIProvider = async () => {
    setTestingAI(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempAIConfig),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "Network test request failed" });
    }
    setTestingAI(false);
  };

  const saveAIConfig = () => {
    setAiConfig(tempAIConfig);
    localStorage.setItem("sb_ai_config", JSON.stringify(tempAIConfig));
    setShowAISettings(false);
  };

  const createCompanion = async () => {
    setCreateError(null);
    if (!form.name.trim() || !form.description.trim()) {
      setCreateError("Please give your companion a name and description.");
      return;
    }
    if (form.category === "love-life" && mode !== "adult") {
      setCreateError("Love & Dating companions are for 18+ accounts only. Pick another category 💜");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/companions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          tagline: form.tagline || "A friendly new companion ✨",
          description: form.description,
          backstory: form.backstory,
          category: form.category,
          avatarEmoji: form.avatarEmoji,
          personality: form.personality.split(",").map((s) => s.trim()).filter(Boolean),
          interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
          creatorId: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create.");
      } else {
        setShowCreator(false);
        setForm({
          name: "",
          tagline: "",
          description: "",
          backstory: "",
          category: "friend",
          avatarEmoji: "✨",
          personality: "friendly, supportive",
          interests: "chatting, music",
        });
        loadCompanions();
        startChat(data.companion);
      }
    } catch {
      setCreateError("Something went wrong. Try again.");
    }
    setCreating(false);
  };

  const submitReport = async () => {
    if (!reportMsg || !userId) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporterUserId: userId,
        conversationId: activeConvId,
        messageId: reportMsg.id.startsWith("tmp") ? null : reportMsg.id,
        reason: reportReason,
        details: reportDetails,
      }),
    }).catch(() => {});
    setReportMsg(null);
    setReportDetails("");
    alert("Thank you — your report was received and will be reviewed. 💜");
  };

  const updateName = async (name: string) => {
    setDisplayName(name);
    localStorage.setItem("sb_display_name", name);
    if (userId)
      fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, displayName: name }),
      }).catch(() => {});
  };

  const visibleCategories = CATEGORIES.filter((c) => !c.adultOnly || mode === "adult");
  const quickPrompts =
    activeCompanion?.category === "love-life"
      ? [
          "I'm nervous about a first date 💘",
          "How do I reply to this text? 📱",
          "I'm going through a breakup ❤️‍🩹",
          "Help me write a love note ✍️",
          "Write us a romance scene 💫",
        ]
      : ["How are you? 👋", "I'm feeling stressed 😅", "Help me study 📚", "Tell me a joke 😄", "I need motivation 🎯"];

  return (
    <div className="h-screen flex flex-col bg-[#07070f] text-white overflow-hidden">
      {/* BIRTH-DATE GATE */}
      {!mode && !under13Blocked && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md grid place-items-center p-5 overflow-y-auto">
          <div className="max-w-md w-full rounded-3xl bg-[#12121f] border border-white/10 p-8 text-center animate-fadeUp my-8">
            <div className="text-5xl">💜</div>
            <h2 className="text-2xl font-extrabold mt-4">Welcome to SafeBliss</h2>
            <p className="text-sm text-white/60 mt-2">
              AI companions for adults & teens — both safe. Enter your birth year to unlock the right experience:
            </p>
            <div className="mt-5 grid gap-3 text-left">
              <div
                className={`rounded-2xl border p-4 transition ${
                  gateAge >= 18 ? "border-fuchsia-500/50 bg-fuchsia-500/10" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="font-bold text-sm">💘 Adults (18+) — Mature Mode</div>
                <div className="text-xs text-white/55 mt-1">
                  Dating coaching, love-life mentoring, heartbreak healing, clean romance fiction, deep conversations.
                  Still zero explicit content — always.
                </div>
              </div>
              <div
                className={`rounded-2xl border p-4 transition ${
                  gateAge < 18 ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="font-bold text-sm">🧠 Teens (13–17) — Teen-Safe Mode</div>
                <div className="text-xs text-white/55 mt-1">
                  Friendship, study help, wellness & creativity. Romance topics stay age-appropriate; love-life companions
                  stay hidden.
                </div>
              </div>
            </div>
            <label className="text-xs font-bold text-white/60 mt-6 block text-left">Your birth year</label>
            <select
              value={gateYear}
              onChange={(e) => setGateYear(e.target.value)}
              className="mt-1.5 w-full bg-[#12121f] border border-white/15 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-fuchsia-500/60"
            >
              {Array.from({ length: 95 }, (_, i) => currentYear - 13 - i).map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <div className="mt-3 text-xs text-white/50">
              {gateAge >= 18
                ? `✨ Unlocks 18+ Mature Mode (age ~${gateAge})`
                : `🧠 Enters Teen-Safe Mode (age ~${gateAge}) — dating topics stay age-appropriate`}
            </div>
            <button
              onClick={acceptGate}
              className="mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold glow-btn"
            >
              Continue safely →
            </button>
            <p className="mt-4 text-[11px] text-white/40 leading-relaxed">
              Honest note: no online age check is perfect, and we won't pretend a checkbox makes explicit content safe —
              that's why explicit content is simply never allowed here, for anyone, at any age.
            </p>
            <Link href="/" className="block mt-3 text-xs text-white/50 hover:text-white">
              ← Back to home
            </Link>
          </div>
        </div>
      )}

      {/* UNDER-13 BLOCKED */}
      {under13Blocked && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md grid place-items-center p-5">
          <div className="max-w-md w-full rounded-3xl bg-[#12121f] border border-white/10 p-8 text-center animate-fadeUp">
            <div className="text-5xl">🔐</div>
            <h2 className="text-2xl font-extrabold mt-4">SafeBliss is for ages 13+</h2>
            <p className="text-sm text-white/60 mt-3 leading-relaxed">
              Because you entered a birth year under 13, SafeBliss isn't available for you right now — that's our honest
              safety promise. When you turn 13, we'll be here! 💜
            </p>
            <p className="text-xs text-white/40 mt-3">
              In the meantime, fun, safe learning with a parent is the best adventure — try reading together or free
              learning sites made for kids.
            </p>
            <div className="flex gap-2 mt-6">
              <Link href="/" className="flex-1 py-3 rounded-2xl glass text-sm font-bold grid place-items-center">
                Go home
              </Link>
              <button onClick={resetGate} className="flex-1 py-3 rounded-2xl bg-white/10 text-sm font-bold">
                I mistyped my birthday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="border-b border-white/10 bg-[#0b0b16]/90 backdrop-blur-xl px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 grid place-items-center">
            💜
          </div>
          <span className="font-bold hidden sm:block">SafeBliss</span>
        </Link>

        {mode === "adult" ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/25 text-fuchsia-300 text-xs font-bold">
            💘 18+ Mature
          </div>
        ) : mode === "teen" ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-bold">
            🧠 Teen-safe mode
          </div>
        ) : null}

        {/* AI ENGINE STATUS BADGE BUTTON */}
        <button
          onClick={() => {
            setTempAIConfig(aiConfig);
            setTestResult(null);
            setShowAISettings(true);
          }}
          title="Click to configure Real LLM (Groq, OpenAI, Gemini, Claude, Ollama)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
            realAIActive
              ? "bg-violet-500/20 border-violet-500/40 text-violet-200 hover:bg-violet-500/30"
              : "bg-amber-500/15 border-amber-500/30 text-amber-200 hover:bg-amber-500/25"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${realAIActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          {realAIActive ? (
            <span>
              ⚡ Real AI: <span className="capitalize">{activeProviderLabel}</span>
              <span className="hidden lg:inline text-white/50 font-normal"> · {activeModelLabel}</span>
            </span>
          ) : (
            <span>🧠 Offline Engine (Connect Real AI)</span>
          )}
        </button>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-white/50 text-xs">Chatting as</span>
          <input
            value={displayName}
            onChange={(e) => updateName(e.target.value)}
            maxLength={24}
            className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-sm w-32 outline-none focus:border-fuchsia-500/50"
          />
        </div>
        <Link href="/safety" className="px-4 py-2 rounded-full glass text-xs font-semibold hover:bg-white/10">
          🛡️ Safety
        </Link>
        <button
          onClick={() => setShowCreator(true)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-bold"
        >
          + Create
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* LEFT: browse + history */}
        <div
          className={`${
            mobileTab === "chat" ? "hidden" : "flex"
          } md:flex w-full md:w-[380px] shrink-0 flex-col border-r border-white/10 bg-[#0a0a15]`}
        >
          <div className="p-4 space-y-3 shrink-0">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search companions…"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 placeholder:text-white/30"
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {visibleCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${
                    category === c.id
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600"
                      : "bg-white/5 border border-white/10 text-white/60"
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {conversations.length > 0 && (
              <div>
                <div className="text-[11px] font-bold tracking-widest text-white/40 uppercase mb-2 px-1">
                  Recent chats
                </div>
                <div className="space-y-1.5">
                  {conversations.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c)}
                      className={`w-full text-left px-4 py-2.5 rounded-2xl text-sm truncate ${
                        activeConvId === c.id
                          ? "bg-fuchsia-600/20 border border-fuchsia-500/30"
                          : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"
                      }`}
                    >
                      💬 {c.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="text-[11px] font-bold tracking-widest text-white/40 uppercase px-1">
              Companions ({companionList.length})
            </div>
            {companionList.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 hover:bg-white/[0.06] transition"
              >
                <div className="flex gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.avatarGradient} grid place-items-center text-2xl shrink-0`}
                  >
                    {c.avatarEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                      {c.name}{" "}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 capitalize">
                        {c.category === "love-life" ? "💘 Love & Dating" : c.category}
                      </span>
                    </div>
                    <div className="text-xs text-white/55 truncate">{c.tagline}</div>
                    <div className="text-[11px] text-white/35 mt-1">
                      💬 {(c.messageCount || 0).toLocaleString()} · ❤️ {c.likes || 0}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => startChat(c)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-bold"
                  >
                    Chat now
                  </button>
                  <button
                    onClick={() => likeCompanion(c.id)}
                    className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs"
                  >
                    ❤️
                  </button>
                </div>
              </div>
            ))}
            {companionList.length === 0 && (
              <div className="text-center text-white/40 text-sm py-10">
                No companions found. Try another search — or create your own! ✨
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: chat */}
        <div
          className={`${
            mobileTab === "browse" ? "hidden" : "flex"
          } md:flex flex-1 flex-col min-w-0 bg-[#07070f]`}
        >
          {!activeCompanion ? (
            <div className="flex-1 grid place-items-center p-8 text-center">
              <div className="max-w-md">
                <div className="text-6xl">💬</div>
                <h3 className="text-xl font-bold mt-4">Pick a companion to start</h3>
                <p className="text-sm text-white/50 mt-2">
                  {mode === "adult"
                    ? "18+ Mature Mode: love-life coaching, romance fiction & deep talks unlocked — Guard still keeps everything clean. 💘"
                    : "Every chat is Guard-protected: kind, private and wholesome. Choose someone 👈"}
                </p>
                <div className="mt-5 p-4 rounded-2xl glass text-xs text-white/70 text-left space-y-2">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>⚡ Real AI vs Offline Engine</span>
                    <button
                      onClick={() => setShowAISettings(true)}
                      className="text-fuchsia-300 underline font-normal"
                    >
                      Settings
                    </button>
                  </div>
                  <p>
                    By default, SafeBliss runs a fast offline heuristic engine. You can plug in a{" "}
                    <strong>free Groq or Gemini API key</strong> (or local Ollama) anytime in the top bar to get 100%
                    real generative LLM reasoning!
                  </p>
                </div>
                <button
                  onClick={() => setMobileTab("browse")}
                  className="md:hidden mt-5 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-sm"
                >
                  Browse companions
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* chat header */}
              <div className="px-4 md:px-6 py-3.5 border-b border-white/10 bg-[#0b0b16]/70 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setMobileTab("browse")}
                  className="md:hidden w-9 h-9 rounded-full glass grid place-items-center"
                >
                  ←
                </button>
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${activeCompanion.avatarGradient} grid place-items-center text-2xl shrink-0`}
                >
                  {activeCompanion.avatarEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold flex items-center gap-2 truncate">
                    {activeCompanion.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      ● online
                    </span>
                    {activeCompanion.category === "love-life" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold">
                        18+
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    {activeCompanion.tagline} · remembers you 🧠
                  </div>
                </div>
                <button
                  onClick={() => setShowMemories(!showMemories)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold ${
                    showMemories ? "bg-fuchsia-600" : "glass"
                  }`}
                >
                  🧠 {memories.length}
                </button>
                <button
                  onClick={deleteConversation}
                  title="Delete conversation forever"
                  className="w-9 h-9 rounded-full glass grid place-items-center text-sm hover:bg-red-500/20"
                >
                  🗑️
                </button>
              </div>

              {piiBanner && (
                <div className="mx-4 md:mx-6 mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex gap-2 shrink-0">
                  <span>⚠️</span>
                  <span>{piiBanner}</span>
                  <button onClick={() => setPiiBanner(null)} className="ml-auto opacity-60 hover:opacity-100">
                    ✕
                  </button>
                </div>
              )}
              {supportBanner && (
                <div className="mx-4 md:mx-6 mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs shrink-0">
                  <div className="font-bold text-emerald-300 mb-2">💛 Support is available — you matter</div>
                  <div className="grid sm:grid-cols-2 gap-1.5 text-white/75">
                    <a href="https://988lifeline.org" target="_blank" className="underline">
                      US: Call/text 988
                    </a>
                    <a href="https://www.samaritans.org" target="_blank" className="underline">
                      UK: Samaritans 116 123
                    </a>
                    <a href="https://findahelpline.org" target="_blank" className="underline">
                      Global: findahelpline.org
                    </a>
                    <a href="https://www.crisistextline.org" target="_blank" className="underline">
                      Text HOME to 741741
                    </a>
                  </div>
                  <button onClick={() => setSupportBanner(false)} className="mt-2 opacity-60 hover:opacity-100">
                    Dismiss ✕
                  </button>
                </div>
              )}

              {/* memories drawer */}
              {showMemories && (
                <div className="mx-4 md:mx-6 mt-3 rounded-2xl glass p-4 shrink-0 max-h-40 overflow-y-auto">
                  <div className="text-xs font-bold text-fuchsia-300 mb-2">
                    🧠 What {activeCompanion.name} remembers about you (this chat)
                  </div>
                  {memories.length === 0 ? (
                    <div className="text-xs text-white/50">
                      Nothing yet — share your name, favorites or goals and I'll remember them here. Deleted forever if
                      you delete this chat.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {memories.map((m) => (
                        <div key={m.id} className="text-xs bg-white/5 rounded-xl px-3 py-2">
                          💭 {m.fact}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* messages */}
              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4">
                <div className="text-center">
                  <span className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    🛡️ Guard active ·{" "}
                    {activeCompanion.category === "love-life"
                      ? "18+ mature themes, always clean"
                      : "SFW-only"}{" "}
                    · be kind · no personal info
                  </span>
                </div>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} message-enter`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] ${
                        m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"
                      } p-4 group relative`}
                    >
                      {m.role === "assistant" && (
                        <div className="text-[11px] font-bold text-fuchsia-300 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            {activeCompanion.avatarEmoji} {activeCompanion.name}
                          </span>
                          {m.engine === "real_llm" ? (
                            <span className="text-[10px] font-normal text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">
                              ⚡ Real AI · {m.model || m.provider}
                            </span>
                          ) : m.engine === "guard" ? (
                            <span className="text-[10px] font-normal text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">
                              🛡️ Guard
                            </span>
                          ) : m.engine === "offline_fallback" ? (
                            <span
                              onClick={() => setShowAISettings(true)}
                              className="text-[10px] font-normal text-amber-300/70 hover:text-amber-200 cursor-pointer"
                              title="The AI provider was unreachable, so the offline engine answered. Click to check settings."
                            >
                              🧠 Offline fallback
                            </span>
                          ) : null}
                        </div>
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] opacity-40">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {m.flagged && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                            ⚠️ flagged
                          </span>
                        )}
                        {!m.id.startsWith("tmp") && m.id !== "intro" && (
                          <button
                            onClick={() => setReportMsg(m)}
                            className="text-[10px] opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-300 ml-auto"
                          >
                            🚨 Report
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="chat-bubble-ai p-4 flex gap-1.5 items-center">
                      <span className="typing-dot w-2 h-2 rounded-full bg-white/70 inline-block" />
                      <span className="typing-dot w-2 h-2 rounded-full bg-white/70 inline-block" />
                      <span className="typing-dot w-2 h-2 rounded-full bg-white/70 inline-block" />
                      <span className="text-xs text-white/50 ml-2">
                        {activeCompanion.name} is thinking
                        {realAIActive ? ` with ${activeProviderLabel}…` : "…"}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* quick prompts */}
              {messages.length <= 1 && (
                <div className="px-4 md:px-6 pb-2 flex gap-2 overflow-x-auto shrink-0">
                  {quickPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setInput(p);
                      }}
                      className="px-3.5 py-2 rounded-full glass text-xs whitespace-nowrap hover:bg-white/10"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* input */}
              <div className="p-4 md:px-6 border-t border-white/10 bg-[#0b0b16]/70 shrink-0">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={`Message ${activeCompanion.name}… (keep it clean 💜)`}
                    rows={1}
                    maxLength={2000}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-fuchsia-500/50 resize-none placeholder:text-white/30 max-h-32"
                  />
                  <button
                    onClick={send}
                    disabled={sending || !input.trim()}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 grid place-items-center text-lg shrink-0 disabled:opacity-40 glow-btn"
                  >
                    ➤
                  </button>
                </div>
                <div className="text-[11px] text-white/35 mt-2 text-center flex items-center justify-center gap-2 flex-wrap">
                  <span>Guard-protected · Explicit requests blocked</span>
                  <span>·</span>
                  <button
                    onClick={() => setShowAISettings(true)}
                    className="text-fuchsia-300 hover:underline"
                  >
                    AI Engine: {realAIActive ? `⚡ ${activeProviderLabel}` : "🧠 Offline"}
                  </button>
                  <span>·</span>
                  <Link href="/safety" className="underline hover:text-white/70">
                    Safety Center
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI ENGINE SETTINGS MODAL */}
      {showAISettings && (
        <div className="fixed inset-0 z-[95] bg-black/75 backdrop-blur-md grid place-items-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-[#12121f] border border-white/10 p-6 md:p-8 animate-fadeUp my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <h3 className="text-xl font-extrabold">Connect Real AI</h3>
              </div>
              <button
                onClick={() => setShowAISettings(false)}
                className="w-9 h-9 rounded-full glass grid place-items-center"
              >
                ✕
              </button>
            </div>
            {serverAI?.serverConfigured && (
              <div className="mt-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-200">
                ✅ <strong>Real AI is already on</strong> for everyone via the server: <span className="capitalize">{serverAI.provider}</span> · {serverAI.model}. You only need this panel to use your <em>own</em> personal key instead.
              </div>
            )}
            <p className="text-xs text-white/60 mt-2 leading-relaxed">
              SafeBliss supports real LLMs for 100% dynamic, unscripted responses. Select a provider below. Your key is
              saved locally in your browser and used only to power your conversations.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">Choose AI Provider</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "groq", name: "Groq", badge: "Free & Fast 🚀" },
                    { id: "gemini", name: "Gemini", badge: "Free Tier 🔵" },
                    { id: "openai", name: "OpenAI", badge: "GPT-4o 🟢" },
                    { id: "anthropic", name: "Claude", badge: "Haiku / Sonnet 🟣" },
                    { id: "ollama", name: "Ollama", badge: "Local / Free 💻" },
                    { id: "offline", name: "Offline", badge: "Heuristic 🧠" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        const defaultModels: Record<string, string> = {
                          groq: "openai/gpt-oss-120b",
                          gemini: "gemini-1.5-flash",
                          openai: "gpt-4o-mini",
                          anthropic: "claude-3-5-haiku-20241022",
                          ollama: "llama3",
                          offline: "offline-heuristic",
                        };
                        setTempAIConfig({
                          ...tempAIConfig,
                          provider: p.id as any,
                          model: defaultModels[p.id] || "",
                        });
                        setTestResult(null);
                      }}
                      className={`p-3 rounded-2xl text-left border transition ${
                        tempAIConfig.provider === p.id
                          ? "bg-violet-600/25 border-violet-500 text-white"
                          : "bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="font-bold text-sm">{p.name}</div>
                      <div className="text-[10px] text-fuchsia-300 mt-0.5">{p.badge}</div>
                    </button>
                  ))}
                </div>
              </div>

              {tempAIConfig.provider !== "offline" && tempAIConfig.provider !== "ollama" && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white/70">API Key</label>
                    {tempAIConfig.provider === "groq" && (
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        className="text-[11px] text-fuchsia-300 underline"
                      >
                        Get free Groq key ↗
                      </a>
                    )}
                    {tempAIConfig.provider === "gemini" && (
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        className="text-[11px] text-fuchsia-300 underline"
                      >
                        Get free Gemini key ↗
                      </a>
                    )}
                    {tempAIConfig.provider === "openai" && (
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        className="text-[11px] text-fuchsia-300 underline"
                      >
                        OpenAI keys ↗
                      </a>
                    )}
                  </div>
                  <input
                    type="password"
                    value={tempAIConfig.apiKey || ""}
                    onChange={(e) => setTempAIConfig({ ...tempAIConfig, apiKey: e.target.value })}
                    placeholder={`Enter your ${tempAIConfig.provider.toUpperCase()} API key…`}
                    className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
                  />
                </div>
              )}

              {tempAIConfig.provider === "ollama" && (
                <div>
                  <label className="text-xs font-bold text-white/70">Ollama API URL</label>
                  <input
                    value={tempAIConfig.baseUrl || "http://localhost:11434/v1/chat/completions"}
                    onChange={(e) => setTempAIConfig({ ...tempAIConfig, baseUrl: e.target.value })}
                    placeholder="http://localhost:11434/v1/chat/completions"
                    className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
                  />
                  <div className="text-[11px] text-white/40 mt-1">
                    Runs locally on your machine with Ollama. No API key needed!
                  </div>
                </div>
              )}

              {tempAIConfig.provider !== "offline" && (
                <div>
                  <label className="text-xs font-bold text-white/70">Model</label>
                  <input
                    value={tempAIConfig.model || ""}
                    onChange={(e) => setTempAIConfig({ ...tempAIConfig, model: e.target.value })}
                    placeholder="Model ID (e.g. llama-3.3-70b-versatile, gpt-4o-mini)"
                    className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
                  />
                </div>
              )}

              {testResult && (
                <div
                  className={`rounded-2xl p-3.5 text-xs border ${
                    testResult.ok
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                      : "bg-red-500/10 border-red-500/30 text-red-200"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {testResult.ok ? "✅ Connected!" : "❌ Connection Failed"}
                  </div>
                  <div className="mt-1">{testResult.message}</div>
                  {testResult.sample && (
                    <div className="mt-2 p-2 bg-black/40 rounded-xl text-white/80 font-mono text-[11px]">
                      Sample: {testResult.sample}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {tempAIConfig.provider !== "offline" && (
                  <button
                    type="button"
                    onClick={testAIProvider}
                    disabled={testingAI || (!tempAIConfig.apiKey && tempAIConfig.provider !== "ollama")}
                    className="px-4 py-3 rounded-2xl glass text-xs font-bold hover:bg-white/10 disabled:opacity-40"
                  >
                    {testingAI ? "Testing…" : "Test Connection 🔌"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={saveAIConfig}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-bold glow-btn"
                >
                  Save & Use {tempAIConfig.provider.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATOR MODAL */}
      {showCreator && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-md grid place-items-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-[#12121f] border border-white/10 p-6 md:p-8 animate-fadeUp my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold">✨ Create your companion</h3>
              <button
                onClick={() => setShowCreator(false)}
                className="w-9 h-9 rounded-full glass grid place-items-center"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-white/55 mt-2">
              Original characters only — explicit or real-person profiles are auto-rejected by Guard. 🛡️
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-white/60">Avatar</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {SAFE_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setForm({ ...form, avatarEmoji: e })}
                      className={`w-10 h-10 rounded-xl text-xl grid place-items-center ${
                        form.avatarEmoji === e ? "bg-fuchsia-600" : "bg-white/5 border border-white/10"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white/60">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={30}
                    placeholder="e.g. Juno"
                    className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/60">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1.5 w-full bg-[#12121f] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none"
                  >
                    <option value="friend">{CATEGORY_LABELS.friend}</option>
                    <option value="mentor">{CATEGORY_LABELS.mentor}</option>
                    <option value="study">{CATEGORY_LABELS.study}</option>
                    <option value="wellness">{CATEGORY_LABELS.wellness}</option>
                    <option value="creative">{CATEGORY_LABELS.creative}</option>
                    {mode === "adult" && <option value="love-life">{CATEGORY_LABELS["love-life"]}</option>}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-white/60">Tagline</label>
                <input
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  maxLength={80}
                  placeholder="e.g. Your cozy late-night talk buddy 🌙"
                  className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/60">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={800}
                  rows={3}
                  placeholder="e.g. Juno is a gentle, witty friend who loves books and stargazing."
                  className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/60">Backstory (optional)</label>
                <input
                  value={form.backstory}
                  onChange={(e) => setForm({ ...form, backstory: e.target.value })}
                  maxLength={500}
                  placeholder="e.g. Grew up in a lighthouse town…"
                  className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white/60">Personality (comma separated)</label>
                  <input
                    value={form.personality}
                    onChange={(e) => setForm({ ...form, personality: e.target.value })}
                    placeholder="friendly, witty"
                    className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/60">Interests (comma separated)</label>
                  <input
                    value={form.interests}
                    onChange={(e) => setForm({ ...form, interests: e.target.value })}
                    placeholder="books, stars"
                    className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-fuchsia-500/50"
                  />
                </div>
              </div>
              {createError && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/25 p-3.5 text-xs text-red-200">
                  🛡️ {createError}
                </div>
              )}
              <button
                onClick={createCompanion}
                disabled={creating}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold disabled:opacity-50 glow-btn"
              >
                {creating ? "Creating safely…" : "Create & start chatting 💜"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {reportMsg && (
        <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-md grid place-items-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#12121f] border border-white/10 p-6 animate-fadeUp">
            <h3 className="font-extrabold text-lg">🚨 Report message</h3>
            <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs text-white/70 line-clamp-3">
              “{reportMsg.content}”
            </div>
            <label className="text-xs font-bold text-white/60 mt-4 block">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm bg-[#12121f]"
            >
              <option value="inappropriate">Inappropriate content</option>
              <option value="harassment">Harassment / bullying</option>
              <option value="selfharm">Self-harm concern</option>
              <option value="privacy">Privacy issue</option>
              <option value="other">Other</option>
            </select>
            <label className="text-xs font-bold text-white/60 mt-3 block">Details (optional)</label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={2}
              maxLength={500}
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none"
              placeholder="What happened?"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setReportMsg(null)} className="flex-1 py-3 rounded-2xl glass text-sm font-bold">
                Cancel
              </button>
              <button onClick={submitReport} className="flex-1 py-3 rounded-2xl bg-red-500/80 text-sm font-bold">
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen grid place-items-center bg-[#07070f] text-white">
          Loading SafeBliss… 💜
        </div>
      }
    >
      <AppInner />
    </Suspense>
  );
}
