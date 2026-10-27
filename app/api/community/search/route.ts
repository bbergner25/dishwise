// Community recipes matching what someone is typing, so the search can offer the
// free, instant version before writing a brand-new recipe.
//   GET /api/community/search?q=cacio → { results: [{ title, tagline, total }] }
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { isCleanRecipe } from "../../../../lib/guard";
import { totalRange } from "../../../../lib/times";

export const dynamic = "force-dynamic";

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
const INDEX_KEY = "community-index:v1";
type Entry = { title: string; tagline: string; total: string; n: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

let memo: { at: number; list: Entry[] } | null = null;

async function index(): Promise<Entry[]> {
  if (memo && Date.now() - memo.at < 5 * 60_000) return memo.list;
  let list = await redis.get<Entry[]>(INDEX_KEY);
  if (!list) {
    list = [];
    const keys = await redis.keys("recipe-cache:v1:*");
    for (let i = 0; i < keys.length; i += 100) {
      const vals = await redis.mget<any[]>(...keys.slice(i, i + 100));
      for (const r of vals) {
        if (!isCleanRecipe(r)) continue;
        list.push({ title: String(r.title), tagline: String(r.tagline || "").slice(0, 140), total: totalRange(r), n: norm(String(r.title)) });
      }
    }
    await redis.set(INDEX_KEY, list, { ex: 600 }); // rebuilt at most every 10 minutes
  }
  memo = { at: Date.now(), list };
  return list;
}

export async function GET(req: NextRequest) {
  const q = norm(req.nextUrl.searchParams.get("q") || "");
  if (q.length < 3) return NextResponse.json({ results: [] });
  try {
    const words = q.split(" ").filter((w) => w.length > 1);
    const scored = (await index()).map((e) => {
      let s = 0;
      if (e.n === q) s = 100;
      else if (e.n.startsWith(q)) s = 60;
      else if (e.n.includes(q)) s = 40;
      else if (words.length && words.every((w) => e.n.split(" ").some((t) => t.startsWith(w)))) s = 20;
      return { e, s: s ? s - e.n.length / 100 : 0 };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 4);
    const seen = new Set<string>();
    const results = scored.filter(({ e }) => !seen.has(e.n) && seen.add(e.n)).map(({ e }) => ({ title: e.title, tagline: e.tagline, total: e.total }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
