import assert from "node:assert/strict";
import { test } from "node:test";
import { resetRateLimits } from "../lib/guard.ts";
import { OPTIONS, POST } from "./apply-forward.ts";

function siteRequest(body: unknown, extra: Record<string, string> = {}): Request {
  return new Request("https://callumb-coaching.vercel.app/api/apply-forward", {
    method: "POST",
    headers: {
      origin: "https://callumbcoaching.co.uk",
      host: "callumb-coaching.vercel.app",
      "content-type": "application/json",
      "x-forwarded-for": extra.ip || "203.0.113.40",
      ...extra,
    },
    body: JSON.stringify(body),
  });
}

test("options on the forward route allow the public site", () => {
  const headers = new Headers({
    host: "callumb-coaching.vercel.app",
    origin: "https://callumbcoaching.co.uk",
    "access-control-request-method": "POST",
  });
  const res = OPTIONS(new Request("https://callumb-coaching.vercel.app/api/apply-forward", { method: "OPTIONS", headers }));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "https://callumbcoaching.co.uk");
});

test("drinking without health consent is not forwarded", async () => {
  resetRateLimits();
  let called = false;
  const real = globalThis.fetch;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    for (const body of [
      { source: "apply", drinking: "Every night", name: "Dave" },
      { source: "apply", amount: "A bottle of wine", healthConsent: "true" },
      { source: "rebuild", gp: "yes", healthConsent: "on" },
      { source: "apply", often: "Most nights" },
    ]) {
      called = false;
      const res = await POST(siteRequest(body));
      assert.equal(res.status, 422);
      assert.equal((await res.json()).error, "consent");
      assert.equal(called, false);
    }
  } finally {
    globalThis.fetch = real;
  }
});

test("an application with no drinking detail is forwarded without the box", async () => {
  resetRateLimits();
  const sent: Array<{ url: string; body: Record<string, unknown> }> = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const res = await POST(siteRequest({
      source: "apply",
      name: "Dave",
      contact: "dave@example.com",
      plan: "Not sure yet",
      goals: "Lose fat",
      tried: "Fell off.",
      week: "Shifts.",
    }));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].url, "https://formspree.io/f/mvzjlroq");
    assert.equal(sent[0].body.drinking, undefined);
    assert.equal(sent[0].body.amount, undefined);
    assert.equal(sent[0].body.gp, undefined);
    assert.equal(sent[0].body.healthConsent, undefined);
    const consent = sent[0].body.consent as { version: string; at: string; ticked: string[] };
    assert.equal(consent.version, "apply-health-v1");
    assert.equal(Array.isArray(consent.ticked), true);
    assert.equal(consent.ticked.length, 0);
    assert.match(consent.at, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    globalThis.fetch = real;
  }
});

test("a consented drinking answer is forwarded with a consent record", async () => {
  resetRateLimits();
  const sent: Array<Record<string, unknown>> = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const res = await POST(siteRequest({
      source: "rebuild",
      name: "Dave",
      plan: "The Full Rebuild",
      drinking: "Every night",
      amount: "A bottle of wine",
      gp: "yes",
      healthConsent: "yes",
      marketingConsent: "yes",
    }));
    assert.equal(res.status, 200);
    assert.equal(sent[0].drinking, "Every night");
    assert.equal(sent[0].amount, "A bottle of wine");
    assert.equal(sent[0].gp, "yes");
    assert.equal(sent[0].healthConsent, "yes");
    const consent = sent[0].consent as { version: string; ticked: string[] };
    assert.equal(consent.version, "rebuild-health-v1");
    assert.deepEqual(consent.ticked, ["health", "marketing"]);
  } finally {
    globalThis.fetch = real;
  }
});

test("a post from another site is refused", async () => {
  const res = await POST(
    new Request("https://callumb-coaching.vercel.app/api/apply-forward", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        host: "callumb-coaching.vercel.app",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Dave" }),
    }),
  );
  assert.equal(res.status, 403);
});
