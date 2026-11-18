import assert from "node:assert/strict";
import { test } from "node:test";
import { resetRateLimits } from "../lib/guard.ts";
import { resetNoteField, splitContact } from "../lib/mailerlite.ts";
import { OPTIONS, POST, applicationSummary } from "./apply.ts";

const envKeys = ["MAILERLITE_API_KEY", "MAILERLITE_GROUP_APPLICATIONS"];

function siteRequest(body: unknown, extra: Record<string, string> = {}): Request {
  return new Request("https://callumb-coaching.vercel.app/api/apply", {
    method: "POST",
    headers: {
      origin: "https://callumbcoaching.co.uk",
      host: "callumb-coaching.vercel.app",
      "content-type": "application/json",
      "x-forwarded-for": extra.ip || "203.0.113.10",
      ...extra,
    },
    body: JSON.stringify(body),
  });
}

async function withEnv(env: Record<string, string>, run: () => Promise<void>) {
  const saved: Record<string, string | undefined> = {};
  for (const key of envKeys) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  Object.assign(process.env, env);
  resetRateLimits();
  resetNoteField();
  try {
    await run();
  } finally {
    resetNoteField();
    for (const key of envKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test("options on apply allow the public site", () => {
  const headers = new Headers({
    host: "callumb-coaching.vercel.app",
    origin: "https://callumbcoaching.co.uk",
    "access-control-request-method": "POST",
  });
  const res = OPTIONS(new Request("https://callumb-coaching.vercel.app/api/apply", { method: "OPTIONS", headers }));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "https://callumbcoaching.co.uk");
});

test("a phone and an email in one contact are split", () => {
  assert.deepEqual(splitContact("dave@example.com"), { email: "dave@example.com", phone: "" });
  assert.deepEqual(splitContact("07359 838866"), { email: "", phone: "07359 838866" });
  assert.deepEqual(splitContact("dave@example.com 07359 838866"), {
    email: "dave@example.com",
    phone: "07359 838866",
  });
});

test("the application summary stays short and plain", () => {
  const note = applicationSummary({
    age: "42",
    goals: "Lose fat",
    tried: "Fell off.",
    week: "Shifts.",
    plan: "12 weeks, Foundation",
    reply: "WhatsApp message",
    phone: "07359 838866",
  });
  assert.match(note, /Wants: Lose fat/);
  assert.match(note, /Phone: 07359 838866/);
  assert.equal(note.includes("\u2014"), false);
  assert.equal(note.includes("\u2013"), false);
});

test("an unset applications group skips without calling MailerLite", async () => {
  await withEnv({ MAILERLITE_API_KEY: "test" }, async () => {
    let called = false;
    const real = globalThis.fetch;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    try {
      const res = await POST(siteRequest({ name: "Dave", contact: "dave@example.com", goals: "Lose fat", healthConsent: "yes", marketingConsent: "yes" }));
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.skipped, "group");
      assert.equal(called, false);
    } finally {
      globalThis.fetch = real;
    }
  });
});

test("a phone-only application is skipped because MailerLite needs an email", async () => {
  await withEnv({ MAILERLITE_API_KEY: "test", MAILERLITE_GROUP_APPLICATIONS: "444" }, async () => {
    let called = false;
    const real = globalThis.fetch;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    try {
      const res = await POST(siteRequest({ name: "Dave", contact: "07359 838866", healthConsent: "yes", marketingConsent: "yes" }));
      const body = await res.json();
      assert.equal(body.skipped, "email");
      assert.equal(called, false);
    } finally {
      globalThis.fetch = real;
    }
  });
});

test("an email application is copied with signup_source apply", async () => {
  await withEnv({ MAILERLITE_API_KEY: "test", MAILERLITE_GROUP_APPLICATIONS: "444" }, async () => {
    const sent: unknown[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ data: { id: "99" } }), { status: 201 });
    }) as typeof fetch;
    try {
      const res = await POST(
        siteRequest({
          name: "Dave",
          contact: "dave@example.com",
          age: "42",
          goals: "Lose fat",
          tried: "Fell off.",
          plan: "12 weeks, Foundation",
          reply: "Email",
          website: "",
          healthConsent: "yes",
          marketingConsent: "yes",
        }),
      );
      assert.equal(res.status, 200);
      assert.equal((await res.json()).mailed, true);
      assert.equal(sent.length, 1);
      assert.deepEqual(sent[0], {
        email: "dave@example.com",
        fields: {
          name: "Dave",
          signup_source: "apply",
          note: "Wants: Lose fat. Plan: 12 weeks, Foundation. Reply: Email. Age: 42. Tried before: Fell off.",
        },
        groups: ["444"],
      });
    } finally {
      globalThis.fetch = real;
    }
  });
});

