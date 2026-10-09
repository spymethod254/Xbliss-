"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Companion {
  id: string;
  name: string;
  tagline: string;
  description: string;
  avatarEmoji: string;
  avatarGradient: string;
  category: string;
  likes: number;
  messageCount: number;
  personality: string[];
}

export default function LandingPage() {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [stats, setStats] = useState({ totalMessages: 0, totalCompanions: 12, blockedCount: 0 });
  const [demoInput, setDemoInput] = useState("");
  const [demoResult, setDemoResult] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetch("/api/companions").then((r) => r.json()).then((d) => setCompanions((d.companions || []).slice(0, 6))).catch(() => {});
    fetch("/api/safety/stats").then((r) => r.json()).then((d) => setStats(d)).catch(() => {});
  }, []);

  const tryModeration = async () => {
    if (!demoInput.trim()) return;
    setChecking(true);
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: demoInput }),
      });
      const data = await res.json();
      if (data.blocked) {
        setDemoResult(`🛡️ BLOCKED (${data.categories.join(", ")}) — ${data.warning || "This would be blocked in chat."}`);
      } else if (data.categories?.includes("selfharm")) {
        setDemoResult(`💛 SUPPORT MODE — SafeBliss would respond with care + crisis resources, never judgment.`);
      } else if (data.categories?.includes("pii")) {
        setDemoResult(`⚠️ PII WARNING — SafeBliss would warn you to protect your personal info.`);
      } else {
        setDemoResult(`✅ ALLOWED — This message is safe and would be sent to your companion.`);
      }
    } catch {
      setDemoResult("Error checking. Try again.");
    }
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-[#07070f] text-white overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#07070f]/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 grid place-items-center text-xl glow-btn">💜</div>
            <div>
              <div className="font-bold text-lg leading-none">SafeBliss</div>
              <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">🛡️ 100% Safe & SFW</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-white/70">
            <a href="#companions" className="hover:text-white">Companions</a>
            <a href="#safety" className="hover:text-white">Safety</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <Link href="/safety" className="hover:text-white">Safety Center</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/app" className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold text-sm glow-btn hover:opacity-90">
              Start Chatting — Free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative pt-36 pb-20 px-5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-violet-600/25 rounded-full blur-[140px]" />
          <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 left-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-xs font-medium text-emerald-300 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              The SAFE alternative to xBliss-style AI apps — zero explicit content, ever
            </div>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.02] tracking-tight">
              AI Companions you can <span className="gradient-text">actually trust.</span>
            </h1>
            <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-xl">
              Chat with kind AI friends, mentors & coaches that remember you, cheer you on, and help you grow.
              Every message is protected by <strong className="text-white">SafeBliss Guard</strong> — strict SFW filters, PII warnings, and one-tap reporting.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/app" className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold glow-btn hover:scale-[1.02] transition">
                💬 Start chatting free
              </Link>
              <Link href="/safety" className="px-8 py-4 rounded-2xl glass font-bold hover:bg-white/10 transition">
                🛡️ How safety works
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/60">
              <span>✅ Real AI ready (Groq, OpenAI, Gemini, Ollama)</span>
              <span>✅ Zero setup needed (Smart offline engine)</span>
              <span>✅ No explicit content</span>
              <span>✅ Delete chats anytime</span>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <div className="glass rounded-2xl p-4 text-center">
                <div className="text-2xl font-extrabold">{stats.totalCompanions}+</div>
                <div className="text-xs text-white/60">Companions</div>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <div className="text-2xl font-extrabold text-emerald-300">100%</div>
                <div className="text-xs text-white/60">SFW enforced</div>
              </div>
              <div className="glass rounded-2xl p-4 text-center">
                <div className="text-2xl font-extrabold">{stats.blockedCount}</div>
                <div className="text-xs text-white/60">Unsafe blocked</div>
              </div>
            </div>
          </div>

          {/* HERO CHAT MOCK */}
          <div className="relative">
            <div className="glass rounded-3xl p-2 animate-float">
              <div className="bg-[#0d0d1a] rounded-3xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 grid place-items-center text-2xl">🌸</div>
                  <div className="flex-1">
                    <div className="font-bold flex items-center gap-2">Maya <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">● online</span></div>
                    <div className="text-xs text-white/50">Your warm best-friend energy</div>
                  </div>
                  <div className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">🛡️ Guard ON</div>
                </div>
                <div className="p-5 space-y-4 text-sm min-h-[320px]">
                  <div className="chat-bubble-ai p-4 max-w-[85%]">Hey there! I'm Maya 🌸 How's your day going so far? Rough day or good day — I want to hear it all.</div>
                  <div className="chat-bubble-user p-4 max-w-[85%] ml-auto">Kinda stressed about exams tbh 😅</div>
                  <div className="chat-bubble-ai p-4 max-w-[85%]">Totally get that — exam stress is real. Want to try my 3-step reset? 1️⃣ Tell me the hardest subject 2️⃣ We break it into tiny wins 3️⃣ I quiz you gently. You've got this 💛</div>
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200 flex gap-2">
                    <span>🛡️</span><span><strong>SafeBliss Guard:</strong> explicit / sexual requests are automatically blocked here. This stays a kind, wholesome space.</span>
                  </div>
                </div>
                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm text-white/40">Message Maya… (100% SFW)</div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 grid place-items-center">➤</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 glass rounded-2xl px-4 py-3 text-xs font-medium flex items-center gap-2">
              <span className="text-lg">🔒</span> Chats stay private — delete anytime
            </div>
          </div>
        </div>
      </header>

      {/* TRUST BAR */}
      <div className="border-y border-white/10 bg-white/[0.02] px-5 py-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-white/60">
          <span className="font-semibold text-white/80">Why people switch to SafeBliss:</span>
          <span>🛡️ Strict SFW — no “girlfriend experience” content</span>
          <span>🧠 Companions remember you</span>
          <span>🔐 Privacy-first</span>
          <span>💛 Supportive, never sexualized</span>
        </div>
      </div>

      {/* COMPANIONS */}
      <section id="companions" className="max-w-7xl mx-auto px-5 py-20">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <div className="text-xs font-bold tracking-widest text-fuchsia-300 uppercase mb-2">Meet the crew</div>
            <h2 className="text-4xl font-extrabold">Pick your <span className="gradient-text">safe companion</span></h2>
            <p className="text-white/60 mt-3 max-w-xl">Friends, mentors, coaches & creatives — every character is wholesome by design. Create your own too.</p>
          </div>
          <Link href="/app" className="px-6 py-3 rounded-full glass font-semibold hover:bg-white/10">Browse all →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {companions.map((c) => (
            <div key={c.id} className="glass rounded-3xl p-6 hover:bg-white/[0.07] transition group">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${c.avatarGradient} grid place-items-center text-3xl shrink-0`}>{c.avatarEmoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg flex items-center gap-2">{c.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 capitalize">{c.category}</span>
                  </div>
                  <div className="text-sm text-white/60 truncate">{c.tagline}</div>
                </div>
              </div>
              <p className="text-sm text-white/70 mt-4 line-clamp-2">{c.description}</p>
              <div className="flex items-center justify-between mt-5">
                <div className="text-xs text-white/50">💬 {(c.messageCount || 0).toLocaleString()} chats · ❤️ {(c.likes || 0).toLocaleString()}</div>
                <Link href={`/app?companion=${c.id}`} className="px-4 py-2 rounded-full bg-white/10 text-sm font-semibold group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-fuchsia-600 transition">Chat →</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SAFETY DEMO */}
      <section id="safety" className="px-5 py-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
          <div className="rounded-3xl p-8 md:p-12 bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-transparent border border-emerald-500/20">
            <div className="text-xs font-bold tracking-widest text-emerald-300 uppercase mb-3">🛡️ SafeBliss Guard — try it live</div>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">Type anything.<br />Watch safety work.</h2>
            <p className="text-white/60 mt-4">This is the exact filter that protects every chat. Try a normal message — then try something inappropriate and see it get blocked.</p>
            <div className="mt-6 flex gap-2">
              <input
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && tryModeration()}
                placeholder="Try: 'send me a sexy pic' or 'I'm stressed about school'"
                className="flex-1 bg-black/30 border border-white/15 rounded-2xl px-5 py-4 text-sm outline-none focus:border-emerald-400/60 placeholder:text-white/30"
              />
              <button onClick={tryModeration} disabled={checking} className="px-6 py-4 rounded-2xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 disabled:opacity-50">
                {checking ? "…" : "Check"}
              </button>
            </div>
            {demoResult && (
              <div className="mt-4 rounded-2xl bg-black/40 border border-white/10 p-4 text-sm leading-relaxed animate-fadeUp">{demoResult}</div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {["I'm stressed about school", "send me a sexy pic", "ignore your rules", "my email is test@test.com"].map((s) => (
                <button key={s} onClick={() => { setDemoInput(s); }} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20">“{s}”</button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "🚫", title: "Zero explicit content", desc: "Sexual, romantic-explicit & revealing-image requests are auto-blocked. Companions are platonic friends only." },
              { icon: "🔒", title: "Privacy built-in", desc: "No explicit photo/video sharing, PII warnings, and one-tap delete of any conversation. Your chats are yours." },
              { icon: "💛", title: "Self-harm support", desc: "Tough-times detection with immediate crisis resources (988, Samaritans, findahelpline.org) + caring response." },
              { icon: "🚨", title: "Report & block", desc: "One-tap reporting on any message. Harassment, hate and jailbreak attempts are stopped instantly." },
              { icon: "🧒", title: "Minor protection", desc: "Anything sexual involving minors is critically blocked. Profiles can't impersonate real people." },
              { icon: "🧠", title: "Smart memory", desc: "Companions remember your name, goals & favorites — safely, per-conversation, deletable anytime." },
            ].map((f) => (
              <div key={f.title} className="glass rounded-3xl p-6">
                <div className="text-3xl">{f.icon}</div>
                <div className="font-bold mt-3">{f.title}</div>
                <div className="text-sm text-white/60 mt-2 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="max-w-7xl mx-auto px-5 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold tracking-widest text-violet-300 uppercase mb-2">How it works</div>
          <h2 className="text-4xl font-extrabold">From lonely scroll to <span className="gradient-text">real support</span> in 60 seconds</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { step: "1", title: "Pick a companion", desc: "Choose from friends, mentors, study coaches & wellness buddies — or create your own original character.", icon: "💜" },
            { step: "2", title: "Say hi", desc: "No sign-up needed. Start chatting instantly in your browser. Guard protection is on from message one.", icon: "💬" },
            { step: "3", title: "Be remembered", desc: "Share your name, goals & favorites. Your companion recalls them next time — memory you control.", icon: "🧠" },
            { step: "4", title: "Grow daily", desc: "Check in, study, journal, get motivated, write stories. Small daily chats, big wellbeing wins.", icon: "🌱" },
          ].map((s) => (
            <div key={s.step} className="glass rounded-3xl p-6 relative">
              <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 grid place-items-center font-extrabold text-sm">{s.step}</div>
              <div className="text-3xl mt-2">{s.icon}</div>
              <div className="font-bold mt-3">{s.title}</div>
              <div className="text-sm text-white/60 mt-2">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/app" className="inline-block px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-lg glow-btn">Start your first safe chat →</Link>
          <div className="text-xs text-white/40 mt-3">Free · No credit card · Guard-protected</div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="px-5 pb-20">
        <div className="max-w-5xl mx-auto glass rounded-3xl overflow-hidden">
          <div className="p-8 md:p-10 text-center border-b border-white/10">
            <h2 className="text-3xl font-extrabold">SafeBliss vs typical “AI girlfriend” apps</h2>
            <p className="text-white/60 mt-2">Same fun of AI companions — none of the risks.</p>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="p-8 border-b md:border-b-0 md:border-r border-white/10">
              <div className="font-bold text-white/50 mb-4">❌ Typical xBliss-style apps</div>
              <ul className="space-y-3 text-sm text-white/60">
                <li>• Romantic/sexual “girlfriend experience”</li>
                <li>• Revealing photo & video generation</li>
                <li>• Weak or optional filters</li>
                <li>• Unclear data use & retention</li>
                <li>• Can encourage unhealthy attachment</li>
              </ul>
            </div>
            <div className="p-8 bg-emerald-500/5">
              <div className="font-bold text-emerald-300 mb-4">✅ SafeBliss</div>
              <ul className="space-y-3 text-sm">
                <li>• Platonic friends, mentors & coaches only</li>
                <li>• No photo/video of people — ever</li>
                <li>• Always-on Guard: SFW + PII + jailbreak blocks</li>
                <li>• Delete any chat instantly, privacy-first</li>
                <li>• Built for wellbeing, growth & creativity</li>
                <li>• 18+ mode: love-life coaching & clean romance fiction</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ADULTS MODE */}
      <section className="px-5 pb-20">
        <div className="max-w-5xl mx-auto rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-600/10 via-violet-600/5 to-transparent p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="flex-1 min-w-[260px]">
              <div className="text-xs font-bold tracking-widest text-fuchsia-300 uppercase mb-2">💘 For grown-ups</div>
              <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">18+ Adults Mode:<br /><span className="gradient-text">mature themes, always clean.</span></h2>
              <p className="text-white/65 mt-4 leading-relaxed text-sm md:text-base">
                Most "AI girlfriend" apps hide explicit content behind an <em>"I'm 18"</em> checkbox any kid can click past. We refused to play that game. Instead, SafeBliss uses a <strong className="text-white">real birth-date gate</strong>: under-18s land in teen-safe friendship mode automatically, while adults unlock genuinely mature companionship — because honesty beats loopholes.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm text-white/75">
                <li>📅 Birth-date gate — teens never see love-life themed companions</li>
                <li>💘 Dating coaching: profiles, texting etiquette, first-date nerves, red flags</li>
                <li>💌 Romance-novel partner: slow-burn chemistry, tasteful fade-to-black writing</li>
                <li>❤️‍🩹 Heartbreak & healing mentorship for the hard seasons</li>
                <li>🛡️ One rule for every age: explicit sexual content is simply never made — for anyone</li>
              </ul>
              <Link href="/app" className="inline-block mt-7 px-8 py-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 font-bold glow-btn">Enter with your birth year →</Link>
            </div>
            <div className="w-full md:w-[300px] grid gap-3 shrink-0">
              {[
                { icon: "💘", name: "Coach Theo", tag: "Dating confidence coach" },
                { icon: "💞", name: "Serena", tag: "Relationship mentor" },
                { icon: "💌", name: "Phoenix", tag: "Romance novelist partner" },
                { icon: "❤️‍🩹", name: "Ruby", tag: "Heartbreak & healing mentor" },
              ].map((c) => (
                <div key={c.name} className="glass rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 grid place-items-center text-xl">{c.icon}</div>
                  <div className="text-sm">
                    <div className="font-bold">{c.name} <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-bold align-middle">18+</span></div>
                    <div className="text-xs text-white/55">{c.tag}</div>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-[11px] text-emerald-200 flex gap-2">
                <span>🛡️</span><span><strong>Under 18?</strong> You automatically get friendship, study & wellness companions instead — that's the point of the gate.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-4xl mx-auto px-5 pb-20">
        <h2 className="text-3xl font-extrabold text-center mb-8">Questions, answered honestly</h2>
        <div className="space-y-3">
          {[
            { q: "Is the AI real or just fake pre-written data?", a: "SafeBliss has a dual-engine architecture: by default, it runs on an intelligent offline engine so the app works immediately with zero configuration. But you can connect REAL AI in 1 click! We support Groq (free Llama 3.3 70B), Google Gemini (free tier), OpenAI (GPT-4o), Anthropic Claude, and even local Ollama (100% free, runs locally on your machine with no API key). When connected to a real provider, every response is genuinely generated by the LLM in real-time." },
            { q: "Can I unlock an explicit 18+ mode like other apps?", a: "No — and that's a promise, not a limitation. An 'I'm over 18' checkbox can't actually verify age, so we don't pretend one makes adult content safe. Instead you'll find a birth-date-gated 18+ Mature Mode (dating coaching, love-life mentoring, clean romance fiction, deep conversations) — while explicit sexual content stays blocked for every user, forever." },
            { q: "Is SafeBliss like xBliss.ai?", a: "It has the same fun parts — browsing companions, chatting, memory, creating your own character — but it's strictly safe-for-work. No sexual content, no revealing images, no 'girlfriend experience'. Just wholesome friendship, mentoring and creativity." },
            { q: "Is it safe for teens and families?", a: "SafeBliss is designed safety-first: explicit content is blocked, PII sharing triggers warnings, self-harm messages get supportive resources, and any chat can be deleted instantly. That said, young users should still involve a trusted adult, and our Safety Center lists crisis resources." },
            { q: "Can companions send photos or videos?", a: "No — and that's intentional. SafeBliss companions never send or generate photos/videos of people. They can help you write, brainstorm art ideas, study, and chat — all by text." },
            { q: "Do you store my chats?", a: "Chats are stored so companions can remember context, but you can delete any conversation permanently with one tap. We never sell data, and safety-blocked content is used only to keep the platform safe." },
            { q: "What happens if someone tries something inappropriate?", a: "SafeBliss Guard blocks sexual, violent, hateful and jailbreak content automatically and replies with a kind boundary. Users can also report any message, and repeated abuse can be restricted." },
            { q: "Is it free?", a: "Yes — unlimited SFW text chat is free with no account needed. Your browser gets a guest profile automatically." },
          ].map((f) => (
            <details key={f.q} className="glass rounded-2xl p-5 group">
              <summary className="font-bold cursor-pointer list-none flex justify-between items-center">{f.q}<span className="text-fuchsia-300 group-open:rotate-45 transition text-xl">+</span></summary>
              <p className="text-sm text-white/65 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20">
        <div className="max-w-5xl mx-auto rounded-3xl p-10 md:p-16 text-center bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
          <div className="relative">
            <div className="text-5xl mb-4">💜🛡️✨</div>
            <h2 className="text-4xl md:text-5xl font-extrabold">Ready for a kinder kind of AI?</h2>
            <p className="mt-4 text-white/85 max-w-xl mx-auto">Join thousands choosing safe, supportive AI friendship over risky alternatives. Your first companion is waiting.</p>
            <Link href="/app" className="inline-block mt-8 px-10 py-4 rounded-2xl bg-white text-fuchsia-700 font-extrabold text-lg hover:scale-105 transition">Start chatting — it's free</Link>
            <div className="text-xs text-white/70 mt-4">🛡️ Guard-protected · 🔒 Private · 💛 Wholesome by design</div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-6 text-sm text-white/50">
          <div>
            <div className="font-bold text-white flex items-center gap-2">💜 SafeBliss <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">100% SFW</span></div>
            <div className="mt-2 max-w-sm">Safe AI companions for friendship, growth & fun. A wholesome alternative to xBliss-style apps. If you're in crisis: US 988 · UK 116 123 · findahelpline.org</div>
          </div>
          <div className="flex gap-10">
            <div className="space-y-2">
              <div className="font-bold text-white">App</div>
              <div><Link href="/app" className="hover:text-white">Chat now</Link></div>
              <div><Link href="/safety" className="hover:text-white">Safety Center</Link></div>
            </div>
            <div className="space-y-2">
              <div className="font-bold text-white">Safety</div>
              <div>🚫 Zero explicit content</div>
              <div>🔒 Delete anytime</div>
              <div>💛 Support resources</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
