import assert from "node:assert/strict";
import { test } from "node:test";
import type { BusinessConfig } from "./business.ts";
import { saveLead, type LeadInput } from "./leads.ts";
import { resetNoteField } from "./mailerlite.ts";

const config = {
  lead: { notifyName: "Callum Broadfoot", storagePrefix: "leads", webhookEnv: "LEAD_NOTIFY_URL" },
  links: { email: "callum@callumbcoaching.co.uk" },
} as BusinessConfig;

const lead: LeadInput = {
  name: "Dave",
  email: "test+preview@callumbcoaching.co.uk",
  goal: "Lose fat and keep the muscle",
  page: "/coaching",
  source: "chat-form",
};

const envKeys = [
  "MAILERLITE_API_KEY",
  "MAILERLITE_GROUP_CHATBOT",
  "CHATBOT_ALERT_FORMSPREE_ID",
  "LEAD_NOTIFY_URL",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
];

async function withEnv(env: Record<string, string>, run: (sent: Array<{ url: string; body: unknown }>) => Promise<void>) {
  const saved: Record<string, string | undefined> = {};
  for (const key of envKeys) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  Object.assign(process.env, env);
  resetNoteField();
  const sent: Array<{ url: string; body: unknown }> = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    sent.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });
    const href = String(url);
    if (href.includes("mailerlite")) {
      return new Response(JSON.stringify({ data: { id: "55" } }), { status: 201 });
    }
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    await run(sent);
  } finally {
    globalThis.fetch = real;
    resetNoteField();
    for (const key of envKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test("a stored chatbot lead is copied to MailerLite and Formspree", async () => {
  await withEnv(
    {
      BLOB_READ_WRITE_TOKEN: "test",
      MAILERLITE_API_KEY: "test",
      MAILERLITE_GROUP_CHATBOT: "555",
      CHATBOT_ALERT_FORMSPREE_ID: "mgojkeny",
    },
    async (sent) => {
      const result = await saveLead(config, lead, async () => {});
      assert.equal(result.ok, true);
      assert.equal(result.notified, true);
      const mail = sent.find((item) => item.url.includes("mailerlite"));
      const form = sent.find((item) => item.url.includes("formspree.io/f/mgojkeny"));
      assert.ok(mail);
      assert.deepEqual(mail?.body, {
        email: lead.email,
        fields: {
          name: "Dave",
          signup_source: "chatbot",
          note: "Goal: Lose fat and keep the muscle. Page: /coaching",
        },
        groups: ["555"],
      });
      assert.ok(form);
      assert.deepEqual(form?.body, {
        name: "Dave",
        email: lead.email,
        goal: lead.goal,
        page: "/coaching",
        source: "chatbot",
        _subject: "Chatbot lead: Dave",
      });
    },
  );
});

test("unset chatbot group and form id still store the lead", async () => {
  await withEnv({ BLOB_READ_WRITE_TOKEN: "test" }, async (sent) => {
    const result = await saveLead(config, lead, async () => {});
    assert.deepEqual(result, { ok: true, notified: false });
    assert.equal(sent.length, 0);
  });
});

test("a Formspree failure does not drop the stored lead", async () => {
  await withEnv(
    {
      BLOB_READ_WRITE_TOKEN: "test",
      MAILERLITE_API_KEY: "test",
      MAILERLITE_GROUP_CHATBOT: "555",
      CHATBOT_ALERT_FORMSPREE_ID: "mgojkeny",
    },
    async () => {
      const real = globalThis.fetch;
      globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
        if (String(url).includes("formspree")) return new Response("no", { status: 422 });
        return real(url as string, init);
      }) as typeof fetch;
      try {
        const result = await saveLead(config, lead, async () => {});
        assert.equal(result.ok, true);
        assert.equal(result.notified, false);
      } finally {
        globalThis.fetch = real;
      }
    },
  );
});

test("a blob failure does not call MailerLite or Formspree", async () => {
  await withEnv(
    {
      BLOB_READ_WRITE_TOKEN: "test",
      MAILERLITE_API_KEY: "test",
      MAILERLITE_GROUP_CHATBOT: "555",
      CHATBOT_ALERT_FORMSPREE_ID: "mgojkeny",
    },
    async (sent) => {
      const result = await saveLead(config, lead, async () => {
        throw new Error("disk");
      });
      assert.equal(result.ok, false);
      assert.equal(sent.length, 0);
    },
  );
});
