import assert from "node:assert/strict";
import { test } from "node:test";
import { deurenberg } from "../lib/bf-estimate.ts";
import { resetRateLimits } from "../lib/guard.ts";
import { POST, type PhotoRead } from "./bf.ts";

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function pngClaiming(width: number, height: number): string {
  const bytes = Buffer.alloc(64);
  bytes[0] = 0x89;
  bytes[1] = 0x50;
  bytes[2] = 0x4e;
  bytes[3] = 0x47;
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

const PHOTO = pngClaiming(400, 600);

function request(body: unknown, ip = "203.0.113.20"): Request {
  return new Request("https://preview.vercel.app/api/bf", {
    method: "POST",
    headers: {
      origin: "https://preview.vercel.app",
      host: "preview.vercel.app",
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const stats = { sex: "male", age: 30, height_cm: 178, weight_kg: 85, email: "test+preview@callumbcoaching.co.uk" };

test("deurenberg matches the 1991 formula for a man and a woman", () => {
  assert.equal(deurenberg({ sex: "male", age: 30, heightCm: 178, weightKg: 85 }), 22.9);
  assert.equal(deurenberg({ sex: "female", age: 30, heightCm: 178, weightKg: 85 }), 33.7);
  assert.equal(deurenberg({ sex: "male", age: 10, heightCm: 178, weightKg: 85 }), null);
});

test("an unreadable photo with calculator stats uses the formula", async () => {
  resetRateLimits();
  let called = false;
  const res = await POST(request({ ...stats, image: "not-a-photo" }), async () => {
    called = true;
    throw new Error("should not run");
  });
  assert.equal(called, false);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.valid, true);
  assert.equal(body.data.method, "deurenberg-1991");
  assert.equal(body.data.body_fat_percent, 22.9);
  assert.match(body.data.note, /not a reading of the photo/);
  assert.equal(body.data.note.includes("\u2014"), false);
});

test("a tiny photo uses the formula instead of inventing a reading", async () => {
  resetRateLimits();
  let called = false;
  const res = await POST(request({ ...stats, image: PIXEL }, "203.0.113.24"), async () => {
    called = true;
    throw new Error("should not run");
  });
  assert.equal(called, false);
  const body = await res.json();
  assert.equal(body.data.method, "deurenberg-1991");
  assert.equal(body.data.body_fat_percent, 22.9);
});

test("a photo read is returned with a wide range", async () => {
  resetRateLimits();
  const res = await POST(
    request({ ...stats, image: PHOTO }, "203.0.113.21"),
    async (): Promise<PhotoRead> => ({
      valid: true,
      body_fat_percent: 18.2,
      range_low: 17,
      range_high: 19,
      confidence: "moderate",
      note: "Rough visual estimate, not a measurement. The tape method is the more repeatable check.",
    }),
  );
  const body = await res.json();
  assert.equal(body.data.method, "photo");
  assert.equal(body.data.body_fat_percent, 18.2);
  assert.equal(body.data.confidence, "moderate");
  assert.ok(body.data.range_high - body.data.range_low >= 8);
});

test("a failed photo read falls back to the formula when stats are present", async () => {
  resetRateLimits();
  const res = await POST(
    request({ ...stats, image: PHOTO }, "203.0.113.22"),
    async () => {
      throw new Error("gateway down");
    },
  );
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.method, "deurenberg-1991");
  assert.equal(body.data.body_fat_percent, 22.9);
});

test("a failed photo read without stats tells the visitor to use the tape", async () => {
  resetRateLimits();
  const res = await POST(
    request({ email: "test+preview@callumbcoaching.co.uk", image: PHOTO }, "203.0.113.23"),
    async () => {
      throw new Error("gateway down");
    },
  );
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.match(body.error.message, /tape measure/);
});

test("another site cannot call the estimate", async () => {
  const res = await POST(
    new Request("https://preview.vercel.app/api/bf", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        host: "preview.vercel.app",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "a@b.co", image: PIXEL }),
    }),
  );
  assert.equal(res.status, 403);
});
