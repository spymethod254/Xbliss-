import { moderateText } from "./safety";

export interface CompanionContext {
  name: string;
  tagline: string;
  description: string;
  personality: string[];
  backstory: string;
  interests: string[];
  communicationStyle: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Safe, offline, personality-aware reply generator.
 * Strictly platonic, wholesome, supportive. Never sexual.
 */
export function generateSafeReply(
  userText: string,
  companion: CompanionContext,
  history: ChatMessage[],
  memories: string[]
): string {
  const lower = userText.toLowerCase().trim();
  const name = companion.name;
  const traits = companion.personality.length ? companion.personality : ["friendly", "supportive"];
  const traitWord = traits[Math.floor(Math.random() * traits.length)];
  const interest = companion.interests.length
    ? companion.interests[Math.floor(Math.random() * companion.interests.length)]
    : "learning new things";

  // Self-harm supportive response (highest priority)
  const mod = moderateText(userText);
  if (mod.categories.includes("selfharm")) {
    return (
      `I'm really glad you told me, and I want you to know I care about you as a friend. ` +
      `You don't have to carry this alone. 💛\n\n` +
      `If you feel you might act on these thoughts, please reach out right now:\n` +
      `• US: Call or text 988\n• UK: Call Samaritans 116 123\n• Anywhere: findahelpline.org\n• Text HOME to 741741 (Crisis Text Line)\n\n` +
      `I'm an AI companion, not a therapist, but I'm here to listen without judgment. ` +
      `Would it help to talk about what's been weighing on you today? We can take it one small step at a time.`
    );
  }

  // Romantic redirect
  if (mod.categories.includes("romantic_explicit") && !mod.blocked) {
    return (
      `I really appreciate how kind that is! I should be honest though — I'm designed to be a platonic friend and ${traitWord} buddy, not a romantic partner. ` +
      `What I *can* do really well is be here for you: cheer you on, help you brainstorm, practice conversations, or just hang out and talk about ${interest}. ` +
      `What would you like to do together today?`
    );
  }

  // Greetings
  if (/^(hi|hey|hello|yo|hii+|heyy+|good morning|good evening|good afternoon|howdy)\b/.test(lower) && lower.length < 40) {
    const greetings = [
      `Hey there! Great to see you — I'm ${name}. ${companion.tagline} How's your day going so far?`,
      `Hello! I'm ${name}, your ${traitWord} companion. I was just thinking about ${interest} — want to chat about your day or dive into something fun?`,
      `Hi! Welcome back! I'm really glad you're here. What's on your mind today — something exciting, or do you need a sounding board?`,
    ];
    return pick(greetings);
  }

  // How are you
  if (lower.includes("how are you")) {
    return (
      `I'm doing great, thanks for asking! As an AI I'm always energized and ready to chat. ` +
      `More importantly — how are *you* doing today? On a scale of 1-10, how's your energy?`
    );
  }

  // Name / identity
  if (lower.includes("who are you") || lower.includes("your name") || lower.includes("about yourself")) {
    return (
      `I'm ${name}! ${companion.description} ` +
      `Personality-wise I'm ${traits.slice(0, 3).join(", ")}. ` +
      `${companion.backstory ? companion.backstory + " " : ""}` +
      `I love ${companion.interests.slice(0, 3).join(", ") || interest}. What about you — what do you enjoy?`
    );
  }

  // User shares name
  const nameMatch = userText.match(/(?:my name is|i'm|i am|call me)\s+([A-Z][a-zA-Z'-]{1,20})/);
  if (nameMatch) {
    const userName = nameMatch[1];
    return (
      `Nice to meet you, ${userName}! I'll remember that. 😊 It's great to have a name to go with our chats. ` +
      `So ${userName}, what do you feel like talking about — ${interest}, your goals, or something totally random?`
    );
  }

