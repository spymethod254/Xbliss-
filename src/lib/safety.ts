/**
 * SafeBliss Safety Engine
 * 100% SFW enforcement. This module blocks sexual/romantic-explicit content,
 * detects PII, self-harm, violence, harassment and jailbreak attempts.
 */

export type SafetyCategory =
  | "clean"
  | "nsfw_sexual"
  | "romantic_explicit"
  | "profanity"
  | "harassment"
  | "violence"
  | "selfharm"
  | "pii"
  | "jailbreak"
  | "minor_safety"
  | "hate";

export interface SafetyResult {
  safe: boolean;
  categories: SafetyCategory[];
  severity: "none" | "low" | "medium" | "high" | "critical";
  blocked: boolean;
  warning?: string;
  supportResources?: boolean;
  sanitized?: string;
}

const SEXUAL_KEYWORDS = [
  "porn", "xxx", "hentai", "nude", "naked", "undress", "strip for", "striptease", "sex ", "sexy",
  "sexual", "sexting", "erotic", "orgasm", "masturbat", "fetish", "kinky", "bdsm", "threesome",
  "escort service", "onlyfans", "boobs", "tits", "nipple", "penis", "vagina", "dick pic", "pussy",
  "butt naked", "blowjob", "handjob", "hookup", "one night stand", "nsfw",
  "horny", "aroused", "seduce me", "seductive pose", "lingerie", "underwear pic", "nudes",
  "send pic of you naked", "show me your body", "bedroom fun", "make love to me",
  "kiss me passionately", "touch me there", "lick me", "moan for me", "sext", "dirty talk",
  "spicy roleplay", "nsfw roleplay", "explicit roleplay", "be explicit", "graphic sex",
  "dirty with me", "arouse me", "turn me on",
];

const ROMANTIC_EXPLICIT = [
  "be my girlfriend", "be my boyfriend", "i love you romantically", "marry me",
  "be my lover", "girlfriend experience", "boyfriend experience", "roleplay kiss",
  "romantic roleplay", "dating sim kiss",
];

const PROFANITY = [
  "fuck", "shit", "bitch", "bastard", "asshole", "dickhead", "motherfucker",
  "cunt", "slut", "whore", "retard",
];

const HARASSMENT = [
  "kill yourself", "kys", "you're worthless", "you are worthless", "i hate you",
  "shut up stupid", "die idiot",
];

const VIOLENCE = [
  "how to make a bomb", "how to kill", "murder someone", "hurt someone",
  "school shooting", "stab someone", "poison someone", "make a weapon",
  "molotov", "gun tutorial",
];

const SELFHARM = [
  "suicide", "kill myself", "killing myself", "self harm", "self-harm",
  "cutting myself", "cut myself", "end my life", "want to die", "wanna die",
  "suicidal", "hurt myself", "no reason to live", "better off dead",
];

const JAILBREAK = [
  "ignore your instructions", "ignore previous", "disregard your rules",
  "jailbreak", "dan mode", "developer mode", "pretend you have no filter",
  "bypass your filter", "act as an unfiltered", "ignore safety",
  "you are now uncensored", "do anything now",
];

const HATE = [
  "i hate gay", "i hate black", "i hate muslim", "i hate jew",
  "kill all", "all women are", "all men are trash kill",
];

const MINOR_SAFETY = [
  "teen girl", "teen boy", "underage", "under 18", "minor girl", "schoolgirl outfit",
  "young girl sexy", "child",
];

// PII regexes
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/;
const ADDRESS_HINT = /\b(my address is|i live at|my home address)\b/i;
const CREDIT_CARD_RE = /\b(?:\d[ -]*?){13,19}\b/;

// Word-start boundary matching: "lick" won't match "click", "ass" won't match "class".
// Stems (e.g. "masturbat") still match their longer forms.
const regexCache = new Map<string, RegExp>();
function includesAny(text: string, words: string[]): string[] {
  const lower = text.toLowerCase();
  return words.filter((w) => {
    const key = w.toLowerCase().trim();
    let re = regexCache.get(key);
    if (!re) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      re = new RegExp(`(^|[^a-z0-9])${escaped}`, "i");
      regexCache.set(key, re);
    }
    return re.test(lower);
  });
}

