import { isStepCount, streamText, tool } from "ai";
import { z } from "zod";
import { business } from "../lib/business.ts";
import {
  clientKey,
  corsHeaders,
  createDashStream,
  createPriceStream,
  ensureAnabolicReply,
  formatReply,
  knownPage,
  normaliseMessages,
  sameOrigin,
  scrubDashes,
  scrubOwnUse,
  scrubPrices,
  takeRateLimit,
} from "../lib/guard.ts";
import { saveLead, validateLead } from "../lib/leads.ts";
import { buildInstructions, publicWidget } from "../lib/prompt.ts";

export const maxDuration = 30;

const leadSchema = z.object({
  name: z.string().describe("The visitor's name"),
  email: z.string().describe("The email address they gave"),
  goal: z.string().describe("What they want, in their words"),
});

function reply(body: unknown, status = 200, extra?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...extra },
  });
}

function limited(retryAfter: number, cors: Record<string, string>): Response {
  return reply(
    { error: "You've sent quite a few messages. Give it a minute, or apply and Callum will read it himself." },
    429,
    { "retry-after": String(retryAfter), ...cors },
  );
}

function cleanReply(text: string, userText = ""): string {
  const priced = scrubOwnUse(scrubDashes(scrubPrices(text, business.allowedPrices, business.priceStandIn)));
  return formatReply(ensureAnabolicReply(userText, priced));
}

export function GET(request: Request): Response {
  return Response.json(publicWidget(business), {
    headers: { "cache-control": "public, max-age=300", ...corsHeaders(request, business.origins) },
  });
}

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request, business.origins) });
}

export async function POST(request: Request): Promise<Response> {
  const cors = corsHeaders(request, business.origins);
  const json = (body: unknown, status = 200, extra?: HeadersInit) =>
    reply(body, status, { ...cors, ...extra });
  if (!sameOrigin(request, business.origins)) {
    return json({ error: "Open the chat on the site and try again." }, 403);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 24_000) {
    return json({ error: "That message is a bit long. Try a shorter question." }, 413);
  }

  const limit = takeRateLimit(
    clientKey(request),
    Date.now(),
    business.limits.windowMs,
    business.limits.maxRequests,
  );
  if (!limit.ok) return limited(limit.retryAfter, cors);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "I couldn't read that. Try again." }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ error: "I couldn't read that. Try again." }, 400);
  }

  const page = knownPage((body as { page?: unknown }).page, business.pages);
  const leadBody = (body as { lead?: unknown }).lead;
  if (leadBody && typeof leadBody === "object") {
    const parsed = validateLead(leadBody, "chat-form", page);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const saved = await saveLead(business, parsed.lead);
    if (!saved.ok) {
      return json(
        {
          error: "I couldn't save that just now. Apply and it comes straight to Callum.",
        },
        503,
      );
    }
    return json({
      ok: true,
      notified: saved.notified,
      actions: ["apply"],
      message: `${parsed.lead.name}, that's with Callum. The next step is still to apply. He reads it himself.`,
    });
  }

  const messages = normaliseMessages((body as { messages?: unknown }).messages, business.limits);
  if (!messages.ok) return json({ error: messages.error }, messages.status);
  const latestUser = [...messages.messages].reverse().find((message) => message.role === "user")?.content ?? "";

  const model = process.env.AI_GATEWAY_MODEL || business.model;
  let savedLead = false;
  const result = streamText({
    model,
    instructions: buildInstructions(business, page),
    messages: messages.messages,
    maxOutputTokens: 120,
    temperature: 0.2,
    reasoning: "none",
    stopWhen: isStepCount(4),
    tools: {
      saveLead: tool({
        description:
          "Save a note for Callum once the visitor has given their name, email, and a line about their goal. Call this before confirming. Do not say it was emailed.",
        inputSchema: leadSchema,
        execute: async (input) => {
          const parsed = validateLead(input, "chat-tool", page);
          if (!parsed.ok) return { ok: false, error: parsed.error };
          const saved = await saveLead(business, parsed.lead);
          savedLead = saved.ok;
          if (!saved.ok) {
            return {
              ok: false,
              error: "The details could not be stored. Ask them to apply.",
            };
          }
          return {
            ok: true,
            notified: saved.notified,
            note: "Stored for Callum. Do not say it was emailed. The next step is still to apply. End with [[apply]].",
          };
        },
      }),
    },
    onError({ error }) {
      console.error("chat model error", error instanceof Error ? error.name : "error");
    },
  });

  const prices = createPriceStream(business.allowedPrices, business.priceStandIn);
  const dashes = createDashStream();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let raw = "";
      try {
        for await (const delta of result.textStream) raw += delta;
        const joined = dashes.push(prices.push(raw)) + dashes.push(prices.flush()) + dashes.flush();
        const fallback = savedLead
          ? "Thanks. That's with Callum. Applying is still the way to go ahead. He reads it himself."
          : "Sorry, I missed that. Ask me about the coaching, or apply and Callum will read it himself.";
        controller.enqueue(encoder.encode(cleanReply(joined.trim() ? joined : fallback, latestUser)));
      } catch (error) {
        console.error("chat stream error", error instanceof Error ? error.name : "error");
        controller.enqueue(
          encoder.encode(
            cleanReply("Sorry, I can't answer just now. You can still apply, and Callum will read it himself."),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      ...cors,
    },
  });
}
