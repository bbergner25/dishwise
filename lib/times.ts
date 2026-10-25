// Realistic cook times. Recipe sites and AI models quote times for a pro with everything
// already chopped; Every Chef estimates for a home cook and leads with a total-time range.
import type { Redis } from "@upstash/redis";

export const TIME_RULE = `Times are for a home cook at a normal pace, not a professional: prep_time counts all washing, peeling, chopping and measuring; cook_time counts preheating the oven, bringing water to a boil, marinating, simmering, baking, resting and cooling. Round up, never down. total_time is a realistic range for the whole recipe from start to eating, like "45–55 mins" or "1 hr 15 mins–1 hr 30 mins"; it is at least prep_time plus cook_time.`;

// "1 hr 15 mins" / "45 mins" / "PT1H" / "1.5 hours" → minutes (0 if unknown)
export function toMinutes(s: any): number {
  if (!s) return 0;
  const str = String(s).toLowerCase();
  const iso = str.match(/^pt(?:(\d+)h)?(?:(\d+)m)?/);
  if (iso) return (+(iso[1] || 0)) * 60 + (+(iso[2] || 0));
  let m = 0;
  const h = str.match(/([\d.]+)\s*(?:h|hr|hrs|hour|hours)\b/);
  if (h) m += parseFloat(h[1]) * 60;
  const mi = str.match(/([\d.]+)\s*(?:m|min|mins|minute|minutes)\b/);
  if (mi) m += parseFloat(mi[1]);
  if (!h && !mi) { const n = str.match(/^\s*([\d.]+)\s*$/); if (n) m = parseFloat(n[1]); }
  return Math.round(m);
}

export function fmtMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

const roundUp = (n: number) => n < 60 ? Math.ceil(n / 5) * 5 : Math.ceil(n / 15) * 15;

// "45–55 min", "1 hr 15–1 hr 30 min", "1 hr 45 min–2 hr", "55 min–1 hr 10 min"
export function fmtRange(lo: number, hi: number): string {
  if (!hi || hi <= lo) return fmtMinutes(lo);
  const a = fmtMinutes(lo), b = fmtMinutes(hi);
  const sameScale = (lo < 60) === (hi < 60);
  return sameScale && b.endsWith(" min") && a.endsWith(" min") ? `${a.slice(0, -4)}–${b}` : `${a}–${b}`;
}

// The total-time range to show. Uses the recipe's own total_time when it has one,
// otherwise builds a realistic range from prep + cook (which tend to run short).
export function totalRange(r: any): string {
  const given = r?.total_time ? String(r.total_time) : "";
  if (/\d/.test(given)) {
    const [x, y] = given.split(/\s*[–—-]\s*|\s+to\s+/);
    let lo = toMinutes(x), hi = toMinutes(y);
    if (lo && !/[a-z]/i.test(x) && y && /h(ou)?r/i.test(y) && !/min/i.test(y)) lo *= 60; // "1–1.5 hrs"
    const up5 = (n: number) => Math.ceil(n / 5) * 5;
    if (lo) return fmtRange(up5(lo), hi ? up5(hi) : 0);
    return given;
  }
  const sum = toMinutes(r?.prep_time) + toMinutes(r?.cook_time);
  if (!sum) return "";
  const lo = roundUp(sum * 1.2), hi = roundUp(lo + Math.max(10, lo * 0.2));
  return fmtRange(lo, hi);
}

// Cards use the same wording
export const totalShort = totalRange;

// ---- Re-estimates for recipes made before the realistic-times rule ----
export const TIME_KEY = (normTitle: string) => `recipe-time:v1:${normTitle}`;
export type TimeFix = { prep_time: string; cook_time: string; total_time: string };

export async function getTimeFixes(redis: Redis, normTitles: string[]): Promise<Record<string, TimeFix>> {
  if (!normTitles.length) return {};
  const vals = await redis.mget<(TimeFix | null)[]>(...normTitles.map(TIME_KEY));
  const out: Record<string, TimeFix> = {};
  normTitles.forEach((t, i) => { if (vals[i]) out[t] = vals[i]!; });
  return out;
}

export async function estimateTimes(r: any): Promise<TimeFix> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const ings = (r.ingredient_groups || []).flatMap((g: any) => (g.items || []).map((i: any) => `${i.amount || ""} ${i.name || ""}`.trim()));
  const prompt = `Estimate realistic times for this recipe.
Recipe: ${r.title}${r.servings ? ` (serves ${r.servings})` : ""}
Currently listed: prep ${r.prep_time || "?"}, cook ${r.cook_time || "?"}
Ingredients: ${ings.join("; ").slice(0, 1500)}
Steps:
${(r.steps || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n").slice(0, 3500)}

${TIME_RULE}
Reply with ONLY valid JSON: {"prep_time":"X mins","cook_time":"X mins","total_time":"X–Y mins"}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  const text = (data.content || []).map((c: any) => c.text || "").join("");
  const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  if (!j.prep_time || !j.cook_time || !j.total_time) throw new Error("Missing fields: " + text.slice(0, 200));
  return { prep_time: String(j.prep_time), cook_time: String(j.cook_time), total_time: String(j.total_time).replace(/\s*-\s*/, "–") };
}