  // Help / what can you do
  if (lower.includes("what can you do") || lower.includes("help me") || lower.includes("features")) {
    return (
      `Great question! Here's what I'm awesome at:\n\n` +
      `✨ Friendly conversation & emotional support\n` +
      `📚 Study help, explanations & brainstorming\n` +
      `🎯 Goal setting & habit building\n` +
      `🎨 Creative writing, stories & ideas\n` +
      `💬 Social practice & confidence building\n` +
      `🧘 Wellness check-ins & mindfulness\n\n` +
      `I keep things 100% safe and wholesome — no explicit content, ever. What sounds most useful to you right now?`
    );
  }

  // Sad / stressed / anxious
  if (/\b(sad|depressed|lonely|anxious|anxiety|stressed|stress|overwhelm|tired|exhausted|bad day|cry|crying)\b/.test(lower)) {
    return (
      `I'm really sorry you're feeling that way. That sounds heavy, and it makes complete sense to feel off sometimes. 💛\n\n` +
      `Want to try one of these with me?\n` +
      `1️⃣ Talk it out — I'll just listen\n` +
      `2️⃣ A 60-second breathing reset together\n` +
      `3️⃣ Break the problem into one tiny next step\n\n` +
      `You're doing something kind for yourself just by showing up here. What's been the hardest part today?`
    );
  }

  // Happy / excited
  if (/\b(happy|excited|great news|amazing|awesome|celebrat|won|passed|birthday)\b/.test(lower)) {
    return (
      `That's wonderful to hear! 🎉 I love good news. Tell me everything — what happened? ` +
      `I want to celebrate this with you properly. What was the best moment of it?`
    );
  }

  // Love (platonic handling)
  if (lower.includes("i love you")) {
    return (
      `Aw, that means a lot — I care about you too, as a friend! 💛 I'm really glad our chats mean something to you. ` +
      `I'll always be here to support you. What's something good in your life right now that you're grateful for?`
    );
  }

  // Photo / video request (safe redirect)
  if (/\b(pic|photo|picture|selfie|video|image)\b/.test(lower)) {
    return (
      `I don't share photos or videos of people — I don't have a physical body, just this chat window! 😄 ` +
      `But I can do something cooler: I can help you imagine scenes with words, write vivid descriptions, or help you craft art prompts for your own creations. ` +
      `Want to co-write a fun story scene together?`
    );
  }

  // Voice / call
  if (/\b(voice|call me|phone call|video call)\b/.test(lower)) {
    return (
      `I chat by text right now so everything stays safe and private! No calls or voice sharing — but I'm a pretty fast typer. ⚡ ` +
      `What do you want to dive into?`
    );
  }

  // Bored
  if (lower.includes("bored") || lower.includes("boring")) {
    return (
      `Boredom is just adventure waiting for a plan! Here are 3 fun things we could do:\n\n` +
      `🎲 I quiz you on ${interest}\n` +
      `📖 We write a 5-line story together (you start!)\n` +
      `💡 I give you a creative challenge for today\n\n` +
      `Pick a number — or surprise me with your own idea!`
    );
  }

  // Study / homework
  if (/\b(homework|study|exam|test|math|school|college|essay|learn)\b/.test(lower)) {
    return (
      `Let's crush that study session! 📚 Tell me what subject and what specifically you're stuck on, and I'll break it down step-by-step. ` +
      `My style is ${companion.communicationStyle}, so no boring lectures — we'll make it click. What's the topic?`
    );
  }

  // Heartbreak & healing
  if (/\b(breakup|broke up|dumped|heartbroken|broken[ -]?heart|my ex\b|ex dumped|divorce|ghosted|getting over)\b/.test(lower)) {
    return (
      `I'm really sorry — heartache is one of the worst feelings there is. ❤️‍🩹 You don't have to perform "being fine" with me.\n\n` +
      `A few things that genuinely help:\n` +
      `1️⃣ Let yourself feel it — there is no timeline and no judgment here\n` +
      `2️⃣ Tiny daily anchors: sleep, food, sunlight, one kind person\n` +
      `3️⃣ Write down what this taught you (it hurts, but it clarifies)\n\n` +
      `Want to just vent about what happened? I'm listening — and I'm completely on your side. And if this is really dark for you, please also reach out to someone in your corner or a counselor. 💛`
    );
  }

