import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { buildPrompt } from "../../../lib/prompts";

export const maxDuration = 60;

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_VERSION = "v1";
const TRENDING_KEY = "trending:current";
const DISH_COUNT = 6;

function normalize(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

function resolveBaseUrl(req: NextRequest): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return req.nextUrl.origin;
}

// Step 1 — Ask Claude (with web search) what's trending in food right now
async function fetchTrendingDishes(): Promise<string[]> {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{
        role: "user",
        content: `Search for what food dishes and recipes are trending right now in ${month} ${year}. 
Check food blogs, social media trends (TikTok food trends, Instagram food), and culinary publications like Bon Appétit, Food52, and NYT Cooking.
Return ONLY a valid JSON array of exactly ${DISH_COUNT} dish names — no explanation, no markdown, just the JSON array.
Choose dishes that are genuinely trending socially right now, not just classics.
Example format: ["Birria Tacos","Smash Burgers","Cottage Cheese Ice Cream","Marry Me Chicken","Pistachio Latte Cake","Chamoy Pickles"]`,
      }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
  const data = await response.json();

  // Extract text from response content blocks
  const text = (data.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  // Find JSON array in response
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error("No JSON array found in trend response");

  const dishes: string[] = JSON.parse(match[0]);
  if (!Array.isArray(dishes) || dishes.length === 0) throw new Error("Empty dish array");

  return dishes.slice(0, DISH_COUNT);
}

// Step 2 — Generate a recipe via the existing /api/recipe route
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
  if (!res.ok) throw new Error(`Recipe generation failed: ${raw.slice(0, 200)}`);
  const data = JSON.parse(raw);
  const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s === -1) throw new Error("No JSON in recipe response");
  return JSON.parse(text.slice(s, e + 1));
}

// GET /api/trending-agent?secret=YOUR_SECRET
// Also called automatically by Vercel cron on the 1st and 15th
export async function GET(req: NextRequest) {
  // Accept either query param secret or Vercel cron Authorization header
  const secret = req.nextUrl.searchParams.get("secret");
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.WARM_SECRET;
  const authorized =
    (secret && secret === process.env.WARM_SECRET) ||
    (authHeader && authHeader === `Bearer ${cronSecret}`);

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { dish: string; status: string; error?: string }[] = [];

  try {
    // 1. Get trending dishes from Claude + web search
    const dishes = await fetchTrendingDishes();

    // 2. For each dish: check cache → generate if missing → store
    const finalDishes: string[] = [];

    for (const dish of dishes) {
      const cacheKey = `recipe-cache:${CACHE_VERSION}:${normalize(dish)}`;
      try {
        const existing = await redis.get(cacheKey);
        if (existing) {
          results.push({ dish, status: "already-cached" });
          finalDishes.push(dish);
          continue;
        }
        // Generate and cache
        const recipe = await generateRecipe(req, dish);
        await redis.set(cacheKey, recipe);
        results.push({ dish, status: "generated" });
        finalDishes.push(dish);
      } catch (err: any) {
        results.push({ dish, status: "failed", error: String(err?.message || err) });
        // Still add to the list even if generation failed — app will generate on demand
        finalDishes.push(dish);
      }
    }

    // 3. Write trending list to Redis (no expiry — overwrites on each run)
    const trendingData = {
      dishes: finalDishes,
      generatedAt: new Date().toISOString(),
      cycle: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${new Date().getDate() <= 15 ? "01" : "15"}`,
    };
    await redis.set(TRENDING_KEY, trendingData);

    return NextResponse.json({ ok: true, dishes: finalDishes, results });
  } catch (err: any) {
    console.error("Trending agent error:", err);
    return NextResponse.json({ error: String(err?.message || err), results }, { status: 500 });
  }
}
