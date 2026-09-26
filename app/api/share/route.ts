
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