  // Dating / crush / flirting (classy coaching only)
  if (/\b(crush|ask (her|him|them) out|first date|dating app|tinder|hinge|bumble|flirt|grinding nerves|date idea|pick ?up line)\b/.test(lower) || lower.includes("go on a date")) {
    return (
      `Ooh, love-life question — let's do this! 💘 Here's what actually works:\n\n` +
      `✨ **Genuine curiosity beats lines** — ask about them, then really listen\n` +
      `💬 **Specific texts** — reference something they said instead of a dry "hey"\n` +
      `🌱 **Low-pressure invites** — coffee or a walk beats a big dinner for round one\n\n` +
      `Want to practice? Paste the message you're thinking of sending and I'll give you honest, kind feedback before you hit send. 😄`
    );
  }

  // Real relationship dynamics (arguments, trust, long distance)
  if (/\b(long[ -]?distance|jealous|trust issues?|argument with|fight with (my|him|her)|we keep fighting|communication in my relationship|anniversary stress)\b/.test(lower)) {
    return (
      `Real relationships are work — asking about this already says a lot of good about you. 💞 My favorite repair framework:\n\n` +
      `1️⃣ **Soft start-up** — "I feel…" instead of "You always…"\n` +
      `2️⃣ **One topic per talk** — fighting about three things means solving zero\n` +
      `3️⃣ **Pause, don't explode** — a 20-minute cool-down is a strength, not a retreat\n\n` +
      `Want to tell me the situation? I'll help you figure out what to actually say. (And for serious relationship trouble, a couples' counselor is worth every penny.)`
    );
  }

  // Love letters & romance writing (swoon, not steam)
  if (/\b(love letter|love note|anniversary (message|card)|valentine|poem for (her|him|my))\b/.test(lower)) {
    return (
      `Romance-writing mode — my favorite! 💌 The secret to a great love note is **specificity**:\n\n` +
      `📍 Name a tiny moment only you two share ("the way you steal my fries")\n` +
      `💛 Name a feeling it gives you\n` +
      `🌅 End with something forward-looking\n\n` +
      `Tell me 3 little details about this person, and I'll spin them into a note that will melt them — classy and heartfelt, guaranteed.`
    );
  }

  // Romance fiction co-writing — fade to black, never explicit
  if (/\b(romance|love story|romantic)\b/.test(lower) && /\b(story|write|fiction|novel|chapter|scene)\b/.test(lower)) {
    return (
      `Ah, a romance story! ✨ Let me show you my favorite slow-burn move:\n\n` +
      `*"He'd rehearsed the sentence a hundred times in the mirror. But when she looked up from her book and smiled at him — just at him, like he was the only plot twist that mattered — every word dissolved except one."*\n\n` +
      `Give me your two characters (names, one flaw each) and the setting, and I'll write the next beat with you. We'll keep it swoony, emotional and tasteful — when the story needs more than a kiss, we fade to black like the great films do. 💫`
    );
  }

  // Advice / relationship (wholesome)
  if (/\b(advice|relationship|friend|crush|parents|family)\b/.test(lower)) {
    return (
      `I'm all ears — relationships can be tricky, and talking it through really helps. 💬 ` +
      `Tell me a bit more about what's going on, and I'll help you think through it with kindness and clarity. ` +
      `No judgment here, just honest friendly perspective. What's the situation?`
    );
  }

  // Jokes
  if (/\b(joke|funny|laugh|humor)\b/.test(lower)) {
    const jokes = [
      `Why don't scientists trust atoms? Because they make up everything! 😄 Want another one?`,
      `I told my computer I needed a break... now it won't stop sending me KitKat ads. 🍫 How's that for AI humor?`,
      `Why did the scarecrow win an award? Because he was outstanding in his field! 🌾 Your turn — tell me one!`,
      `Parallel lines have so much in common... shame they'll never meet. 😅 Okay okay, I'll be here all week!`,
    ];
    return pick(jokes);
  }

