// The whole Community library, shared by the Community tab and the fridge matcher.
// Kept in memory for 5 minutes per server instance (one list of ~500 recipes is too big for one Redis value).
import { Redis } from "@upstash/redis";
import { isCleanRecipe } from "./guard";

let memo: { at: number; list: any[] } | null = null;

export async function communityList(redis: Redis): Promise<any[]> {
  if (memo && Date.now() - memo.at < 5 * 60_000) return memo.list;
  const keys = await redis.keys("recipe-cache:v1:*");
  const list: any[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < keys.length; i += 200) {
    const vals = await redis.mget<any[]>(...keys.slice(i, i + 200));
    for (const r of vals) {
      const t = String(r?.title || "").toLowerCase().trim();
      if (!isCleanRecipe(r) || seen.has(t)) continue;
      seen.add(t);
      list.push(r);
    }
  }
  list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  memo = { at: Date.now(), list };
  return list;
}
