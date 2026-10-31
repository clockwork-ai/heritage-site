// Photo body-fat estimate for the TDEE page. The page posts { email, image }
// and reads { data: { valid, body_fat_percent, range_low, range_high, note, confidence } }.
// The model is the same AI Gateway model as the coaching chat. The photo is
// not stored. If the photo cannot be read, and age, height, weight and sex
// are present, the response uses the Deurenberg 1991 formula instead.

import { generateObject } from "ai";
import { z } from "zod";
import { FORMULA_NOTE, deurenberg, imageFromDataUrl, parseStats } from "../lib/bf-estimate.ts";
import { business } from "../lib/business.ts";
import { clientKey, corsHeaders, sameOrigin, scrubDashes, takeRateLimit } from "../lib/guard.ts";
import { validEmail } from "../lib/mailerlite.ts";

export const maxDuration = 30;

const photoSchema = z.object({
  valid: z.boolean(),
  body_fat_percent: z.number().nullable(),
  range_low: z.number().nullable(),
  range_high: z.number().nullable(),
  confidence: z.enum(["low", "moderate"]).nullable(),
  note: z.string(),
});

export type PhotoRead = z.infer<typeof photoSchema>;

type Estimate = (input: {
  bytes: Uint8Array;
  mediaType: string;
  sex: string;
  age: number;
  heightCm: number;
  weightKg: number;
}) => Promise<PhotoRead>;

const DEFAULT_NOTE =
  "Rough visual estimate from the photo, not a measurement. The tape method on this page is the more repeatable check.";

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

function fail(request: Request, message: string, status: number): Response {
  return json(request, { error: { message } }, status);
}

function formulaResponse(request: Request, percent: number): Response {
  return json(request, {
    data: {
      valid: true,
      body_fat_percent: percent,
      range_low: percent,
      range_high: percent,
      confidence: null,
      note: FORMULA_NOTE,
      method: "deurenberg-1991",
    },
  });
}

function band(percent: number, low: number | null, high: number | null): { low: number; high: number } {
  let a = typeof low === "number" && Number.isFinite(low) ? low : percent - 4;
  let b = typeof high === "number" && Number.isFinite(high) ? high : percent + 4;
  if (a > b) [a, b] = [b, a];
  if (b - a < 8) {
    a = percent - 4;
    b = percent + 4;
  }
  a = Math.max(3, Math.round(a));
  b = Math.min(60, Math.round(b));
  if (b - a < 8) {
    a = Math.max(3, Math.round(percent) - 4);
    b = Math.min(60, a + 8);
  }
  return { low: a, high: b };
}

function photoResponse(request: Request, read: PhotoRead): Response | null {
  if (!read.valid || typeof read.body_fat_percent !== "number" || !Number.isFinite(read.body_fat_percent)) return null;
  const percent = Math.round(read.body_fat_percent * 10) / 10;
  if (percent < 3 || percent > 60) return null;
  const range = band(percent, read.range_low, read.range_high);
  let note = scrubDashes(read.note || "").replace(/\s+/g, " ").trim().slice(0, 400);
  if (!note) note = DEFAULT_NOTE;
  return json(request, {
    data: {
      valid: true,
      body_fat_percent: percent,
      range_low: range.low,
      range_high: range.high,
      confidence: read.confidence === "moderate" ? "moderate" : "low",
      note,
      method: "photo",
    },
  });
}

