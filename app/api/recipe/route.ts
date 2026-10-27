import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";
import { overLimit, clientIp } from "../../../lib/guard";

// Generating a full recipe takes ~15–40s. Without this, Vercel cuts the function off
// at its short default and the request comes back as a 504 timeout.
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
const DAILY_CAP = Number(process.env.ANTHROPIC_DAILY_CALL_CAP || 5000); // all users together
// Keeps this connection to Every Chef's own job, so it's useless as a free general-purpose AI.
const SYSTEM = `You are the recipe engine inside Every Chef, a home-cooking app. Only do what the request asks when it is about food, drinks, recipes, cooking, meal planning or groceries, and answer in the JSON format it asks for. If the request is about anything else, or asks for a recipe for something that isn't real food or drink (a joke, an insult, something gross or offensive), reply with only {"not_a_dish":true}.`;

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
      messages.reduce((n: number, m: any) => n + textLength(m.content), 0) > 120_000 ||
      messages.reduce((n: number, m: any) => n + (Array.isArray(m.content) ? m.content.filter((b: any) => b?.type === "image").length : 0), 0) > 4) {
    return NextResponse.json({ error: "Request not allowed" }, { status: 400 });
  }

  // Rate limits: per person (signed in) or per network (signed out), plus a daily ceiling for everyone.
  let who = `ip:${clientIp(req)}`;
  try { const { userId } = await auth(); if (userId) who = `u:${userId}`; } catch {}
  const signedIn = who.startsWith("u:");
  if (await overLimit(redis, `ai10m:${who}`, signedIn ? 60 : 30, 600) ||
      await overLimit(redis, `aiday:${who}`, signedIn ? 400 : 120, 86400)) {
    return NextResponse.json({ error: "RATE_LIMIT: too many new recipes in a short time" }, { status: 429 });
  }
  if (await overLimit(redis, "aiday:all", DAILY_CAP, 86400)) {
    return NextResponse.json({ error: { message: "overloaded: daily limit reached" } }, { status: 529 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS), system: SYSTEM, messages }),
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
