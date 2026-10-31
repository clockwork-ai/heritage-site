// Shared MailerLite subscribe used by the application copy and chatbot leads.
// Guide signups stay in server/lead.ts. Unknown subscriber fields fail the
// whole request, so a summary in the note field is retried without that field.

const SUBSCRIBERS = "https://connect.mailerlite.com/api/subscribers";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let noteFieldRejected = false;

export function validEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  const email = value.trim();
  if (!email || email.length > 254) return "";
  if (email.split("@").length !== 2) return "";
  if (!EMAIL.test(email)) return "";
  return email;
}

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

export function asPhone(value: unknown): string {
  const trimmed = cleanText(value, 40);
  if (!trimmed || trimmed.includes("@")) return "";
  if (!/^[0-9+().\s-]{8,40}$/.test(trimmed)) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return "";
  return trimmed;
}

export function splitContact(contact: unknown): { email: string; phone: string } {
  const text = cleanText(contact, 254);
  const found = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = found ? validEmail(found[0]) : "";
  const rest = found ? text.replace(found[0], " ").trim() : text;
  const phone = asPhone(rest) || (email ? "" : asPhone(text));
  return { email, phone };
}

// Group ids are the long numbers MailerLite shows in the group URL.
export function optionalGroup(name: string, env: Record<string, string | undefined> = process.env): string {
  const value = (env[name] || "").trim();
  return /^\d{1,30}$/.test(value) ? value : "";
}

export type SubscribeInput = {
  email: string;
  name?: string;
  phone?: string;
  source: string;
  group: string;
  note?: string;
};

export type SubscribeResult = { ok: true; id: string } | { ok: false; status: number };

function fieldSet(input: SubscribeInput, mode: "full" | "no-note" | "safe"): Record<string, string> {
  const fields: Record<string, string> = {};
  if (input.name) fields.name = input.name;
  if (mode !== "safe" && input.phone) fields.phone = input.phone;
  if (input.source) fields.signup_source = input.source;
  if (mode === "full" && input.note && !noteFieldRejected) fields.note = input.note.slice(0, 500);
  return fields;
}

async function postSubscriber(
  key: string,
  input: SubscribeInput,
  fields: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; id: string } | { ok: false; status: number; detail: string }> {
  const payload: { email: string; fields?: Record<string, string>; groups?: string[] } = { email: input.email };
  if (Object.keys(fields).length) payload.fields = fields;
  if (input.group) payload.groups = [input.group];
  let response: Response;
  try {
    response = await fetchImpl(SUBSCRIBERS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, status: 0, detail: "" };
  }
  if (response.ok) {
    let id = "";
    try {
      const body = (await response.json()) as { data?: { id?: unknown } };
      if (body?.data?.id != null) id = String(body.data.id);
    } catch {
      id = "";
    }
    return { ok: true, id };
  }
  let detail = "";
  try {
    detail = (await response.text()).slice(0, 500);
  } catch {
    detail = "";
  }
  return { ok: false, status: response.status, detail };
}

export async function subscribe(
  key: string,
  input: SubscribeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SubscribeResult> {
  const attempts: Array<"full" | "no-note" | "safe"> = ["full"];
  if (input.note || input.phone) attempts.push("no-note");
  if (input.phone) attempts.push("safe");

  let last = 0;
  for (const mode of attempts) {
    const fields = fieldSet(input, mode);
    const result = await postSubscriber(key, input, fields, fetchImpl);
    if (result.ok) return { ok: true, id: result.id };
    last = result.status;
    if (result.status !== 422) return { ok: false, status: result.status };
    if (mode === "full" && input.note && /note/i.test(result.detail)) noteFieldRejected = true;
    if (mode === "no-note" && !input.phone) break;
  }
  return { ok: false, status: last || 422 };
}

export function resetNoteField(): void {
  noteFieldRejected = false;
}
