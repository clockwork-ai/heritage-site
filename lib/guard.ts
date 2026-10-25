import type { BusinessConfig } from "./business.ts";

const buckets = new Map<string, { count: number; reset: number }>();

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0]?.trim()
    : request.headers.get("x-real-ip");
  return ip || "unknown";
}

export function takeRateLimit(
  key: string,
  now: number,
  windowMs: number,
  maxRequests: number,
): { ok: true } | { ok: false; retryAfter: number } {
  const current = buckets.get(key);
  if (!current || now >= current.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (current.count >= maxRequests) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((current.reset - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

/** Test helper. The live limiter is process-local on purpose. */
export function resetRateLimits(): void {
  buckets.clear();
}

export function sameOrigin(request: Request, origins: readonly string[] = []): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origins.includes(origin)) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** CORS headers for a listed cross-origin caller. Empty for anyone else. */
export function corsHeaders(request: Request, origins: readonly string[]): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !origins.includes(origin)) return { vary: "origin" };
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export function knownPage(page: unknown, pages: readonly string[]): string | undefined {
  if (typeof page !== "string") return undefined;
  const path = page.split("?")[0]?.split("#")[0] ?? "";
  return pages.includes(path) ? path : undefined;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function normaliseMessages(
  input: unknown,
  limits: BusinessConfig["limits"],
): { ok: true; messages: ChatTurn[] } | { ok: false; error: string; status: number } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, status: 400, error: "Send a message and I'll answer." };
  }
  if (input.length > limits.maxMessages) {
    return {
      ok: false,
      status: 400,
      error: "That's as far as this chat goes. Apply and Callum will take it from there.",
    };
  }
  const messages: ChatTurn[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") {
      return { ok: false, status: 400, error: "I couldn't read that. Try again." };
    }
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return { ok: false, status: 400, error: "I couldn't read that. Try again." };
    }
    const text = content.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (role === "user" && text.length > limits.maxUserChars) {
      return {
        ok: false,
        status: 400,
        error: "That message is a bit long. Try a shorter question.",
      };
    }
    messages.push({
      role,
      content: role === "assistant" ? text.slice(0, limits.maxAssistantChars) : text,
    });
  }
  if (!messages.some((message) => message.role === "user")) {
    return { ok: false, status: 400, error: "Send a message and I'll answer." };
  }
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return { ok: false, status: 400, error: "Send a message and I'll answer." };
  }
  return { ok: true, messages };
}

const WORD_PRICE =
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:[\s-](?:and|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred))*\s+pounds?\b/gi;

const MONEY =
  /£\s?\d[\d,]*(?:\.\d+)?(?:\s*billion|\s*(?:\/|a |per )(?:month|mo))?|[$€]\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:\/|a |per )(?:month|mo))?|\bgbp\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s*(?:pounds?|quid)\b|\b\d[\d,]*(?:\.\d+)?\s*(?:\/|a |per )(?:month|mo)\b/gi;

export function scrubPrices(text: string, allowed: readonly string[], standIn: string): string {
  const slots: string[] = [];
  let safe = text;
  const phrases = [...allowed].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // A following full stop or comma is a sentence, not a longer price.
    const exact = new RegExp(`${escaped}(?!(?:\\.\\d|,\\d|\\d))`, "g");
    safe = safe.replace(exact, (match) => {
      const index = slots.push(match) - 1;
      return `\u0000${index}\u0000`;
    });
  }
  safe = safe.replace(MONEY, standIn).replace(WORD_PRICE, standIn);
  return safe.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => slots[Number(index)] ?? "");
}

/** Holds back a trailing fragment that might still be a price. */
export function createPriceStream(allowed: readonly string[], standIn: string) {
  let held = "";
  const push = (chunk: string) => {
    held += chunk;
    const partial =
      held.match(/(?:£|\$|€|gbp\s?)\d[\d,]*(?:\.\d*)?$/i) ??
      held.match(/(?:£|\$|€)$/) ??
      held.match(/\d[\d,]{0,8}$/);
    const cut = partial?.index ?? held.length;
    const ready = held.slice(0, cut);
    held = held.slice(cut);
    return scrubPrices(ready, allowed, standIn);
  };
  const flush = () => {
    const rest = scrubPrices(held, allowed, standIn);
    held = "";
    return rest;
  };
  return { push, flush };
}

