// Application copy into MailerLite. The page still posts to Formspree first.
// This route is best-effort: a missing group, a missing email, or a MailerLite
// error answers 200 so the visitor's success message is never blocked.
// Group: MAILERLITE_GROUP_APPLICATIONS. Signup field: signup_source=apply.

import { business } from "../lib/business.ts";
import { clientKey, corsHeaders, sameOrigin, takeRateLimit } from "../lib/guard.ts";
import { cleanText, optionalGroup, splitContact, subscribe, validEmail } from "../lib/mailerlite.ts";

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

export function applicationSummary(input: {
  age: string;
  goals: string;
  tried: string;
  week: string;
  plan: string;
  reply: string;
  phone: string;
}): string {
  const bits = [
    input.goals ? `Wants: ${input.goals}` : "",
    input.plan ? `Plan: ${input.plan}` : "",
    input.reply ? `Reply: ${input.reply}` : "",
    input.age ? `Age: ${input.age}` : "",
    input.phone ? `Phone: ${input.phone}` : "",
    input.tried ? `Tried before: ${input.tried}` : "",
    input.week ? `Week: ${input.week}` : "",
  ].filter(Boolean);
  return bits.join(". ").slice(0, 500);
}

function ageText(value: unknown): string {
  const text = cleanText(value, 3);
  if (!/^\d{1,3}$/.test(text)) return "";
  const age = Number(text);
  if (age < 18 || age > 90) return "";
  return String(age);
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request, business.origins)) return json(request, { ok: false }, 403);

  const limit = takeRateLimit(`apply:${clientKey(request)}`, Date.now(), 10 * 60 * 1000, 8);
  if (!limit.ok) {
    console.info("apply mailerlite skipped: rate limit");
    return json(request, { ok: true, skipped: "rate" });
  }

  let data: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.length > 20000) return json(request, { ok: true, skipped: "size" });
    if (text.trim()) {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    }
  } catch {
    return json(request, { ok: true, skipped: "body" });
  }

  if (typeof data.website === "string" && data.website !== "") {
    return json(request, { ok: true, skipped: "honeypot" });
  }

  const group = optionalGroup("MAILERLITE_GROUP_APPLICATIONS");
  if (!group) {
    console.info("apply mailerlite skipped: MAILERLITE_GROUP_APPLICATIONS unset");
    return json(request, { ok: true, skipped: "group" });
  }

  const contact = splitContact(data.contact);
  const email = contact.email || validEmail(data.email);
  if (!email) {
    console.info("apply mailerlite skipped: no email");
    return json(request, { ok: true, skipped: "email" });
  }

  const key = (process.env.MAILERLITE_API_KEY || "").trim();
  if (!key) {
    console.error("apply mailerlite skipped: MAILERLITE_API_KEY is not set");
    return json(request, { ok: true, skipped: "key" });
  }

  const name = cleanText(data.name, 80);
  const phone = contact.phone;
  const note = applicationSummary({
    age: ageText(data.age),
    goals: cleanText(data.goals, 200),
    tried: cleanText(data.tried, 240),
    week: cleanText(data.week, 240),
    plan: cleanText(data.plan, 80),
    reply: cleanText(data.reply, 40),
    phone,
  });

  const result = await subscribe(key, {
    email,
    name,
    phone,
    source: "apply",
    group,
    note,
  });
  if (!result.ok) {
    console.error("apply mailerlite failed", result.status);
    return json(request, { ok: true, mailed: false });
  }
  console.info("apply mailerlite added");
  return json(request, { ok: true, mailed: true });
}
