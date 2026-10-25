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
  "the dish is large and sits toward the left, so part of its rim runs past the left edge of the frame",
  "the dish is large and sits toward the right, so part of its rim runs past the right edge of the frame",
  "the dish sits off-center to the right, fully in frame, with linen visible on the left",
  "the dish is centered and fully in frame, with generous space around it",
];
const EXTRAS = [
  "two or three loose ingredients from the recipe casually dropped on the linen",
  "a folded linen napkin with a thin navy stripe at one corner",
  "a small speckled ceramic dish holding one garnish from the recipe",
  "nothing else on the table",
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
- Every piece of food, including garnishes on the plate, is fully visible with clear space between it and all four edges of the image; only the rim of the plate or bowl may extend past an edge
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

export async function callGemini(prompt: string, model: string = IMAGE_MODEL): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
    }),
    signal: AbortSignal.timeout(55000),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${raw.slice(0, 2500)}`);
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
export async function ensurePhoto(recipe: any, opts: { force?: boolean; skipBudget?: boolean; model?: string } = {}): Promise<{ url?: string; status: string; error?: string; prompt?: string }> {
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
    const png = await callGemini(prompt, opts.model || IMAGE_MODEL);
    await addSpend(COST_TENTHS);
    const url = await storePhoto(title, png);
    await redis.set(photoKey(title), { url, model: opts.model || IMAGE_MODEL, at: new Date().toISOString(), prompt } satisfies DishPhoto);
    return { url, status: "created", prompt };
  } catch (e: any) {
    console.error("[dish-photo]", title, e?.message || e);
    return { status: "error", error: String(e?.message || e), prompt };
  } finally {
    await redis.del(lockKey(title));
  }
}

/* ── Batch backfill (Gemini Batch API, about half price, results within ~24h) ── */
const BATCH_KEY = "dish-photo-batch:current";
const FAILED_SET = "dish-photo-failed:v1";
export const BACKFILL_ON = "dish-photo-backfill:on";
export const BATCH_SIZE = Number(process.env.IMAGE_BATCH_SIZE || 30);
type BatchInfo = { name: string; keys: string[]; startedAt: string; model: string };

export async function currentBatch() { return redis.get<BatchInfo>(BATCH_KEY); }
export async function failedDishes(): Promise<string[]> { return (await redis.smembers(FAILED_SET)) as string[]; }

export async function startBatch(dishes: Map<string, any>): Promise<{ started: number; name?: string; error?: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { started: 0, error: "GEMINI_API_KEY is not set" };
  if (await currentBatch()) return { started: 0, error: "A batch is already running" };
  if ((await spentCents()) >= MONTHLY_BUDGET_CENTS) return { started: 0, error: "Monthly budget reached" };
  const entries = Array.from(dishes.entries()).slice(0, BATCH_SIZE);
  if (!entries.length) return { started: 0 };
  const requests = entries.map(([k, recipe]) => ({
    request: {
      contents: [{ parts: [{ text: buildPrompt(recipe) }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
    },
    metadata: { key: k },
  }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:batchGenerateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ batch: { display_name: `everychef-photos-${Date.now()}`, input_config: { requests: { requests } } } }),
  });
  const raw = await res.text();
  if (!res.ok) return { started: 0, error: `Gemini ${res.status}: ${raw.slice(0, 1500)}` };
  const d = JSON.parse(raw);
  const name: string = d.name || d.metadata?.name;
  if (!name) return { started: 0, error: `No batch name returned: ${raw.slice(0, 500)}` };
  await redis.set(BATCH_KEY, { name, keys: entries.map(([k]) => k), startedAt: new Date().toISOString(), model: IMAGE_MODEL } satisfies BatchInfo);
  return { started: entries.length, name };
}

function pickImage(resp: any): string | null {
  const parts: any[] = resp?.candidates?.[0]?.content?.parts || [];
  const p = parts.find((x) => x.inlineData?.data || x.inline_data?.data);
  return p?.inlineData?.data || p?.inline_data?.data || null;
}

// Checks the running batch; when it's done, saves its photos (time-boxed, safe to call repeatedly).
export async function pollBatch(timeBudgetMs = 45000): Promise<{ state: string; saved: number; failed: number; remaining: number; error?: string }> {
  const t0 = Date.now();
  const b = await currentBatch();
  if (!b) return { state: "none", saved: 0, failed: 0, remaining: 0 };
  const key = process.env.GEMINI_API_KEY!;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${b.name}`, { headers: { "x-goog-api-key": key } });
  const raw = await res.text();
  if (!res.ok) return { state: "error", saved: 0, failed: 0, remaining: b.keys.length, error: `Gemini ${res.status}: ${raw.slice(0, 800)}` };
  const d = JSON.parse(raw);
  const state: string = d.metadata?.state || d.state || "UNKNOWN";
  if (/PENDING|RUNNING/.test(state)) return { state, saved: 0, failed: 0, remaining: b.keys.length };
  if (!/SUCCEEDED/.test(state)) { // failed, cancelled or expired: give up on this batch
    await redis.del(BATCH_KEY);
    return { state, saved: 0, failed: 0, remaining: 0, error: JSON.stringify(d.error || d.metadata?.error || "").slice(0, 800) };
  }
  let results: any[] =
    d.response?.inlinedResponses?.inlinedResponses || d.dest?.inlinedResponses || d.metadata?.output?.inlinedResponses?.inlinedResponses || [];
  const file = d.response?.responsesFile || d.dest?.fileName || d.metadata?.output?.responsesFile;
  if (!results.length && file) {
    const fr = await fetch(`https://generativelanguage.googleapis.com/download/v1beta/${file}:download?alt=media`, { headers: { "x-goog-api-key": key } });
    results = (await fr.text()).split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  }
  let saved = 0, failed = 0, timedOut = false;
  const done = new Set<string>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const k: string = r.metadata?.key || r.key || b.keys[i];
    if (!k) continue;
    if (await redis.get(`dish-photo:v1:${k}`)) { done.add(k); continue; }
    if (Date.now() - t0 > timeBudgetMs) { timedOut = true; break; }
    const b64 = pickImage(r.response || r);
    if (!b64) { await redis.sadd(FAILED_SET, k); done.add(k); failed++; continue; }
    try {
      const url = await storePhoto(k, Buffer.from(b64, "base64"));
      await redis.set(`dish-photo:v1:${k}`, { url, model: b.model + " (batch)", at: new Date().toISOString() } satisfies DishPhoto);
      await addSpend(Math.round(COST_TENTHS / 2));
      done.add(k); saved++;
    } catch (e) { console.error("[batch-photo]", k, e); }
  }
  let remaining = b.keys.filter((k) => !done.has(k)).length;
  if (!timedOut) { // everything returned has been handled; anything missing from the results won't come back
    for (const k of b.keys) if (!done.has(k)) { await redis.sadd(FAILED_SET, k); failed++; }
    remaining = 0;
  }
  if (remaining === 0) await redis.del(BATCH_KEY);
  return { state, saved, failed, remaining };
}
