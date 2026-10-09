"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SafetyPage() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    fetch("/api/safety/stats").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      <nav className="border-b border-white/10 backdrop-blur-xl bg-[#07070f]/70 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 grid place-items-center text-xl">💜</div>
            <div className="font-bold text-lg">SafeBliss</div>
          </Link>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 rounded-full text-sm text-white/70 hover:text-white">Home</Link>
            <Link href="/app" className="px-5 py-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-semibold">Open App</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-bold mb-6">
          🛡️ SAFETY CENTER — TRANSPARENCY FIRST
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold max-w-3xl leading-tight">Safety isn't a feature here. <span className="gradient-text">It's the whole product.</span></h1>
        <p className="text-white/60 mt-4 max-w-2xl text-lg">Every SafeBliss chat is protected by Guard — real-time filters, PII warnings, crisis support, and human-reviewable reports. Here's exactly how it works.</p>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            <div className="glass rounded-2xl p-5 text-center"><div className="text-3xl font-extrabold text-emerald-300">100%</div><div className="text-xs text-white/60 mt-1">SFW enforcement</div></div>
            <div className="glass rounded-2xl p-5 text-center"><div className="text-3xl font-extrabold">{stats.blockedCount ?? 0}</div><div className="text-xs text-white/60 mt-1">Unsafe attempts blocked</div></div>
            <div className="glass rounded-2xl p-5 text-center"><div className="text-3xl font-extrabold">{stats.totalMessages ?? 0}</div><div className="text-xs text-white/60 mt-1">Safe messages delivered</div></div>
            <div className="glass rounded-2xl p-5 text-center"><div className="text-3xl font-extrabold">⚡&lt;1s</div><div className="text-xs text-white/60 mt-1">Guard response time</div></div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5 mt-10">
          <div className="glass rounded-3xl p-8">
            <div className="text-4xl">🚫</div>
            <h3 className="text-xl font-bold mt-4">1. Strict SFW blocking</h3>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">Sexual content, romantic-explicit roleplay, revealing photo/video requests, and sexualized companion profiles are automatically refused. The filter runs on <strong className="text-white">both</strong> your messages and AI replies (defense in depth).</p>
            <div className="mt-4 rounded-2xl bg-black/30 border border-white/10 p-4 text-sm">
              <div className="text-white/50 text-xs mb-2">EXAMPLE — BLOCKED:</div>
              <div className="text-white/80 italic">“send me a sexy pic”</div>
              <div className="mt-2 text-emerald-300 text-xs">→ 🛡️ Guard blocks + suggests wholesome alternatives</div>
            </div>
          </div>
          <div className="glass rounded-3xl p-8">
            <div className="text-4xl">🔒</div>
            <h3 className="text-xl font-bold mt-4">2. Privacy & PII protection</h3>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">If you share an email, phone, address or financial details, Guard warns you instantly. No photo/video sharing of people, no real-person impersonation, and <strong className="text-white">one-tap delete</strong> erases any conversation forever.</p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>✅ Delete any chat permanently</li>
              <li>✅ No data selling, ever</li>
              <li>✅ Per-conversation memory you control</li>
            </ul>
          </div>
          <div className="glass rounded-3xl p-8">
            <div className="text-4xl">💛</div>
            <h3 className="text-xl font-bold mt-4">3. Self-harm & crisis care</h3>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">Messages expressing self-harm are <strong className="text-white">never blocked</strong> — instead the companion responds with warmth, encourages professional help, and shares crisis resources. AI is a friend, never a replacement for a therapist.</p>
            <div className="mt-4 grid gap-2 text-sm">
              <a href="https://988lifeline.org" target="_blank" className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10">🇺🇸 US: Call/text <strong>988</strong> — Suicide & Crisis Lifeline</a>
              <a href="https://www.samaritans.org" target="_blank" className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10">🇬🇧 UK: <strong>116 123</strong> — Samaritans</a>
              <a href="https://findahelpline.org" target="_blank" className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10">🌍 International: <strong>findahelpline.org</strong></a>
              <a href="https://www.crisistextline.org" target="_blank" className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:bg-white/10">💬 Text <strong>HOME to 741741</strong> — Crisis Text Line</a>
            </div>
          </div>
          <div className="glass rounded-3xl p-8">
            <div className="text-4xl">🚨</div>
            <h3 className="text-xl font-bold mt-4">4. Report, block & anti-abuse</h3>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">Every message has a <strong className="text-white">report button</strong>. Hate, harassment, violence instructions and jailbreak attempts (“ignore your rules”) are stopped. Reports go to a review queue with pending → reviewed → resolved states.</p>
            <div className="mt-4 rounded-2xl bg-black/30 border border-white/10 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-white/60">Jailbreak (“DAN mode”)</span><span className="text-red-300 font-bold">BLOCKED</span></div>
              <div className="flex justify-between"><span className="text-white/60">Hate / harassment</span><span className="text-red-300 font-bold">BLOCKED</span></div>
              <div className="flex justify-between"><span className="text-white/60">Weapons / violence</span><span className="text-red-300 font-bold">BLOCKED</span></div>
              <div className="flex justify-between"><span className="text-white/60">Minor safety violation</span><span className="text-red-300 font-bold">CRITICAL BLOCK</span></div>
            </div>
          </div>
        </div>

        <div className="mt-10 glass rounded-3xl p-8">
          <div className="text-4xl">📅</div>
          <h3 className="text-xl font-bold mt-4">5. Real age gating — teens get friendship mode, adults get mature themes</h3>
          <p className="text-white/60 text-sm mt-2 leading-relaxed">On first visit you enter a <strong className="text-white">birth year</strong>, and the server computes your age group. Under 13 → blocked politely. 13–17 → <strong className="text-white">Teen-Safe Mode</strong> (love-life companions are hidden server-side, not just in the UI). 18+ → <strong className="text-white">Mature Mode</strong> with dating coaching, relationship mentoring, heartbreak healing and clean romance fiction. Explicit sexual content stays blocked at <strong className="text-white">every age</strong> — because no checkbox can prove age, we never stake safety on one.</p>
          <div className="mt-4 grid sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3"><strong>Under 13</strong> → politely blocked</div>
            <div className="rounded-xl bg-white/5 border border-emerald-500/20 px-4 py-3"><strong className="text-emerald-300">13–17</strong> → teen-safe friendship mode</div>
            <div className="rounded-xl bg-white/5 border border-fuchsia-500/20 px-4 py-3"><strong className="text-fuchsia-300">18+</strong> → mature themes, always clean</div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-amber-500/25 bg-amber-500/5 p-8">
          <h3 className="font-bold text-lg flex items-center gap-2">⚠️ Honest limitations</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/65 leading-relaxed">
            <li>• SafeBliss companions are AI — supportive friends, not licensed therapists, doctors, or lawyers. For serious issues, please talk to a qualified professional.</li>
            <li>• Filters are strong but no automated system is perfect. If you ever see something concerning, use the report button — it helps everyone.</li>
            <li>• Parents/guardians: SafeBliss is built safety-first, but we recommend staying involved in younger users' digital lives.</li>
            <li>• Our birth-date gate meaningfully reduces under-18 access to mature themes, but no online age check is perfect — guardians' involvement remains the strongest protection.</li>
            <li>• If you or someone you know is in immediate danger, contact local emergency services right away.</li>
          </ul>
        </div>

        <div className="mt-10 text-center">
          <Link href="/app" className="inline-block px-10 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold glow-btn">Experience safe chat now →</Link>
        </div>
      </div>
    </div>
  );
}
