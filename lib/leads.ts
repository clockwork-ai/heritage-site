import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { formspreeId, postChatbotAlert } from "./alerts.ts";
import type { BusinessConfig } from "./business.ts";
import { cleanLine, isValidEmail } from "./guard.ts";
import { optionalGroup, subscribe } from "./mailerlite.ts";

export type LeadInput = {
  name: string;
  email: string;
  goal: string;
  page?: string;
  source: "chat-tool" | "chat-form";
};

export type LeadResult =
  | { ok: true; notified: boolean }
  | { ok: false; error: string };

export function validateLead(
  input: {
    name?: unknown;
    email?: unknown;
    goal?: unknown;
    page?: unknown;
  },
  source: LeadInput["source"],
  knownPage?: string,
): { ok: true; lead: LeadInput } | { ok: false; error: string } {
  const name = cleanLine(typeof input.name === "string" ? input.name : "", 80);
  const email = cleanLine(typeof input.email === "string" ? input.email : "", 120);
  const goal = cleanLine(typeof input.goal === "string" ? input.goal : "", 400);
  if (name.length < 2) return { ok: false, error: "I need a name." };
  if (!isValidEmail(email)) return { ok: false, error: "I need an email address." };
  if (goal.length < 2) return { ok: false, error: "I need a line about what they want." };
  return {
    ok: true,
    lead: { name, email, goal, page: knownPage, source },
  };
}

function pathname(prefix: string, lead: LeadInput): string {
  const day = new Date().toISOString().slice(0, 10);
  const hash = createHash("sha256")
    .update(`${lead.email.toLowerCase()}\n${lead.goal.toLowerCase()}`)
    .digest("hex")
    .slice(0, 16);
  return `${prefix}/${day}/${hash}.json`;
}

async function notify(config: BusinessConfig, lead: LeadInput): Promise<boolean> {
  const url = process.env[config.lead.webhookEnv];
  if (!url) return false;
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    console.error("lead notify: LEAD_NOTIFY_URL is not a URL");
    return false;
  }
  if (target.protocol !== "https:") {
    console.error("lead notify: LEAD_NOTIFY_URL must be https");
    return false;
  }
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to: config.lead.notifyName,
        notifyEmail: config.links.email,
        ...lead,
        receivedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      console.error(`lead notify: webhook responded ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("lead notify: webhook failed", error instanceof Error ? error.name : "error");
    return false;
  }
}

async function subscribeChatbot(lead: LeadInput): Promise<"added" | "skipped" | "failed"> {
  const group = optionalGroup("MAILERLITE_GROUP_CHATBOT");
  if (!group) {
    console.info("chatbot mailerlite skipped: MAILERLITE_GROUP_CHATBOT unset");
    return "skipped";
  }
  const key = (process.env.MAILERLITE_API_KEY || "").trim();
  if (!key) {
    console.error("chatbot mailerlite skipped: MAILERLITE_API_KEY is not set");
    return "skipped";
  }
  const note = [`Goal: ${lead.goal}`, lead.page ? `Page: ${lead.page}` : ""].filter(Boolean).join(". ");
  try {
    const result = await subscribe(key, {
      email: lead.email,
      name: lead.name,
      source: "chatbot",
      group,
      note,
    });
    if (!result.ok) {
      console.error("chatbot mailerlite failed", result.status);
      return "failed";
    }
    console.info("chatbot mailerlite added");
    return "added";
  } catch (error) {
    console.error("chatbot mailerlite failed", error instanceof Error ? error.name : "error");
    return "failed";
  }
}

async function alertChatbot(lead: LeadInput): Promise<boolean> {
  const formId = formspreeId();
  if (!formId) {
    if ((process.env.CHATBOT_ALERT_FORMSPREE_ID || "").trim()) {
      console.error("chatbot alert skipped: CHATBOT_ALERT_FORMSPREE_ID is not a form id");
    } else {
      console.info("chatbot alert skipped: CHATBOT_ALERT_FORMSPREE_ID unset");
    }
    return false;
  }
  const result = await postChatbotAlert({
    formId,
    name: lead.name,
    email: lead.email,
    goal: lead.goal,
    page: lead.page,
  });
  if (!result.ok) {
    console.error("chatbot alert failed", result.status);
    return false;
  }
  console.info("chatbot alert sent");
  return true;
}

// Blob stays the record. MailerLite and the email alert are best-effort.
async function deliverLead(config: BusinessConfig, lead: LeadInput): Promise<{ notified: boolean; mailerlite: string }> {
  const [mailerlite, alerted, webhook] = await Promise.all([
    subscribeChatbot(lead),
    alertChatbot(lead),
    notify(config, lead),
  ]);
  return { notified: alerted || webhook, mailerlite };
}

export async function saveLead(
  config: BusinessConfig,
  lead: LeadInput,
  write: (pathname: string, body: string) => Promise<void> = async (pathname, body) => {
    await put(pathname, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
  },
): Promise<LeadResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    console.error("lead storage: Blob is not connected");
    return { ok: false, error: "storage-not-configured" };
  }
  const record = {
    ...lead,
    notifyName: config.lead.notifyName,
    savedAt: new Date().toISOString(),
  };
  try {
    await write(pathname(config.lead.storagePrefix, lead), JSON.stringify(record));
  } catch (error) {
    console.error("lead storage: put failed", error instanceof Error ? error.name : "error");
    return { ok: false, error: "storage-failed" };
  }
  let notified = false;
  let mailerlite = "skipped";
  try {
    const delivered = await deliverLead(config, lead);
    notified = delivered.notified;
    mailerlite = delivered.mailerlite;
  } catch (error) {
    console.error("lead delivery failed", error instanceof Error ? error.name : "error");
  }
  console.info(`lead stored source=${lead.source} notified=${notified} mailerlite=${mailerlite}`);
  return { ok: true, notified };
}
