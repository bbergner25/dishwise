
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
    const to = await redis.get<string>(`recipe-share-redirect:${slug}`);
    const recipe = await redis.get<any>(`recipe-share:${to || slug}`);
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
      _sourceUrl, _dish, _photo, photo, photoData, _shareSlug, _shareToken,
      ...clean
    } = recipe;

    // Safety check — if the cleaned recipe is still huge (e.g. base64 embedded
    // somewhere else), cap it rather than letting Redis reject it
    const serialized = JSON.stringify(clean);
    if (serialized.length > 200_000) {
      return NextResponse.json({ error: "Recipe too large to share" }, { status: 413 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://everychef.app";

    // One recipe, one link: the person who made the link (holding its token) can update it,
    // so edits show up on the link they already sent.
    const existing = typeof body?.slug === "string" ? body.slug : "";
    const token = typeof body?.token === "string" ? body.token : "";
    if (existing && token && /^[a-z0-9-]{1,120}$/.test(existing)) {
      const saved = await redis.get<string>(`recipe-share-token:${existing}`);
      if (saved && saved === token) {
        await redis.set(`recipe-share:${existing}`, clean);
        return NextResponse.json({ shareId: existing, url: `${appUrl}/r/${existing}`, token, updated: true });
      }
    }

    const slug = toSlug(clean.title || "recipe");
    const suffix = crypto.randomBytes(4).toString("hex");
    const shareId = `${slug}-${suffix}`;
    const newToken = crypto.randomBytes(16).toString("hex");

    await redis.set(`recipe-share:${shareId}`, clean);
    await redis.set(`recipe-share-token:${shareId}`, newToken);

    return NextResponse.json({ shareId, url: `${appUrl}/r/${shareId}`, token: newToken });
  } catch (err) {
    console.error("Share POST error:", err);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}
