// Dish photos: one AI-generated photo per unique dish (by normalized title), shared by everyone.
// Generated with Google's Gemini image API, compressed to WebP and stored in Vercel Blob.
// Redis keeps the photo URL per dish, a short lock while one is being made, and the month's spend.
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";
import sharp from "sharp";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";
// Cost per standard (1K) image in tenths of a cent: 3.4¢ → 34. Batch is about half.
export const COST_TENTHS = Number(process.env.IMAGE_COST_TENTHS || 34);
export const MONTHLY_BUDGET_CENTS = Number(process.env.IMAGE_MONTHLY_BUDGET_CENTS || 1500); // $15 default
export const USER_DAILY_LIMIT = Number(process.env.IMAGE_USER_DAILY_LIMIT || 20);
export const imagesEnabled = () => process.env.IMAGES_ENABLED === "true";

export function normalizeDish(title: string): string {
  return (title || "").toLowerCase().trim().replace(/\s+/g, " ");
}
export const photoKey = (title: string) => `dish-photo:v1:${normalizeDish(title)}`;
const lockKey = (title: string) => `dish-photo-lock:v1:${normalizeDish(title)}`;
export const spendKey = () => `dish-photo-spend:${new Date().toISOString().slice(0, 7)}`;

export type DishPhoto = { url: string; model: string; at: string; prompt?: string };

export async function getPhotos(titles: string[]): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(titles.map(normalizeDish).filter(Boolean)));
  if (!uniq.length) return {};
  const vals = await redis.mget<(DishPhoto | null)[]>(...uniq.map((t) => `dish-photo:v1:${t}`));
  const out: Record<string, string> = {};
  uniq.forEach((t, i) => { const v = vals[i]; if (v?.url) out[t] = v.url; });
  return out;
}

/* ── Prompt ── */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const PLACEMENTS = [
  "the dish is large and runs off the left edge of the frame; the food itself stays fully in frame",
  "the dish is large and runs off the top edge of the frame; the food itself stays fully in frame",
  "the dish sits off-center to the right, with linen visible on the left",
  "the dish is centered with generous space around it",
];
const EXTRAS = [
  "two or three loose ingredients from the recipe casually dropped on the linen",
  "a folded linen napkin with a thin navy stripe at one corner",
  "a small speckled ceramic dish holding one garnish from the recipe",
  "nothing else on the table",
];

function vesselFor(title: string, h: number): string {
  const t = title.toLowerCase();
  const tone = h % 3 === 0 ? "charcoal" : "warm off-white";
  if (/soup|stew|chili|chowder|bisque|ramen|pho|curry|congee|broth|gumbo/.test(t)) return `a ${tone} bowl`;
  if (/pie|casserole|bake|lasagna|gratin|enchilada|cobbler|crumble|mac and cheese|shepherd|cottage/.test(t)) return "an oval baking dish with a thin navy rim";
  if (/noodle|pasta|spaghetti|linguine|udon|lo mein|pad thai|salad|bowl|rice|risotto/.test(t)) return `a ${tone} bowl`;
  if (/cake|brownie|cookie|tart|cheesecake|pudding/.test(t)) return "a warm off-white plate";
  return `a large ${tone} plate`;
}

export function buildPrompt(recipe: any): string {
  const title = String(recipe?.title || "").trim();
  const h = hash(normalizeDish(title));
  const ings: string[] = (recipe?.ingredient_groups || [])
    .flatMap((g: any) => (g.items || []).map((i: any) => String(i.name || "").split(/[,(]/)[0].trim()))
    .filter((n: string) => n && !/^(salt|pepper|black pepper|kosher salt|water|oil|olive oil|vegetable oil|cooking spray)$/i.test(n))
    .slice(0, 8);
  const desc = [title, recipe?.tagline ? `(${String(recipe.tagline).replace(/\.$/, "")})` : ""].filter(Boolean).join(" ");
  return `Create a food photograph for a recipe app.

House style (always the same):
- Shot from directly overhead
- Soft natural daylight from the upper left, gentle shadows, warm and appetizing
- Warm cream linen tablecloth with subtle texture
- Handmade ceramics with a slightly speckled matte glaze
- No cutlery in use, no hands, no people, no text, no logos
- Modern cookbook look; realistic home portion
- Square image (1:1)

Make it feel real, not styled:
- The dish looks like it was just cooked and served: ingredients tossed or layered naturally, sauce coating things, some pieces tucked in or half-buried, natural folds and crumbs, a little sauce on the rim where it makes sense
- The food sits on or in the dish with real depth and soft shadows
- Garnishes vary in size and are scattered unevenly; nothing symmetrical, evenly spaced or arranged in a pattern

This dish's composition:
- Placement: ${PLACEMENTS[h % PLACEMENTS.length]}
- Extra detail: ${EXTRAS[(h >>> 3) % EXTRAS.length]}

Dish: ${desc}, served in ${vesselFor(title, h)}.${ings.length ? ` Main ingredients you can see: ${ings.join(", ")}.` : ""} Show only what this recipe contains.`;
}

/* ── Generation ── */

export async function callGemini(prompt: string): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${IMAGE_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
    }),
    signal: AbortSignal.timeout(55000),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${raw.slice(0, 300)}`);
  const data = JSON.parse(raw);
  const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  const b64 = img?.inlineData?.data || img?.inline_data?.data;
  if (!b64) throw new Error(`No image returned: ${raw.slice(0, 300)}`);
  return Buffer.from(b64, "base64");
}

export async function storePhoto(title: string, png: Buffer): Promise<string> {
  const webp = await sharp(png).resize(1024, 1024, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
  const slug = normalizeDish(title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "dish";
  const blob = await put(`dish-photos/${slug}.webp`, webp, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return blob.url;
}

export async function addSpend(tenths: number) {
  await redis.incrby(spendKey(), tenths);
  await redis.expire(spendKey(), 60 * 60 * 24 * 62);
}
export async function spentCents(): Promise<number> {
  return Math.round(((await redis.get<number>(spendKey())) || 0) / 10);
}

// Makes (or returns) the photo for one recipe. `force` regenerates even if one exists (admin tests).
export async function ensurePhoto(recipe: any, opts: { force?: boolean; skipBudget?: boolean } = {}): Promise<{ url?: string; status: string; error?: string; prompt?: string }> {
  const title = String(recipe?.title || "").trim();
  if (!title) return { status: "no-title" };
  if (!opts.force) {
    const existing = await redis.get<DishPhoto>(photoKey(title));
    if (existing?.url) return { url: existing.url, status: "exists" };
  }
  if (!opts.skipBudget && (await spentCents()) >= MONTHLY_BUDGET_CENTS) return { status: "over-budget" };
  const got = await redis.set(lockKey(title), "1", { nx: true, ex: 90 });
  if (!got && !opts.force) return { status: "in-progress" };
  const prompt = buildPrompt(recipe);
  try {
    const png = await callGemini(prompt);
    await addSpend(COST_TENTHS);
    const url = await storePhoto(title, png);
    await redis.set(photoKey(title), { url, model: IMAGE_MODEL, at: new Date().toISOString(), prompt } satisfies DishPhoto);
    return { url, status: "created", prompt };
  } catch (e: any) {
    console.error("[dish-photo]", title, e?.message || e);
    return { status: "error", error: String(e?.message || e), prompt };
  } finally {
    await redis.del(lockKey(title));
  }
}
