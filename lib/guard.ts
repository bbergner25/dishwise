// Keeps junk out of Every Chef: rude or non-food searches, malformed recipes in the
// Community library, and anyone using the AI connection for something else.

// Whole words only, so "molasses", "cocktail", "cumin" and "spotted dick" are fine.
const BLOCKED = /\b(shit|shits|shitty|bullshit|fuck\w*|cunt\w*|bitch\w*|piss|pissed|cock|cocks|porn\w*|crap|crappy|turds?|feces|faeces|urine|vomit|puke|semen|cum|jizz|asshole\w*|nigg\w*|fag|fags|faggot\w*|retard\w*|rape|raped|rapist\w*|nazi\w*|kill yourself|kys)\b/i;

export function isRude(text: any): boolean {
  return BLOCKED.test(String(text || ""));
}

// A recipe is fit for the Community library when it's a real, complete recipe with a clean name.
export function isCleanRecipe(r: any, dish?: string): boolean {
  if (!r || typeof r !== "object" || r.not_a_dish) return false;
  const title = String(r.title || "");
  if (!title || title.length > 120) return false;
  if (isRude(title) || isRude(r.tagline) || (dish && isRude(dish))) return false;
  const groups = Array.isArray(r.ingredient_groups) ? r.ingredient_groups : [];
  const ingCount = groups.reduce((n: number, g: any) => n + (Array.isArray(g?.items) ? g.items.length : 0), 0);
  if (ingCount < 2) return false;
  if (!Array.isArray(r.steps) || r.steps.length < 2) return false;
  if (JSON.stringify(r).length > 60_000) return false;
  return true;
}

// Simple fixed-window rate limit on Upstash. Returns true when the caller is over the limit.
export async function overLimit(redis: any, key: string, max: number, windowSec: number): Promise<boolean> {
  try {
    const k = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, windowSec + 5);
    return n > max;
  } catch {
    return false; // never block people because the limiter itself had a hiccup
  }
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}
