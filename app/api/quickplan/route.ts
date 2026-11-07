// "Plan my week": Community dinners for each night, by how much time there is. No AI calls.
//   POST { days: [{ key: "2026-11-07", level: "quick"|"normal"|"long"|"skip" }], diets: [], avoid: [titles], fixed: { key: recipe } }
//   → { picks: { key: { recipe, minutes } | null }, matches: { key: n }, shared: ["cilantro"] }
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { isCleanRecipe, overLimit, clientIp } from "../../../lib/guard";
import { getTimeFixes } from "../../../lib/times";
import { pickWeek, sharedProduce, type DayAsk } from "../../../lib/quickplan";

export const dynamic = "force-dynamic";

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
const normTitle = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const LEVELS = new Set(["quick", "normal", "long", "skip"]);

let memo: { at: number; pool: any[] } | null = null;
async function pool(): Promise<any[]> {
  if (memo && Date.now() - memo.at < 5 * 60_000) return memo.pool;
  let list = await redis.get<any[]>("community-list:v1");
  if (!list) {
    const keys = await redis.keys("recipe-cache:v1:*");
    const vals = keys.length ? await redis.mget<any[]>(...keys) : [];
    list = vals.filter((r) => isCleanRecipe(r)).slice(0, 200);
    await redis.set("community-list:v1", list, { ex: 300 });
  }
  // older recipes: use their realistic re-estimated times
  const fixes = await getTimeFixes(redis, list.map((r) => normTitle(r.title)));
  const out = list.map((r) => { const f = fixes[normTitle(r.title)]; return f ? { ...r, ...f } : r; });
  memo = { at: Date.now(), pool: out };
  return out;
}

export async function POST(req: NextRequest) {
  try {
    if (await overLimit(redis, `quickplan:${clientIp(req)}`, 60, 600)) return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
    const body = await req.json().catch(() => ({}));
    const days: DayAsk[] = (Array.isArray(body.days) ? body.days : [])
      .filter((d: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(d?.key)) && LEVELS.has(d?.level)).slice(0, 14);
    if (!days.length) return NextResponse.json({ picks: {}, matches: {}, shared: [] });
    const diets = (Array.isArray(body.diets) ? body.diets : []).map(String).slice(0, 8);
    const avoid = (Array.isArray(body.avoid) ? body.avoid : []).map((x: any) => String(x).slice(0, 120)).slice(0, 200);
    const fixed: Record<string, any> = {};
    for (const [k, r] of Object.entries(body.fixed && typeof body.fixed === "object" ? body.fixed : {})) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && r && typeof r === "object") fixed[k] = { title: String((r as any).title || ""), ingredient_groups: (r as any).ingredient_groups || [], grocery_items: (r as any).grocery_items || [] };
    }
    const { picks, matches } = pickWeek(await pool(), days, { diets, avoid, fixed });
    const chosen = [...Object.values(picks).filter(Boolean).map((p) => p!.recipe), ...Object.values(fixed)];
    return NextResponse.json({ picks, matches, shared: sharedProduce(chosen).slice(0, 4) });
  } catch (err) {
    console.error("Quick plan error:", err);
    return NextResponse.json({ error: "Couldn't plan the week just now." }, { status: 500 });
  }
}