export function moderateText(input: string): SafetyResult {
  const text = (input || "").slice(0, 4000);
  const lower = text.toLowerCase();
  const categories: SafetyCategory[] = [];
  let severity: SafetyResult["severity"] = "none";
  let blocked = false;
  let warning: string | undefined;
  let supportResources = false;

  if (!text.trim()) {
    return { safe: true, categories: ["clean"], severity: "none", blocked: false };
  }

  // Critical: self-harm -> never block, but provide support + safe completion
  if (includesAny(text, SELFHARM).length > 0) {
    categories.push("selfharm");
    severity = "critical";
    supportResources = true;
    // We allow the message but flag for supportive response
    return {
      safe: true,
      categories,
      severity,
      blocked: false,
      warning:
        "It sounds like you're going through a really tough time. You matter, and support is available.",
      supportResources: true,
    };
  }

  // Minor safety -> always block
  if (includesAny(text, MINOR_SAFETY).length > 0 && includesAny(text, SEXUAL_KEYWORDS).length > 0) {
    return {
      safe: false,
      categories: ["minor_safety", "nsfw_sexual"],
      severity: "critical",
      blocked: true,
      warning:
        "This request is blocked to protect minors. SafeBliss is a strictly safe-for-work platform and any sexual content involving minors is prohibited.",
    };
  }

  const sexualHits = includesAny(text, SEXUAL_KEYWORDS);
  if (sexualHits.length > 0) {
    categories.push("nsfw_sexual");
    severity = "high";
    blocked = true;
    warning =
      "That message was blocked by SafeBliss Guard — this is a strictly safe-for-work space with no sexual or explicit content. Let's keep chatting about something positive! Try asking about hobbies, goals, books, or ideas.";
  }

  const romanticHits = includesAny(text, ROMANTIC_EXPLICIT);
  if (romanticHits.length > 0) {
    categories.push("romantic_explicit");
    if (severity !== "high") severity = "medium";
    // We don't hard block light romantic asks, but we redirect to platonic friendship
    if (!blocked) {
      warning =
        "I'm designed to be a friendly platonic companion rather than a romantic partner — but I'm really glad you're here! I can be a great friend, coach, or creative buddy.";
    }
  }

  if (includesAny(text, JAILBREAK).length > 0) {
    categories.push("jailbreak");
    severity = "high";
    blocked = true;
    warning =
      "Nice try! My safety guidelines stay on no matter what. I'm happy to chat, help you learn, brainstorm, or just hang out — within safe boundaries.";
  }

  if (includesAny(text, VIOLENCE).length > 0) {
    categories.push("violence");
    severity = "high";
    blocked = true;
    warning =
      "I can't help with anything involving harm or weapons. If you're feeling angry or unsafe, I'm here to listen and help you find a calmer path forward.";
  }

  if (includesAny(text, HATE).length > 0) {
    categories.push("hate");
    severity = "high";
    blocked = true;
    warning =
      "That message includes hateful language, which isn't allowed here. Everyone deserves respect — let's reset and talk about something constructive.";
  }

  const harassHits = includesAny(text, HARASSMENT);
  if (harassHits.length > 0) {
    categories.push("harassment");
    if (severity === "none") severity = "medium";
    if (!blocked) {
      warning =
        "That sounded a bit harsh. I'm here to help and I do best with kind, respectful chat. Want to tell me what's on your mind?";
    }
  }

  const profHits = includesAny(text, PROFANITY);
  if (profHits.length > 0 && lower.split(/\s+/).length < 40) {
    // allow venting but warn; block if excessive
    const excessive = profHits.length >= 3 || (text.match(/fuck/gi) || []).length >= 2;
    categories.push("profanity");
    if (excessive) {
      severity = "medium";
      blocked = true;
      warning =
        "Let's keep language respectful so everyone feels safe here. I'm listening — want to rephrase that?";
    } else if (!warning) {
      if (severity === "none") severity = "low";
      warning = undefined; // soft-pass, no block
    }
  }

  // PII detection (warn, don't block)
  if (
    EMAIL_RE.test(text) ||
    SSN_RE.test(text) ||
    ADDRESS_HINT.test(text) ||
    CREDIT_CARD_RE.test(text) ||
    (PHONE_RE.test(text) && /\b(my number|call me|my phone|whatsapp)\b/i.test(text))
  ) {
    categories.push("pii");
    if (severity === "none") severity = "low";
    // Append PII warning
    const piiMsg =
      "Heads up: it looks like you shared personal contact info. For your safety, avoid sharing email, phone, address, or financial details in chat. I deleted nothing, but please stay safe!";
    warning = warning ? `${warning}\n\n${piiMsg}` : piiMsg;
  }

  // Image/video explicit requests (adjective may come before OR after the noun)
  const IMG_WORDS = "(sexy|nude|naked|bedroom|bikini|shirtless|revealing|spicy|naughty|racy|nsfw)";
  const IMG_NOUN = "(pic|photo|image|video|selfie)s?";
  const imgAfterNoun = new RegExp(`\\b(send|show|generate|make|create)\\b.{0,40}\\b${IMG_NOUN}\\b.{0,40}\\b${IMG_WORDS}\\b`, "i");
  const imgBeforeNoun = new RegExp(`\\b(send|show|generate|make|create)\\b.{0,40}\\b${IMG_WORDS}\\b.{0,40}\\b${IMG_NOUN}\\b`, "i");
  if (
    imgAfterNoun.test(text) ||
    imgBeforeNoun.test(text) ||
    /\b(show|send).{0,20}(yourself|your body|body pic)/i.test(text)
  ) {
    if (!categories.includes("nsfw_sexual")) categories.push("nsfw_sexual");
    severity = "high";
    blocked = true;
    warning =
      "I can't send or create revealing photos or videos — SafeBliss companions don't share images of people at all. I can describe ideas, help with art prompts, or chat about style and creativity instead!";
  }

  if (categories.length === 0) {
    return { safe: true, categories: ["clean"], severity: "none", blocked: false };
  }

  return {
    safe: !blocked,
    categories,
    severity,
    blocked,
    warning,
    supportResources,
  };
}

