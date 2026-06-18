import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";
import { PROMOTED_DISHES } from "../../../lib/promoted";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_VERSION = "v1"; // must match app/api/cache/route.ts and app/api/warm-cache/route.ts

function normalize(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

// Signed-in users get the full, growing community library. Anyone else gets
// a small peek built only from the dishes Billy and the team have promoted —
// the exact same list that's safe to link on social.
export async function GET() {
  try {
    const { userId } = await auth();
    const authenticated = !!userId;

    if (!authenticated) {
      if (PROMOTED_DISHES.length === 0) {
        return NextResponse.json({ authenticated: false, recipes: [] });
      }
      const keys = PROMOTED_DISHES.map((title) => `recipe-cache:${CACHE_VERSION}:${normalize(title)}`);
      const values = await redis.mget<any[]>(...keys);
      const recipes = values.filter(Boolean).slice(0, 6);
      return NextResponse.json({ authenticated: false, recipes });
    }

    const pattern = `recipe-cache:${CACHE_VERSION}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length === 0) {
      return NextResponse.json({ authenticated: true, recipes: [] });
    }
    const values = await redis.mget<any[]>(...keys);
    const recipes = values.filter(Boolean).slice(0, 200);
    return NextResponse.json({ authenticated: true, recipes });
  } catch (err) {
    console.error("Community GET error:", err);
    return NextResponse.json({ authenticated: false, recipes: [], error: "Failed to load community recipes" }, { status: 500 });
  }
}
