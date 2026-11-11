import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { RECIPE_SYSTEM as SYSTEM } from "../../../lib/guard";
import { aiGate } from "../../../lib/aiGate";

// Generating a full recipe takes ~15–40s. Without this, Vercel cuts the function off
// at its short default and the request comes back as a 504 timeout.
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";
const ALLOWED_MODELS = new Set([MODEL, "claude-haiku-5-5"]); // Haiku for small helper jobs
const MAX_TOKENS = 2048;
const MAX_TEXT = 30_000; // the longest thing the app sends is an imported page, about 13,000 characters
// Keeps this connection to Every Chef's own job, so it's useless as a free general-purpose AI.


const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

function textLength(content: any): number {
  if (typeof content === "string") return content.length;
  if (Array.isArray(content)) return content.reduce((n, b) => n + (b?.type === "text" ? String(b.text || "").length : 0), 0);
  return 0;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Only the shape the app sends: a short conversation of text (and, for scans, a few images).
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || !messages.length || messages.length > 4 ||
      messages.some((m: any) => !["user", "assistant"].includes(m?.role)) ||
      messages.reduce((n: number, m: any) => n + textLength(m.content), 0) > MAX_TEXT ||
      messages.reduce((n: number, m: any) => n + (Array.isArray(m.content) ? m.content.filter((b: any) => b?.type === "image").length : 0), 0) > 4) {
    return NextResponse.json({ error: "Request not allowed" }, { status: 400 });
  }

  // Rate limits: per person (signed in) or per network (signed out), plus a daily ceiling for everyone.
  const stop = await aiGate(req, redis);
  if (stop === "person") return NextResponse.json({ error: "RATE_LIMIT: too many new recipes in a short time" }, { status: 429 });
  if (stop === "all") return NextResponse.json({ error: { message: "overloaded: daily limit reached" } }, { status: 529 });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: ALLOWED_MODELS.has(body.model) ? body.model : MODEL, max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS), system: SYSTEM, messages }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach Anthropic API" },
      { status: 502 }
    );
  }
}
