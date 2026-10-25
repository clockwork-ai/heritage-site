import assert from "node:assert/strict";
import { test } from "node:test";
import { GUIDE_DOWNLOAD, OPTIONS, POST } from "./lead.ts";

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
