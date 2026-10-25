// Free-guide signup. components.js posts JSON: { name, email, website, src }.
// Both /api/lead.php and /api/lead run this file. The rewrite in vercel.json
// also sends /api/lead.php to /api/lead. On cPanel the browser posts to
// https://callumb-coaching.vercel.app/api/lead.php. The MailerLite key stays on Vercel.

import { business } from "../lib/business.ts";
import { corsHeaders, sameOrigin } from "../lib/guard.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAILERLITE_URL = "https://connect.mailerlite.com/api/subscribers";
export const GUIDE_DOWNLOAD = "/guides/the-five-foundations.pdf";

function json(request: Request, body: unknown, status: number): Response {
  const headers = new Headers({
    "cache-control": "no-store",
    "x-robots-tag": "noindex",
    ...corsHeaders(request, business.origins),
  });
  return Response.json(body, { status, headers });
}

function methodNotAllowed(request: Request): Response {
  return json(request, { ok: false }, 405);
}

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request, business.origins) });
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

function validEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  const email = value.trim();
  if (!email || email.length > 254) return "";
  if (email.split("@").length !== 2) return "";
  if (!EMAIL.test(email)) return "";
  return email;
}

function cleanName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 200);
}

// MailerLite rejects subscriber fields it does not already know, and that
// fails the signup. Source and UTM values are logged here and sent to
// Plausible from the browser. They are not added to the MailerLite body.
const SOURCE_KEYS = ["src", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function cleanToken(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^\w.+~-]/g, "").slice(0, 80);
}

export function leadSource(data: Record<string, unknown>): Record<string, string> {
  const source: Record<string, string> = {};
  for (const key of SOURCE_KEYS) {
    const value = cleanToken(data[key]);
    if (value) source[key] = value;
  }
  return source;
}

export function subscriberPayload(email: string, name: string, group: string) {
  const payload: { email: string; fields?: { name: string }; groups?: string[] } = { email };
  if (name) payload.fields = { name };
  if (group) payload.groups = [group];
  return payload;
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request, business.origins)) return json(request, { ok: false }, 403);

  let data: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.length > 10000) return json(request, { ok: false, error: "email" }, 422);
    if (text.trim()) {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    }
  } catch {
    data = {};
  }

  // Hidden "website" field. Live accepts any non-empty string, including spaces,
  // and answers 200 without subscribing. Checked before the email.
  if (typeof data.website === "string" && data.website !== "") {
    return json(request, { ok: true }, 200);
  }

  const email = validEmail(data.email);
  if (!email) return json(request, { ok: false, error: "email" }, 422);

  const key = (process.env.MAILERLITE_API_KEY || "").trim();
  if (!key) {
    console.error("MAILERLITE_API_KEY is not set; refusing to call MailerLite");
    return json(request, { ok: false, error: "mailerlite_not_configured" }, 500);
  }

  const group = (process.env.MAILERLITE_GROUP_ID || "").trim();
  const name = cleanName(data.name);
  const source = leadSource(data);
  if (Object.keys(source).length) console.log("lead source", JSON.stringify(source));
  const payload = subscriberPayload(email, name, group);

  let upstream: Response;
  try {
    upstream = await fetch(MAILERLITE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const name = err && typeof err === "object" && "name" in err ? String(err.name) : "error";
    console.error("MailerLite subscriber request failed", name);
    return json(request, { ok: false, error: "mailerlite" }, 502);
  }

  if (upstream.ok) return json(request, { ok: true, download: GUIDE_DOWNLOAD }, 200);

  console.error("MailerLite subscriber request failed", upstream.status);
  if (upstream.status === 401 || upstream.status === 403) {
    return json(request, { ok: false, error: "mailerlite_rejected" }, 500);
  }
  if (upstream.status === 422) return json(request, { ok: false, error: "email" }, 422);
  return json(request, { ok: false, error: "mailerlite" }, 502);
}
