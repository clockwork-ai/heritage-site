import assert from "node:assert/strict";
import { test } from "node:test";
import { GUIDE_DOWNLOAD, OPTIONS, POST, groupForSource, leadSource, subscriberPayload } from "./lead.ts";

function preflight(path: string, origin: string | null): Request {
  const headers = new Headers({ host: "callumb-coaching.vercel.app" });
  if (origin) headers.set("origin", origin);
  headers.set("access-control-request-method", "POST");
  headers.set("access-control-request-headers", "content-type");
  return new Request(`https://callumb-coaching.vercel.app${path}`, { method: "OPTIONS", headers });
}

test("the guide download path is the new pdf", () => {
  assert.equal(GUIDE_DOWNLOAD, "/guides/the-five-foundations.pdf");
});

test("options on lead.php and lead allow the cPanel origins", () => {
  for (const path of ["/api/lead.php", "/api/lead"]) {
    const site = OPTIONS(preflight(path, "https://callumbcoaching.co.uk"));
    assert.equal(site.status, 204);
    assert.equal(site.headers.get("access-control-allow-origin"), "https://callumbcoaching.co.uk");
    assert.match(site.headers.get("access-control-allow-methods") || "", /POST/);
    assert.match(site.headers.get("access-control-allow-headers") || "", /content-type/);

    const www = OPTIONS(preflight(path, "https://www.callumbcoaching.co.uk"));
    assert.equal(www.status, 204);
    assert.equal(www.headers.get("access-control-allow-origin"), "https://www.callumbcoaching.co.uk");

    const other = OPTIONS(preflight(path, "https://evil.example"));
    assert.equal(other.status, 204);
    assert.equal(other.headers.get("access-control-allow-origin"), null);
  }
});

test("a bad email from the site origin is refused with CORS, before MailerLite", async () => {
  const res = await POST(
    new Request("https://callumb-coaching.vercel.app/api/lead.php", {
      method: "POST",
      headers: {
        origin: "https://callumbcoaching.co.uk",
        host: "callumb-coaching.vercel.app",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "not-an-email", name: "Test" }),
    }),
  );
  assert.equal(res.status, 422);
  assert.equal(res.headers.get("access-control-allow-origin"), "https://callumbcoaching.co.uk");
  const body = await res.json();
  assert.equal(body.ok, false);
});

test("utm values are kept for the log and left off the MailerLite body", () => {
  const source = leadSource({
    email: "a@b.co",
    src: "links",
    utm_source: "instagram",
    utm_medium: "bio",
    utm_campaign: "week-1",
    note: "<script>",
  });
  assert.deepEqual(source, { src: "links", utm_source: "instagram", utm_medium: "bio", utm_campaign: "week-1" });
  const payload = subscriberPayload("a@b.co", "Dave", "");
  assert.deepEqual(payload, { email: "a@b.co", fields: { name: "Dave" } });
  assert.equal("utm_source" in payload, false);
});

test("a post from another site is refused", async () => {
  const res = await POST(
    new Request("https://callumb-coaching.vercel.app/api/lead", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        host: "callumb-coaching.vercel.app",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "a@b.co" }),
    }),
  );
  assert.equal(res.status, 403);
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

const GROUPS = {
  MAILERLITE_GROUP_ID: "111",
  MAILERLITE_GROUP_TDEE: "222",
  MAILERLITE_GROUP_PROTEIN: "333",
};

test("each calculator src picks its own MailerLite group", () => {
  assert.equal(groupForSource("tdee-calculator", GROUPS), "222");
  assert.equal(groupForSource("protein-calculator", GROUPS), "333");
});

test("guide, unknown and missing src go to MAILERLITE_GROUP_ID", () => {
  for (const src of ["home", "links", "results", "coaching", "something-new", "", undefined]) {
    assert.equal(groupForSource(src, GROUPS), "111", String(src));
  }
  assert.equal(groupForSource("constructor", GROUPS), "111");
  assert.equal(groupForSource("__proto__", GROUPS), "111");
});

test("an unset or blank calculator variable falls back to MAILERLITE_GROUP_ID", () => {
  assert.equal(groupForSource("tdee-calculator", { MAILERLITE_GROUP_ID: "111" }), "111");
  assert.equal(groupForSource("protein-calculator", { MAILERLITE_GROUP_ID: " 111 ", MAILERLITE_GROUP_PROTEIN: "  " }), "111");
  assert.equal(groupForSource("tdee-calculator", { MAILERLITE_GROUP_ID: "111", MAILERLITE_GROUP_TDEE: " 222 " }), "222");
  assert.equal(groupForSource("tdee-calculator", {}), "");
});

test("signup_source is set from src and left off when there is none", () => {
  assert.deepEqual(subscriberPayload("a@b.co", "Dave", "222", "tdee-calculator"), {
    email: "a@b.co",
    fields: { name: "Dave", signup_source: "tdee-calculator" },
    groups: ["222"],
  });
  assert.deepEqual(subscriberPayload("a@b.co", "", "", "links"), { email: "a@b.co", fields: { signup_source: "links" } });
  assert.deepEqual(subscriberPayload("a@b.co", "", "111"), { email: "a@b.co", groups: ["111"] });
});

async function postWithEnv(body: Record<string, unknown>, env: Record<string, string>) {
  const saved: Record<string, string | undefined> = {};
  const keys = ["MAILERLITE_API_KEY", "MAILERLITE_GROUP_ID", "MAILERLITE_GROUP_TDEE", "MAILERLITE_GROUP_PROTEIN"];
  for (const k of keys) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  Object.assign(process.env, env);
  const realFetch = globalThis.fetch;
  const sent: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)));
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const res = await POST(
      new Request("https://callumb-coaching.vercel.app/api/lead.php", {
        method: "POST",
        headers: {
          origin: "https://callumbcoaching.co.uk",
          host: "callumb-coaching.vercel.app",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
    return { status: res.status, sent };
  } finally {
    globalThis.fetch = realFetch;
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test("a TDEE calculator signup is sent to the TDEE group with signup_source", async () => {
  const { status, sent } = await postWithEnv(
    { email: "a@b.co", name: "Dave", src: "tdee-calculator" },
    { MAILERLITE_API_KEY: "test", ...GROUPS },
  );
  assert.equal(status, 200);
  assert.deepEqual(sent, [{ email: "a@b.co", fields: { name: "Dave", signup_source: "tdee-calculator" }, groups: ["222"] }]);
});

test("a protein signup with no protein variable keeps the old group", async () => {
  const { status, sent } = await postWithEnv(
    { email: "a@b.co", src: "protein-calculator" },
    { MAILERLITE_API_KEY: "test", MAILERLITE_GROUP_ID: "111" },
  );
  assert.equal(status, 200);
  assert.deepEqual(sent, [{ email: "a@b.co", fields: { signup_source: "protein-calculator" }, groups: ["111"] }]);
});

test("a guide signup goes to MAILERLITE_GROUP_ID", async () => {
  const { sent } = await postWithEnv({ email: "a@b.co", src: "home" }, { MAILERLITE_API_KEY: "test", ...GROUPS });
  assert.deepEqual(sent[0].groups, ["111"]);
});
