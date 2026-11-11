// A person's saved recipes (their library), kept on their account so every device has it.
//   GET  → { recipes, removed: [ids] }
//   POST { changed: [recipes], removed: [ids] } → { ok }
// Each device sends only what it changed, and the account remembers deletions, so one device
// can't bring back a recipe another deleted or overwrite an edit with its older copy.
// Older copies of the app send { recipes: [whole list] }: those only ever add missing recipes.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";
import { mergeLibrary, MAX_RECIPES } from "../../../lib/libraryMerge";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const MAX_ALL = 8_000_000;
const KEEP_REMOVED_MS = 365 * 864e5;
const listKey = (u: string) => `recipes:${u}`;
const goneKey = (u: string) => `recipes-removed:${u}`; // { id: time removed }

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [recipes, gone] = await Promise.all([redis.get<any[]>(listKey(userId)), redis.get<Record<string, number>>(goneKey(userId))]);
    return NextResponse.json({ recipes: recipes || [], removed: Object.keys(gone || {}) });
  } catch (err) {
    console.error("Redis GET error:", err);
    return NextResponse.json({ error: "Failed to load recipes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const [had, goneWas] = await Promise.all([redis.get<any[]>(listKey(userId)), redis.get<Record<string, number>>(goneKey(userId))]);
    const now = Date.now();
    const merged = mergeLibrary(Array.isArray(had) ? had : [], goneWas || {}, body, now);
    if (!merged) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
    const { list, gone } = merged;

    if (list.length > MAX_RECIPES || JSON.stringify(list).length > MAX_ALL) return NextResponse.json({ error: "Library is full" }, { status: 413 });
    for (const id of Object.keys(gone)) if (now - gone[id] > KEEP_REMOVED_MS) delete gone[id];
    await Promise.all([redis.set(listKey(userId), list), redis.set(goneKey(userId), gone)]);
    return NextResponse.json({ ok: true, count: list.length });
  } catch (err) {
    console.error("Redis POST error:", err);
    return NextResponse.json({ error: "Failed to save recipes" }, { status: 500 });
  }
}