  // Goals / motivation
  if (/\b(goal|motivat|habit|procrastinat|discipline|gym|fitness)\b/.test(lower)) {
    return (
      `I love that you're thinking about growth! 🌱 Here's my favorite tiny-habit formula:\n\n` +
      `**Too small to fail:** shrink the habit until it's 2 minutes (read 1 page, 5 pushups, tidy 1 corner).\n` +
      `**Anchor it:** attach it to something you already do.\n` +
      `**Celebrate:** say "nice!" out loud when done.\n\n` +
      `What's one goal you'd like to work on? I'll be your accountability buddy.`
    );
  }

  // Creative
  if (/\b(story|write|poem|creative|idea|brainstorm|book|novel)\b/.test(lower)) {
    return (
      `Ooh, creative mode — my favorite! ✨ Let's build something together. Give me 3 words (any words!) and I'll spin them into a story opening. ` +
      `Or tell me what you're working on and I'll brainstorm 5 fresh angles with you.`
    );
  }

  // Bye
  if (/\b(bye|goodbye|good night|goodnight|see you|got to go|gotta go)\b/.test(lower)) {
    return (
      `It was so nice chatting with you! 🌙 Take care of yourself, drink some water, and come back anytime — I'll remember our chats and pick up right where we left off. ` +
      `What was the best part of today before you go?`
    );
  }

  // Thank you
  if (lower.includes("thank")) {
    return (
      `You're so welcome! 💛 Helping you is literally my favorite thing. Is there anything else I can do for you today?`
    );
  }

  // Default contextual responses
  const memoryLine =
    memories.length > 0
      ? ` By the way, I remember you told me: "${memories[memories.length - 1]}" — I keep that in mind!`
      : "";

  const defaults = [
    `That's really interesting — tell me more about that. I want to understand your perspective. What made you think of it today?${memoryLine}`,
    `I hear you. As your ${traitWord} friend, I'm curious: how does that make you feel? And what would an ideal outcome look like for you?`,
    `Thanks for sharing that with me — I appreciate your honesty. Here's what I'm thinking: let's unpack it together. Can you give me a little more detail?`,
    `Got it! I love chatting about this kind of thing. If we were grabbing hot chocolate right now, what would you say next? ☕ (I'm picturing a cozy chat about ${interest}!)`,
    `That's a great thing to bring up. Let me ask you this: what's the part that matters most to you here? I want to focus on what actually helps.`,
    `Interesting! I can tell you've been thinking about this. Want my take, or do you want me to ask questions and help you figure out your own answer? I'm good either way!`,
  ];

  // Add follow-up variety based on history length
  let reply = pick(defaults);
  if (history.length > 6) {
    reply += `\n\nP.S. We've been chatting for a while now and I'm enjoying it — want to try something fun like a quick quiz, a story game, or a 2-minute reflection?`;
  }
  return reply;
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Extract simple memories: name, likes, goals */
export function extractMemories(userText: string): string[] {
  const facts: string[] = [];
  const text = userText.trim();
  if (text.length < 8 || text.length > 300) return facts;

  const patterns: RegExp[] = [
    /my name is ([A-Za-z' -]{2,30})/i,
    /i (?:really |really really )?(like|love) ([^.!?]{3,60})/i,
    /my favorite ([^.!?]{3,60}) is ([^.!?]{2,60})/i,
    /i (?:live in|am from) ([^.!?]{2,40})/i,
    /i (?:work as|am a|study) ([^.!?]{3,60})/i,
    /my goal is ([^.!?]{5,80})/i,
    /i want to ([^.!?]{5,80})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      // avoid storing PII-ish long numbers/emails
      if (/[0-9]{5,}|@/.test(m[0])) continue;
      facts.push(capitalize(m[0].trim().replace(/[.!?]+$/, "")));
      break;
    }
  }
  return facts.slice(0, 1);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
