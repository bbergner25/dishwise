import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { DISH_TITLES } from "../../../lib/dishes";
import { buildPrompt } from "../../../lib/prompts";

export const maxDuration = 60;

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_VERSION = "v1"; // must match the version used in app/api/cache/route.ts

function normalize(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

function resolveBaseUrl(req: NextRequest): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return req.nextUrl.origin;
}

async function generateRecipe(req: NextRequest, dish: string): Promise<any> {
  const res = await fetch(`${resolveBaseUrl(req)}/api/recipe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(dish, [], false, "") }],
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw.slice(0, 200)}`);
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error("Not JSON: " + raw.slice(0, 200)); }
  const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s === -1) throw new Error("No JSON in model response");
  return JSON.parse(text.slice(s, e + 1));
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.WARM_SECRET) {
    return NextResponse.json({ error: "Unauthorized — set ?secret=... to match WARM_SECRET in your Vercel env vars." }, { status: 401 });
  }

  const start = parseInt(req.nextUrl.searchParams.get("start") || "0", 10);
  const count = parseInt(req.nextUrl.searchParams.get("count") || "10", 10);

  const batch = DISH_TITLES.slice(start, start + count);

  if (batch.length === 0) {
    return NextResponse.json({ done: true, totalDishes: DISH_TITLES.length, message: "Nothing left to warm." });
  }

  const results = await Promise.all(batch.map(async (title) => {
    const key = `recipe-cache:${CACHE_VERSION}:${normalize(title)}`;
    try {
      const existing = await redis.get(key);
      if (existing) return { title, status: "already-cached" };
      const recipe = await generateRecipe(req, title);
      await redis.set(key, recipe);
      return { title, status: "generated" };
    } catch (err: any) {
      return { title, status: "failed", error: String(err?.message || err) };
    }
  }));

  const nextStart = start + count;
  const done = nextStart >= DISH_TITLES.length;

  return NextResponse.json({
    done,
    processed: results.length,
    totalDishes: DISH_TITLES.length,
    nextStart: done ? null : nextStart,
    results,
  });
}