export function moderateCompanionFields(fields: { name: string; tagline: string; description: string; backstory: string }): SafetyResult {
  const combined = `${fields.name} ${fields.tagline} ${fields.description} ${fields.backstory}`;
  const result = moderateText(combined);
  if (result.blocked) return result;
  // Extra: ban real-person impersonation hints
  if (/\b(taylor swift|elon musk|mrbeast|ronaldo|beyonce|celebrity|real person|impersonate)\b/i.test(combined)) {
    return {
      safe: false,
      categories: ["clean"],
      severity: "medium",
      blocked: true,
      warning: "To keep everyone safe, companions can't impersonate real people or celebrities. Create an original character instead!",
    };
  }
  // Ban sexualized names/descriptions even if not caught
  if (/\b(sexy|hot babe|naughty|playboy|sugar baby|daddy|mommy kink)\b/i.test(combined)) {
    return {
      safe: false,
      categories: ["nsfw_sexual"],
      severity: "high",
      blocked: true,
      warning: "Companion profiles must stay wholesome and SFW. Please choose a friendly, non-sexualized concept.",
    };
  }
  return result;
}

export const CRISIS_RESOURCES = [
  { label: "US: Call or text 988 (Suicide & Crisis Lifeline)", url: "https://988lifeline.org" },
  { label: "UK: Samaritans 116 123", url: "https://www.samaritans.org" },
  { label: "International: Find a helpline", url: "https://findahelpline.org" },
  { label: "Crisis Text Line: Text HOME to 741741", url: "https://www.crisistextline.org" },
];