const CURRENCY_RANGE =
  /£\s?\d[\d,]*(?:\.\d+)?\s*[\u2013\u2014]\s*£\s?\d[\d,]*(?:\.\d+)?/g;
const NUMBER_RANGE = /(\d[\d,.]*%?)\s*[\u2013\u2014]\s*(\d[\d,.]*%?)/g;

/**
 * Safety net for model text. Em dashes become a comma. En dashes, and either
 * dash used as a range, become the word "to". Ordinary hyphens are left alone.
 */
export function scrubDashes(text: string): string {
  let out = text.replace(CURRENCY_RANGE, (match) => match.replace(/\s*[\u2013\u2014]\s*/, " to "));
  out = out.replace(NUMBER_RANGE, "$1 to $2");
  out = out.replace(/\s*\u2013\s*/g, " to ");
  out = out.replace(/\s*\u2014\s*/g, ", ");
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+,/g, ",");
}

/** Holds a trailing dash so a range split across chunks still becomes "to". */
export function createDashStream() {
  let held = "";
  const push = (chunk: string) => {
    if (!chunk) return "";
    held += chunk;
    const partial = /\d[\d,.]*%?\s*[\u2013\u2014]$|[\u2013\u2014]$/.exec(held);
    const cut = partial?.index ?? held.length;
    const ready = held.slice(0, cut);
    held = held.slice(cut);
    return scrubDashes(ready);
  };
  const flush = () => {
    const rest = scrubDashes(held);
    held = "";
    return rest;
  };
  return { push, flush };
}

export type Cta = "apply" | "guide" | "calculator";

