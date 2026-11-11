// A plain dish search: returns the Community's recipe, or writes a new one and files it.
// The server builds the prompt and saves the result itself, so the Community only ever
// holds recipes Every Chef wrote.
// A search with a diet set works the same way, filed under its own name per diet combination
// (outside the Community list), so a repeat search is free.
//   POST { dish, diets?, fresh? } → { recipe, fromCache } | { not_a_dish: true }
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { isRude, isCleanRecipe, RECIPE_SYSTEM } from "../../../lib/guard";
import { aiGate } from "../../../lib/aiGate";
import { buildPrompt } from "../../../lib/prompts";
import { findRecipe, fileRecipe, normalizeDish } from "../../../lib/recipeStore";

export const maxDuration = 60;
const DIETS = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Low-Carb"];
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  const body = await req.json().catch(() => ({}));
  const dish = String(body?.dish || "").replace(/\s+/g, " ").trim();
  if (!dish || dish.length > 80) return NextResponse.json({ error: "Invalid dish" }, { status: 400 });
  if (isRude(dish)) return NextResponse.json({ not_a_dish: true });

  const diets: string[] = DIETS.filter((x) => Array.isArray(body?.diets) && body.diets.includes(x));
  const dietKey = diets.length ? `recipe-diet:v1:${diets.join("+").toLowerCase()}:${normalizeDish(dish)}` : "";

  try {
    if (!body?.fresh) {
      const found = dietKey
        ? await redis.get<any>(dietKey).then((r) => (isCleanRecipe(r, dish) ? r : null)).catch(() => null)
        : await findRecipe(redis, dish).catch(() => null);
      if (found) return NextResponse.json({ recipe: found, fromCache: true });
    }
    const stop = await aiGate(req, redis);
    if (stop === "person") return NextResponse.json({ error: "RATE_LIMIT: too many new recipes in a short time" }, { status: 429 });
    if (stop === "all") return NextResponse.json({ error: { message: "overloaded: daily limit reached" } }, { status: 529 });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2048, system: RECIPE_SYSTEM, messages: [{ role: "user", content: buildPrompt(dish, diets, false, "") }] }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const s = text.indexOf("{"), e = text.lastIndexOf("}");
    if (s === -1 || e <= s) return NextResponse.json({ error: "No recipe came back" }, { status: 502 });
    let recipe: any;
    try { recipe = JSON.parse(text.slice(s, e + 1)); } catch { return NextResponse.json({ error: "The recipe came back garbled" }, { status: 502 }); }
    if (recipe?.not_a_dish) return NextResponse.json({ not_a_dish: true });
    if (dietKey) { if (isCleanRecipe(recipe, dish)) await redis.set(dietKey, recipe, { nx: true }).catch(() => {}); }
    else await fileRecipe(redis, dish, recipe).catch((err) => console.error("File recipe error:", err));
    return NextResponse.json({ recipe, fromCache: false });
  } catch (err) {
    console.error("Dish error:", err);
    return NextResponse.json({ error: "Failed to reach Anthropic API" }, { status: 502 });
  }
}
