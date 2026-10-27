import { isCleanRecipe, overLimit, clientIp } from "../../../lib/guard";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_VERSION = "v1"; // bump this if you ever need to force-regenerate everything (e.g. after a major prompt change)

// Normalize a dish name to a cache key
function normalize(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ found: false });
  try {
    const key = `recipe-cache:${CACHE_VERSION}:${normalize(q)}`;
    const cached = await redis.get<any>(key);
    if (cached && isCleanRecipe(cached, q)) {
      return NextResponse.json({ found: true, recipe: cached });
    }
    // Not filed under this name? It may be filed under the original search
    // (e.g. "Classic Lasagna" lives under "lasagna"), so check the Community index by title.
    const index = await redis.get<{ n: string; key: string }[]>("community-index:v2");
    const t = normalize(q).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
    const hit = index?.find((e) => e.n === t);
    if (hit) {
      const byTitle = await redis.get<any>(`recipe-cache:${CACHE_VERSION}:${hit.key}`);
      if (byTitle && isCleanRecipe(byTitle)) return NextResponse.json({ found: true, recipe: byTitle });
    }
    return NextResponse.json({ found: false });
  } catch (err) {
    console.error("Cache GET error:", err);
    return NextResponse.json({ found: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { dish, recipe } = await req.json();
    if (!dish || !recipe) {
      return NextResponse.json({ error: "Missing dish or recipe" }, { status: 400 });
    }
    // Only real, complete recipes with clean names join the Community library
    if (typeof dish !== "string" || dish.length > 80 || !isCleanRecipe(recipe, dish)) {
      return NextResponse.json({ ok: false, skipped: true });
    }
    if (await overLimit(redis, `cachew:${clientIp(req)}`, 40, 3600)) {
      return NextResponse.json({ ok: false, skipped: true });
    }
    const key = `recipe-cache:${CACHE_VERSION}:${normalize(dish)}`;
    // No expiration — these recipes are the permanent Community inventory now, not a temporary cache
    // never overwrite a Community recipe someone already made; a fresh version stays with its maker
    await redis.set(key, recipe, { nx: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cache POST error:", err);
    return NextResponse.json({ error: "Failed to cache" }, { status: 500 });
  }
}