export async function estimatePhoto(input: {
  bytes: Uint8Array;
  mediaType: string;
  sex: string;
  age: number;
  heightCm: number;
  weightKg: number;
}): Promise<PhotoRead> {
  const model = process.env.AI_GATEWAY_MODEL || "openai/gpt-4.1-mini";
  const context = [
    input.sex === "male" || input.sex === "female" ? `Sex on the calculator: ${input.sex}.` : "",
    input.age > 0 ? `Age: ${input.age}.` : "",
    input.heightCm > 0 ? `Height cm: ${input.heightCm}.` : "",
    input.weightKg > 0 ? `Weight kg: ${input.weightKg}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const result = await generateObject({
    model,
    schema: photoSchema,
    schemaName: "body_fat_estimate",
    schemaDescription: "A rough visual body-fat estimate from one photo.",
    temperature: 0.2,
    maxOutputTokens: 300,
    abortSignal: AbortSignal.timeout(18000),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Estimate body fat from this one photo for an adult using a coaching calculator.",
              "It is a rough visual guess, not a measurement and not medical advice.",
              "If the photo does not clearly show an adult person's torso from the front, set valid to false, leave the numbers null, and explain in note that the photo was not clear enough. Do not invent a number.",
              "If it does: body_fat_percent is the middle of a wide band, one decimal, between 3 and 60.",
              "range_low and range_high must be at least 8 percentage points apart. A photo cannot support a tighter figure.",
              "confidence is low or moderate. Never high.",
              "note is one or two short sentences in plain British English. Say it is a rough visual estimate, not a measurement, and that the tape method on the same page is the more repeatable check.",
              "No em dashes and no en dashes. For a range write the word to.",
              "Do not state a clinical reading, a health claim, or a precise percentage as fact.",
              context ? `Calculator context, use only as context: ${context}` : "",
            ]
              .filter(Boolean)
              .join(" "),
          },
          { type: "image", image: input.bytes, mediaType: input.mediaType },
        ],
      },
    ],
  });
  return result.object;
}

export async function POST(request: Request, estimate?: Estimate): Promise<Response> {
  const readPhoto = typeof estimate === "function" ? estimate : estimatePhoto;
  if (!sameOrigin(request, business.origins)) return fail(request, "Open the calculator on the site and try again.", 403);

  const length = Number(request.headers.get("content-length") || 0);
  if (length > 2_000_000) return fail(request, "That photo is too large. Try a smaller one.", 413);

  const limit = takeRateLimit(`bf:${clientKey(request)}`, Date.now(), 60 * 60 * 1000, 6);
  if (!limit.ok) {
    return fail(request, "Too many estimates from this connection. Try again in a little while, or use the tape measure.", 429);
  }

  let data: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.length > 2_000_000) return fail(request, "That photo is too large. Try a smaller one.", 413);
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fail(request, "Couldn't read that. Try again.", 400);
    }
    data = parsed as Record<string, unknown>;
  } catch {
    return fail(request, "Couldn't read that. Try again.", 400);
  }

  if (!validEmail(data.email)) return fail(request, "That email doesn't look right.", 422);

  const stats = parseStats({
    sex: data.sex,
    age: data.age,
    heightCm: data.height_cm,
    weightKg: data.weight_kg,
  });
  const image = imageFromDataUrl(data.image);
  const formula = stats ? deurenberg(stats) : null;

  if (!image) {
    if (formula != null) {
      console.info("bf estimate method=deurenberg-1991 reason=image");
      return formulaResponse(request, formula);
    }
    return json(request, {
      data: {
        valid: false,
        note: "Choose a photo first. Or add your age, height and weight in the calculator above and try again.",
        method: "none",
      },
    });
  }

  try {
    const read = await readPhoto({
      bytes: image.bytes,
      mediaType: image.mediaType,
      sex: stats?.sex || "",
      age: stats?.age || 0,
      heightCm: stats?.heightCm || 0,
      weightKg: stats?.weightKg || 0,
    });
    const photo = photoResponse(request, read);
    if (photo) {
      console.info("bf estimate method=photo");
      return photo;
    }
  } catch (error) {
    console.error("bf estimate photo failed", error instanceof Error ? error.name : "error");
    if (formula == null) {
      return fail(request, "Couldn't finish that estimate. Try the tape measure, or try again in a minute.", 502);
    }
  }

  if (formula != null) {
    console.info("bf estimate method=deurenberg-1991 reason=photo");
    return formulaResponse(request, formula);
  }

  return json(request, {
    data: {
      valid: false,
      note: "That photo was not clear enough for a read. Try a front-on progress-style photo, or use the tape measure.",
      method: "none",
    },
  });
}
