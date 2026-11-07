// Nutrition per serving, an AI estimate from the ingredients. Worked out once per version of a recipe
// (keyed by its title, servings and ingredients), so Community recipes cost one small call for everyone.
//   POST { recipe: { title, servings, ingredient_groups } } → { n: { calories, protein, carbs, fat, fiber, sugar, sodium } }
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createHash } from "crypto";
import { overLimit, clientIp } from "../../../lib/guard";

export const maxDuration = 30;
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
const FIELDS = ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"] as const;
const MAX: Record<string, number> = { calories: 4000, protein: 300, carbs: 500, fat: 300, fiber: 100, sugar: 300, sodium: 10000 };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const r = body?.recipe || {};
    const title = String(r.title || "").slice(0, 120);
    const servings = String(r.servings || "").slice(0, 20);
    const ings: string[] = (Array.isArray(r.ingredient_groups) ? r.ingredient_groups : [])
      .flatMap((g: any) => (Array.isArray(g?.items) ? g.items : []).map((i: any) => `${i?.amount || ""} ${i?.name || ""}`.trim().slice(0, 120)))
      .filter(Boolean).slice(0, 60);
    if (!title || ings.length < 2) return NextResponse.json({ error: "Not enough to go on" }, { status: 400 });

    const key = "nutrition:v1:" + createHash("sha1").update(JSON.stringify([title.toLowerCase().trim(), servings, ings])).digest("hex");
    const hit = await redis.get<any>(key);
    if (hit) return NextResponse.json({ n: hit });

    if (await overLimit(redis, `nutrition:${clientIp(req)}`, 40, 600)) return NextResponse.json({ error: "Too many tries" }, { status: 429 });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

    const prompt = `Estimate the nutrition PER SERVING for this recipe, using typical values for each ingredient at the amounts given.
Recipe: ${title}
Serves: ${servings || "4"}
Ingredients:
${ings.join("\n")}

Divide the whole recipe by the number of servings. Ingredients "to taste" or "for serving" count as small typical amounts. Count oil used for frying only partly (some stays in the pan). Don't count water.
Reply with ONLY valid JSON of whole numbers: {"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0} (protein, carbs, fat, fiber, sugar in grams; sodium in milligrams)`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const text = (data.content || []).map((c: any) => c.text || "").join("");
    const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const n: Record<string, number> = {};
    for (const f of FIELDS) {
      const v = Math.round(Number(j[f]));
      if (!Number.isFinite(v) || v < 0 || v > MAX[f]) throw new Error(`Bad ${f}`);
      n[f] = v;
    }
    if (n.calories < 30) throw new Error("Too low");
    await redis.set(key, n);
    return NextResponse.json({ n });
  } catch (err) {
    console.error("Nutrition error:", err);
    return NextResponse.json({ error: "Couldn't estimate nutrition" }, { status: 500 });
  }
}