test("a rejected note field is retried without it and still counts as mailed", async () => {
  await withEnv({ MAILERLITE_API_KEY: "test", MAILERLITE_GROUP_APPLICATIONS: "444" }, async () => {
    const sent: Array<Record<string, unknown>> = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      sent.push(body);
      const fields = body.fields as Record<string, string>;
      if (fields.note) {
        return new Response(JSON.stringify({ errors: { "fields.note": ["unknown"] } }), { status: 422 });
      }
      return new Response(JSON.stringify({ data: { id: "99" } }), { status: 200 });
    }) as typeof fetch;
    try {
      const res = await POST(siteRequest({ name: "Dave", contact: "dave@example.com", goals: "Lose fat", healthConsent: "yes", marketingConsent: "yes" }));
      assert.equal((await res.json()).mailed, true);
      assert.equal(sent.length, 2);
      assert.equal("note" in (sent[1].fields as object), false);
      assert.equal((sent[1].fields as { signup_source: string }).signup_source, "apply");
    } finally {
      globalThis.fetch = real;
    }
  });
});

test("a MailerLite failure still answers 200", async () => {
  await withEnv({ MAILERLITE_API_KEY: "test", MAILERLITE_GROUP_APPLICATIONS: "444" }, async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => new Response("nope", { status: 500 })) as typeof fetch;
    try {
      const res = await POST(siteRequest({ name: "Dave", contact: "dave@example.com", healthConsent: "yes", marketingConsent: "yes" }));
      assert.equal(res.status, 200);
      assert.equal((await res.json()).mailed, false);
    } finally {
      globalThis.fetch = real;
    }
  });
});

test("a filled honeypot does not subscribe", async () => {
  await withEnv({ MAILERLITE_API_KEY: "test", MAILERLITE_GROUP_APPLICATIONS: "444" }, async () => {
    let called = false;
    const real = globalThis.fetch;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    try {
      const res = await POST(siteRequest({ name: "Dave", contact: "dave@example.com", website: "http://spam.test" }));
      assert.equal((await res.json()).skipped, "honeypot");
      assert.equal(called, false);
    } finally {
      globalThis.fetch = real;
    }
  });
});

test("drinking and health details are not copied without an explicit yes", async () => {
  await withEnv({ MAILERLITE_API_KEY: "test", MAILERLITE_GROUP_APPLICATIONS: "444" }, async () => {
    const real = globalThis.fetch;
    for (const healthConsent of [undefined, "", "on", "true", "YES", "yes please"]) {
      let called = false;
      globalThis.fetch = (async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as typeof fetch;
      resetRateLimits();
      try {
        const res = await POST(siteRequest({
          name: "Dave",
          contact: "dave@example.com",
          goals: "Get my health back",
          plan: "The Full Rebuild",
          drinking: "Every night",
          amount: "A bottle of wine",
          gp: "yes",
          healthConsent,
        }));
        assert.equal(res.status, 200);
        assert.equal((await res.json()).skipped, "consent");
        assert.equal(called, false, String(healthConsent));
      } finally {
        globalThis.fetch = real;
      }
    }
  });
});

test("MailerLite is skipped unless the marketing box is yes or true", async () => {
  await withEnv({ MAILERLITE_API_KEY: "test", MAILERLITE_GROUP_APPLICATIONS: "444" }, async () => {
    const real = globalThis.fetch;
    for (const marketingConsent of [undefined, "", "no", "on", "YES", false]) {
      let called = false;
      globalThis.fetch = (async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as typeof fetch;
      resetRateLimits();
      try {
        const res = await POST(siteRequest({
          name: "Dave",
          contact: "dave@example.com",
          healthConsent: "yes",
          marketingConsent,
        }));
        assert.equal((await res.json()).skipped, "marketing");
        assert.equal(called, false, String(marketingConsent));
      } finally {
        globalThis.fetch = real;
      }
    }
    for (const marketingConsent of ["yes", "true", true]) {
      let called = false;
      globalThis.fetch = (async () => {
        called = true;
        return new Response(JSON.stringify({ data: { id: "99" } }), { status: 201 });
      }) as typeof fetch;
      resetRateLimits();
      try {
        const res = await POST(siteRequest({
          name: "Dave",
          contact: "dave@example.com",
          healthConsent: "yes",
          marketingConsent,
        }));
        assert.equal((await res.json()).mailed, true);
        assert.equal(called, true, String(marketingConsent));
      } finally {
        globalThis.fetch = real;
      }
    }
  });
});

test("a consented application can include the drinking answers", async () => {
  await withEnv({ MAILERLITE_API_KEY: "test", MAILERLITE_GROUP_APPLICATIONS: "444" }, async () => {
    const sent: Array<Record<string, unknown>> = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ data: { id: "99" } }), { status: 201 });
    }) as typeof fetch;
    try {
      const res = await POST(siteRequest({
        name: "Dave",
        contact: "dave@example.com",
        plan: "The Full Rebuild",
        drinking: "Every night",
        amount: "A bottle of wine",
        gp: "yes",
        healthConsent: "yes",
        marketingConsent: "yes",
      }));
      assert.equal((await res.json()).mailed, true);
      const fields = (sent[0].fields as { note: string });
      assert.match(fields.note, /Drinking: Every night/);
      assert.match(fields.note, /On a drinking day: A bottle of wine/);
      assert.match(fields.note, /GP note read/);
    } finally {
      globalThis.fetch = real;
    }
  });
});

test("a post from another site is refused", async () => {
  const res = await POST(
    new Request("https://callumb-coaching.vercel.app/api/apply", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        host: "callumb-coaching.vercel.app",
        "content-type": "application/json",
      },
      body: JSON.stringify({ contact: "dave@example.com" }),
    }),
  );
  assert.equal(res.status, 403);
});
