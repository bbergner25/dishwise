// "Cook with what you have": Community recipes that use up what someone has, before
// writing new ideas. Free and instant, since nothing is generated.
//   POST /api/pantry { items: ["chicken thighs","spinach"], maxMinutes?: 45 }
//   → { results: [{ recipe, uses: [...], need: [...] }] }
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";
import { isCleanRecipe, isRude, overLimit, clientIp } from "../../../lib/guard";
import { pantryFit } from "../../../lib/pantry";
import { totalRange, toMinutes } from "../../../lib/times";
import { PROMOTED_DISHES } from "../../../lib/promoted";

export const dynamic = "force-dynamic";

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
const norm = (q: string) => q.toLowerCase().trim().replace(/\s+/g, " ");

async function communityRecipes(signedIn: boolean): Promise<any[]> {
  if (!signedIn) {
    if (!PROMOTED_DISHES.length) return [];
    const vals = await redis.mget<any[]>(...PROMOTED_DISHES.map((t) => `recipe-cache:v1:${norm(t)}`));
    return vals.filter((r) => isCleanRecipe(r));
  }
  const LIST_KEY = "community-list:v1"; // same 5-minute list the Community tab uses
  let list = await redis.get<any[]>(LIST_KEY);
  if (!list) {
    const keys = await redis.keys("recipe-cache:v1:*");
    const vals = keys.length ? await redis.mget<any[]>(...keys) : [];
    list = vals.filter((r) => isCleanRecipe(r)).slice(0, 200);
    await redis.set(LIST_KEY, list, { ex: 300 });
  }
  return list;
}

export async function POST(req: NextRequest) {
  try {
    if (await overLimit(redis, `pantry:${clientIp(req)}`, 40, 600)) return NextResponse.json({ results: [] }, { status: 429 });
    const body = await req.json().catch(() => ({}));
    const items: string[] = (Array.isArray(body.items) ? body.items : [])
      .map((s: any) => String(s || "").trim().slice(0, 60)).filter((s: string) => s && !isRude(s)).slice(0, 25);
    if (!items.length) return NextResponse.json({ results: [] });
    const maxMinutes = Number(body.maxMinutes) || 0;
    const { userId } = await auth();

    const minUses = items.length >= 3 ? 2 : 1;
    const seen = new Set<string>();
    const results = (await communityRecipes(!!userId))
      .map((recipe) => ({ recipe, ...pantryFit(recipe, items) }))
      .filter((x) => {
        if (x.uses.length < minUses || x.need.length > 4) return false;
        if (maxMinutes) {
          const hi = toMinutes(totalRange(x.recipe).split("–").pop());
          if (hi && hi > maxMinutes) return false;
        }
        const t = norm(String(x.recipe.title));
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      })
      .sort((a, b) => b.uses.length - a.uses.length || a.need.length - b.need.length)
      .slice(0, 4);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Pantry match error:", err);
    return NextResponse.json({ results: [] });
  }
}
