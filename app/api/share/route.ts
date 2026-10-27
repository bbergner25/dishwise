
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Lets the signed-in app fetch a shared recipe by its slug and load it
// directly into the SPA, instead of navigating out to the public /r/[slug]
// page (which has no idea the visitor is signed in).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }
    const recipe = await redis.get<any>(`recipe-share:${slug}`);
    if (!recipe) {
      return NextResponse.json({ found: false }, { status: 404 });
    }
    return NextResponse.json({ found: true, recipe });
  } catch (err) {
    console.error("Share GET error:", err);
    return NextResponse.json({ error: "Failed to load shared recipe" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let recipe = body?.recipe;
    if (!recipe?.title) {
      return NextResponse.json({ error: "Missing recipe" }, { status: 400 });
    }

    // Strip internal app flags and any embedded binary/photo data that
    // would bloat the stored value or cause serialization issues
    const {
      _scanned, _imported, _fromCache, _ts, id,
      _sourceUrl, _dish, _photo, photo, photoData,
      ...clean
    } = recipe;
    // an edited recipe has its own photo, stored under "<title> #<id>"; keep that link after the id is dropped
    if (recipe._edited && id != null && !clean._photoName) (clean as any)._photoName = `${recipe.title} #${id}`;

    // Safety check — if the cleaned recipe is still huge (e.g. base64 embedded
    // somewhere else), cap it rather than letting Redis reject it
    const serialized = JSON.stringify(clean);
    if (serialized.length > 200_000) {
      return NextResponse.json({ error: "Recipe too large to share" }, { status: 413 });
    }

    const slug = toSlug(clean.title || "recipe");
    const suffix = crypto.randomBytes(4).toString("hex");
    const shareId = `${slug}-${suffix}`;

    await redis.set(`recipe-share:${shareId}`, clean);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://everychef.app";
    return NextResponse.json({ shareId, url: `${appUrl}/r/${shareId}` });
  } catch (err) {
    console.error("Share POST error:", err);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}