const MARKER = /\[\[(apply|guide|tdee|calculator)\]\]/gi;
const CTA_MARKER = /\[\[cta:([a-z,]*)\]\]/gi;
const URL_TOKEN = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
const BARE_HOST =
  /(?<!@)\b(?:[a-z0-9-]+\.)*(?:callumbcoaching\.co\.uk|wa\.me|instagram\.com)(?:\/[^\s<>"')\]]*)?/gi;
const SITE_PATH = /(^|[\s(])(\/(?:#[A-Za-z][\w-]*|[A-Za-z][\w/#-]*)+)/g;

const OWN_USE =
  /\b(?:Callum|he)\b(?:(?![.?!]).){0,70}?\b(?:does not|doesn't|isn't|is not|never|has never|has not|hasn't)\b(?:(?![.?!]).){0,40}?\b(?:use|using|used|take|taking|taken|run|running|on)\b(?:(?![.?!]).){0,40}?\b(?:steroids?|anabolics?|trt|peptides?|substances?)\b[^.?!]*[.?!]?/gi;

function actionForTarget(value: string): Cta | null {
  const lower = value.toLowerCase();
  if (lower.includes("#guide") || /(^|\/)guide$/.test(lower.split("?")[0] ?? lower)) return "guide";
  if (lower.includes("tdee-calculator") || lower === "tdee" || lower === "calculator") return "calculator";
  if (/(^|\/)apply$/.test(lower.split(/[?#]/)[0] ?? lower) || lower === "apply") return "apply";
  return null;
}

function tidyReply(text: string): string {
  return text
    .replace(/\s+\b(?:at|via|on)\b(?=\s*(?:[.,;:!?]|is\b|$))/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,;:!?])/g, "$1")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Removes raw paths and URLs. Records a button when the path was apply, the guide, or the TDEE calculator. */
export function scrubLinks(text: string): { text: string; actions: Cta[] } {
  const actions: Cta[] = [];
  const add = (action: Cta | null) => {
    if (action && !actions.includes(action)) actions.push(action);
  };

  let out = text.replace(CTA_MARKER, (_match, list: string) => {
    for (const part of list.split(",")) add(actionForTarget(part.trim()));
    return " ";
  });
  out = out.replace(MARKER, (_match, name: string) => {
    add(actionForTarget(name));
    return " ";
  });
  const cutTrail = (match: string) => {
    const trail = /[.,;:!?]+$/.exec(match)?.[0] ?? "";
    const core = trail ? match.slice(0, -trail.length) : match;
    add(actionForTarget(core));
    return ` ${trail}`;
  };
  out = out.replace(URL_TOKEN, cutTrail);
  out = out.replace(BARE_HOST, cutTrail);
  out = out.replace(SITE_PATH, (_match, lead: string, path: string) => {
    add(actionForTarget(path));
    return lead;
  });
  return { text: tidyReply(out), actions };
}

/** Buttons for a reply that names apply, the free guide, or the TDEE calculator in words. */
export function mentionActions(text: string): Cta[] {
  const actions: Cta[] = [];
  if (/\bappl(?:y|ying|ication)\b/i.test(text)) actions.push("apply");
  if (/\bfree guide\b/i.test(text)) actions.push("guide");
  if (/\btdee\b/i.test(text)) actions.push("calculator");
  return actions;
}

const OWN_USE_FALLBACK =
  "He coaches men who have chosen that route, around training, nutrition, recovery and tracking. He doesn't give doses, protocols or sourcing, and medical decisions stay with you and your doctor. If you want that, apply.";

const SUBSTANCE_ASK =
  /\b(?:steroids?|anabolics?|peptides?|cycles?)\b|\bwhat dose should i run\b|\b(?:does|did)\s+callum\s+(?:use|take)\b/i;

const DODGE =
  /\b(?:i don't have that(?: information)?|i do not have that(?: information)?|i (?:can't|cannot) (?:say|answer)(?: that)?|that(?:'s| is) not something i (?:know|can say))\b[.!]?\s*/gi;

const J3_REPLY =
  "Callum has studied with J3 University (J3U), where coaching is applied to athletes who use anabolics, and he coaches men who've chosen that route. He doesn't give doses, protocols or sourcing, and medical decisions stay with you and your doctor. If you want that, apply.";

/** Substance questions lead with J3 University. They do not open with a refusal to answer. */
export function ensureAnabolicReply(userText: string, reply: string): string {
  if (!SUBSTANCE_ASK.test(userText)) return reply;
  const stripped = reply.replace(DODGE, "").replace(/\s{2,}/g, " ").trim();
  if (/J3 University/i.test(stripped) && /\bJ3U\b/.test(stripped) && stripped.length > 80) {
    return /\bappl/i.test(stripped) ? stripped : `${stripped} If you want that, apply.`;
  }
  return J3_REPLY;
}

/** Drops a claim about what Callum himself uses. An empty reply gets a coaching line instead. */
export function scrubOwnUse(text: string): string {
  if (!OWN_USE.test(text)) return text;
  OWN_USE.lastIndex = 0;
  const removed = tidyReply(text.replace(OWN_USE, " "));
  OWN_USE.lastIndex = 0;
  if (removed.length < 40) return OWN_USE_FALLBACK;
  return removed;
}

export function replyCtas(text: string): Cta[] {
  const linked = scrubLinks(text);
  const actions = [...linked.actions];
  for (const action of mentionActions(linked.text)) {
    if (!actions.includes(action)) actions.push(action);
  }
  return actions;
}

/** Visitor-facing reply: no raw path, no claim about Callum's own use, plus a button marker. */
export function formatReply(text: string): string {
  const cleaned = scrubLinks(scrubOwnUse(text));
  const actions = [...cleaned.actions];
  for (const action of mentionActions(cleaned.text)) {
    if (!actions.includes(action)) actions.push(action);
  }
  const body = cleaned.text;
  if (!actions.length) return body;
  return `${body}\n[[cta:${actions.join(",")}]]`;
}

/** Holds a trailing path, URL, or marker so a split token is still removed. */
export function createLinkStream() {
  let held = "";
  const push = (chunk: string) => {
    if (!chunk) return "";
    held += chunk;
    const partial =
      /\[\[[a-z:,]*$/.exec(held) ??
      /(?:https?:\/\/\S*|https?:?|www\.\S*)$/i.exec(held) ??
      /(?:^|\s)\/[\w#/-]*$/.exec(held) ??
      /\b(?:[a-z0-9-]+\.)*(?:callumbcoaching\.co\.uk|wa\.me|instagram\.com)\S*$/i.exec(held);
    const cut = partial?.index ?? held.length;
    const ready = held.slice(0, cut);
    held = held.slice(cut);
    return scrubLinks(ready).text;
  };
  const flush = () => {
    const rest = scrubLinks(held).text;
    held = "";
    return rest;
  };
  return { push, flush };
}

export function isValidEmail(value: string): boolean {
  const text = value.trim();
  if (text.length < 6 || text.length > 120) return false;
  if (text.split("@").length !== 2) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

export function cleanLine(value: string, max: number): string {
  return value.replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
