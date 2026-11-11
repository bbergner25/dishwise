// Finding and filing Community recipes. Only the server files them: a recipe joins the
// Community when Every Chef wrote it here, never because a phone sent one in.
import type { Redis } from "@upstash/redis";
import { isCleanRecipe } from "./guard";
import { coreTitle } from "./dupes";

const V = "v1"; // bump to force-regenerate everything (e.g. after a major prompt change)
export const normalizeDish = (q: string) => q.toLowerCase().trim().replace(/\s+/g, " ");
const plain = (q: string) => normalizeDish(q).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export async function findRecipe(redis: Redis, q: string): Promise<any | null> {
  const n = normalizeDish(q);
  const cached = (await redis.get<any>(`recipe-cache:${V}:${n}`)) || (await redis.get<any>(`recipe-variant:${V}:${n}`));
  if (cached && isCleanRecipe(cached, q)) return cached;
  // Not filed under this name? It may be filed under the original search
  // (e.g. "Classic Lasagna" lives under "lasagna"), so check the Community index by title.
  const index = await redis.get<{ n: string; key: string }[]>("community-index:v2");
  const hit = index?.find((e) => e.n === plain(q));
  if (hit) {
    const byTitle = await redis.get<any>(`recipe-cache:${V}:${hit.key}`);
    if (byTitle && isCleanRecipe(byTitle)) return byTitle;
  }
  return null;
}

// Files a recipe Every Chef just wrote. Never overwrites one that's already there.
export async function fileRecipe(redis: Redis, dish: string, recipe: any): Promise<"filed" | "variant" | "skipped"> {
  if (dish.length > 80 || !isCleanRecipe(recipe, dish)) return "skipped";
  const n = normalizeDish(dish);
  // the Community already has this dish under another name? keep this version for searches, out of the Community list
  const idx = await redis.get<{ n: string; key: string }[]>("community-index:v2");
  const core = coreTitle(recipe.title);
  if (idx?.some((e) => e.key !== n && coreTitle(e.n) === core)) {
    await redis.set(`recipe-variant:${V}:${n}`, recipe, { nx: true });
    return "variant";
  }
  // No expiration: these recipes are the permanent Community inventory
  await redis.set(`recipe-cache:${V}:${n}`, recipe, { nx: true });
  return "filed";
}
