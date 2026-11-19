// Forwards an application to Formspree after a consent check.
// Form mvzjlroq is public, so the pages post here instead of calling it directly.
// Drinking, amount, or a GP answer needs healthConsent "yes". Otherwise 422.
// With none of those fields, the rest is forwarded and the box is not required.

import { business } from "../lib/business.ts";
import { clientKey, corsHeaders, sameOrigin, takeRateLimit } from "../lib/guard.ts";
import { cleanText } from "../lib/mailerlite.ts";

const FORMSPREE = "https://formspree.io/f/mvzjlroq";

const LIMITS: Record<string, number> = {
  _subject: 160,
  name: 80,
  contact: 254,
  age: 8,
  goals: 400,
  tried: 2000,
  week: 2000,
  plan: 80,
  reply: 40,
  application: 4000,
  drinking: 200,
  amount: 500,
  gp: 80,
};

function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      ...corsHeaders(request, business.origins),
    },
  });
}

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request, business.origins) });
}

function methodNotAllowed(request: Request): Response {
  return json(request, { ok: false }, 405);
}

export function GET(request: Request): Response {
  return methodNotAllowed(request);
}

export function PUT(request: Request): Response {
  return methodNotAllowed(request);
}

export function PATCH(request: Request): Response {
  return methodNotAllowed(request);
}

export function DELETE(request: Request): Response {
  return methodNotAllowed(request);
}

export function HEAD(request: Request): Response {
  return methodNotAllowed(request);
}

export function healthGiven(data: Record<string, unknown>): boolean {
  const drinking = cleanText(data.drinking, 200) || cleanText(data.often, 200);
  const amount = cleanText(data.amount, 500);
  const gp = cleanText(data.gp, 80);
  return Boolean(drinking || amount || gp);
}

function marketingTicked(value: unknown): boolean {
  return value === true || cleanText(value, 8) === "yes" || cleanText(value, 8) === "true";
}

export function consentRecord(data: Record<string, unknown>, now = new Date()): {
  at: string;
  version: "apply-health-v1" | "rebuild-health-v1";
  ticked: string[];
} {
  const ticked: string[] = [];
  if (cleanText(data.healthConsent, 8) === "yes") ticked.push("health");
  if (marketingTicked(data.marketingConsent)) ticked.push("marketing");
  const version = cleanText(data.source, 20) === "rebuild" ? "rebuild-health-v1" : "apply-health-v1";
  return { at: now.toISOString(), version, ticked };
}

function outbound(data: Record<string, unknown>, now: Date): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    if (key === "drinking" || key === "amount" || key === "gp") continue;
    const value = cleanText(data[key], max);
    if (value) body[key] = value;
  }
  if (healthGiven(data)) {
    const drinking = cleanText(data.drinking, 200) || cleanText(data.often, 200);
    const amount = cleanText(data.amount, 500);
    const gp = cleanText(data.gp, 80);
    if (drinking) body.drinking = drinking;
    if (amount) body.amount = amount;
    if (gp) body.gp = gp;
    body.healthConsent = "yes";
  }
  if (marketingTicked(data.marketingConsent)) body.marketingConsent = "yes";
  body.consent = consentRecord(data, now);
  return body;
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request, business.origins)) return json(request, { ok: false }, 403);

  const limit = takeRateLimit(`forward:${clientKey(request)}`, Date.now(), 10 * 60 * 1000, 8);
  if (!limit.ok) return json(request, { ok: false, error: "rate" }, 429);

  let data: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.length > 20000) return json(request, { ok: false, error: "size" }, 413);
    if (text.trim()) {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    }
  } catch {
    return json(request, { ok: false, error: "body" }, 400);
  }

  if (typeof data.website === "string" && data.website !== "") {
    return json(request, { ok: true, skipped: "honeypot" });
  }

  if (healthGiven(data) && cleanText(data.healthConsent, 8) !== "yes") {
    console.info("apply forward refused: no health consent");
    return json(request, { ok: false, error: "consent" }, 422);
  }

  const payload = outbound(data, new Date());
  let response: Response;
  try {
    response = await fetch(FORMSPREE, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    console.error("apply forward failed");
    return json(request, { ok: false, error: "forward" }, 502);
  }
  if (!response.ok) {
    console.error("apply forward failed", response.status);
    return json(request, { ok: false, error: "forward" }, 502);
  }
  console.info("apply forward sent");
  return json(request, { ok: true });
}
