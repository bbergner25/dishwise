import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { findRecipe } from "../../../lib/recipeStore";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ found: false });
  try {
    const recipe = await findRecipe(redis, q);
    return NextResponse.json(recipe ? { found: true, recipe } : { found: false });
  } catch (err) {
    console.error("Cache GET error:", err);
    return NextResponse.json({ found: false });
  }
}

// Older copies of the app sent finished recipes here to join the Community. Recipes are now
// written and filed by the server (/api/dish), so nothing sent in from a phone is saved.
export async function POST() {
  return NextResponse.json({ ok: false, skipped: true });
}
