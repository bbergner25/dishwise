// Dish photos for the app.
//   GET  /api/recipe-image?t=Title&t=Title2 → { photos: { "normalized title": url } }
//   POST /api/recipe-image { recipe }        → makes the photo if it's missing (signed-in, photos switched on)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTimeFixes } from "../../../lib/times";
import { redis, normalizeDish, getPhotos, ensurePhoto, imagesEnabled, USER_DAILY_LIMIT, PREVIEW_USERS } from "../../../lib/mealImage";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const titles = req.nextUrl.searchParams.getAll("t").slice(0, 60);
  try {
    let preview = false;
    try { const { userId } = await auth(); if (userId) preview = !!(await redis.sismember(PREVIEW_USERS, userId)); } catch {}
    const norm = Array.from(new Set(titles.map(normalizeDish).filter(Boolean)));
    const [photos, times] = norm.length ? await Promise.all([getPhotos(norm), getTimeFixes(redis, norm)]) : [{}, {}];
    return NextResponse.json({ enabled: imagesEnabled(), preview, photos, times });
  } catch {
    return NextResponse.json({ enabled: false, photos: {} });
  }
}

export async function POST(req: NextRequest) {
  if (!imagesEnabled()) return NextResponse.json({ status: "off" });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ status: "signed-out" }, { status: 401 });
  let recipe: any, key: string | undefined;
  try { const b = await req.json(); recipe = b?.recipe; if (typeof b?.key === "string" && b.key.length < 200) key = b.key; } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  if (!recipe?.title) return NextResponse.json({ error: "Missing recipe" }, { status: 400 });

  const dayKey = `dish-photo-user:${userId}:${new Date().toISOString().slice(0, 10)}`;
  const used = await redis.incr(dayKey);
  if (used === 1) await redis.expire(dayKey, 60 * 60 * 26);
  if (used > USER_DAILY_LIMIT) return NextResponse.json({ status: "daily-limit" });

  const r = await ensurePhoto(recipe, { key });
  if (r.status !== "created") await redis.decr(dayKey); // only count photos actually made
  return NextResponse.json({ status: r.status, url: r.url });
}
