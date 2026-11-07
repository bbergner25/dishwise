// "Plan my week": picks Community dinners that fit how much time someone has each night.
// No AI: everything comes from recipes already in the Community library.
import { totalRange, toMinutes } from "./times";
import { aisleOf, groceryKey, isStaple, recipeGroceries } from "./grocery";

export type Level = "quick" | "normal" | "long" | "skip";
// Judged by the short end of a recipe's realistic range ("35–45 min" counts as 35). Honest home-cook times
// put almost nothing under 30, so Quick means about 40 minutes or less.
export const LEVEL_RANGE: Record<Exclude<Level, "skip">, [number, number]> = { quick: [0, 40], normal: [41, 75], long: [76, 100000] };

// Longest realistic time, in minutes ("45–55 min" → 55)
export function maxMinutes(r: any): number {
  const range = totalRange(r);
  return toMinutes(range.split("–").pop()) || toMinutes(range) || 0;
}
// Shortest realistic time, in minutes ("45–55 min" → 45)
export function minMinutes(r: any): number {
  const range = totalRange(r);
  return toMinutes(range.split("–")[0]) || toMinutes(range) || 0;
}
export function levelOf(r: any): Level | null {
  const m = minMinutes(r);
  if (!m) return null;
  return m <= LEVEL_RANGE.quick[1] ? "quick" : m <= LEVEL_RANGE.normal[1] ? "normal" : "long";
}

// Dinner, not dessert, brunch, a snack or a drink
const NOT_DINNER = /\b(cake|cookies?|brownies?|pie|tart|crumble|pudding|mousse|cheesecake|tiramisu|panna cotta|brul[eé]e|gelato|ice cream|sorbet|macarons?|baklava|mochi|churros?|financiers?|pavlova|profiteroles?|toffee|tres leches|cobbler|muffins?|banana bread|scones?|pancakes?|waffles?|french toast|granola|oatmeal|smoothie|cocktail|lemonade|latte|dip|salsa|guacamole|hummus|dressing|vinaigrette|sauce|frosting|jam|syrup|biscuits? and gravy|cinnamon rolls?|donuts?|doughnuts?|fudge|truffles?|bars?)\b/i;
// Side dishes on their own aren't dinner: coleslaw, roasted carrots, garlic bread, rice pilaf…
const SIDE = /\b(coleslaw|slaw|mashed|roasted (vegetables|veggies|carrots|potatoes|broccoli|brussels sprouts|cauliflower|asparagus|green beans)|garlic bread|cornbread|dinner rolls|rolls|fries|potato salad|pasta salad|macaroni salad|rice pilaf|pilaf|green beans|corn on the cob|baked beans|creamed spinach|steamed|saut[ée]ed (greens|spinach|green beans)|side salad|caesar salad|house salad|garden salad|cucumber salad|fruit salad|biscuits|focaccia|naan|pickles?|relish|gravy|stuffing|mac and cheese bites)\b/i;
// what makes a dinner even without meat
const MAIN_WORD = /\b(soup|stew|curry|chili|risotto|pizza|lasagna|pasta|spaghetti|penne|rigatoni|noodles|ramen|pho|bowls?|casserole|pie|tacos?|burritos?|enchiladas?|quesadillas?|fajitas|quiche|frittata|shakshuka|stir[- ]fry|fried rice|paella|gnocchi|dumplings?|sandwich(es)?|burgers?|wraps?|bake|tagine|dal|biryani|pad thai|lo mein|mac and cheese|gratin|tart|galette|stroganoff|goulash|bolognese|carbonara|alfredo|pot roast|meatloaf)\b/i;
export function isDinner(r: any): boolean {
  const t = String(r?.title || "");
  const savory = /\b(cottage|shepherd'?s?|pot pie|chicken|beef|pork|meat|fish|tamale|turkey|steak|savory|tomato|onion|leek|mushroom|cheese|spinach)\b/i.test(t);
  if ((NOT_DINNER.test(t) && !(savory && /\b(pie|tart|galette|bake)\b/i.test(t))) || SIDE.test(t)) return false;
  if ((r?.steps?.length || 0) < 3) return false;
  return mainOf(r) !== "other" || MAIN_WORD.test(t);
}

const ings = (r: any): string[] => (r?.ingredient_groups || []).flatMap((g: any) => (g?.items || []).map((i: any) => String(i?.name || "").toLowerCase()));
const any = (r: any, re: RegExp) => ings(r).some((n) => re.test(n));
const MEAT = /\b(chicken|beef|pork|turkey|lamb|veal|duck|bacon|ham|sausage|chorizo|prosciutto|pancetta|salami|pepperoni|steak|brisket|ribs|meatballs?|ground meat|salmon|shrimp|prawns?|cod|tilapia|halibut|tuna|scallops?|mussels|clams|crab|lobster|fish|anchov|gelatin|lard)\b|fish sauce|oyster sauce|worcestershire/;
const DAIRY = /\b(milk|butter|cheese|cheddar|mozzarella|parmesan|parmigiano|pecorino|feta|ricotta|mascarpone|gruy[eè]re|brie|gouda|provolone|monterey jack|cotija|queso|cream|yogh?urt|ghee|buttermilk|half-and-half|cr[eè]me fra[iî]che|paneer)\b/;
const NOT_DAIRY = /\b(coconut|almond|oat|soy|cashew|peanut) (milk|butter|cream|yogh?urt)|cream of tartar|ice cream/;
const GLUTEN = /\b(flour|bread|breadcrumbs?|panko|pasta|spaghetti|penne|rigatoni|fusilli|linguine|fettuccine|lasagna|orzo|macaroni|couscous|barley|farro|bulgur|seitan|crackers?|tortillas?|pita|naan|buns?|rolls?|croutons?|soy sauce|beer|udon|ramen|egg noodles|gnocchi|wonton|dumpling wrappers?|puff pastry|pie crust|biscuits?)\b/;
const GF_OK = /\b(rice|almond|coconut|chickpea|corn|tapioca|oat|buckwheat|cassava|gluten[- ]free) (flour|noodles|pasta|tortillas?)\b|\bcorn tortillas?\b|\brice noodles\b|tamari|gluten[- ]free/;
const CARBY = /\b(pasta|spaghetti|penne|rigatoni|fusilli|linguine|fettuccine|lasagna|orzo|macaroni|noodles|rice|quinoa|couscous|bread|buns?|rolls?|tortillas?|pita|naan|potato(es)?|sweet potato|flour|sugar|honey|maple syrup|beans|chickpeas|lentils|corn|oats|gnocchi|crackers?|barley|farro)\b/;

export function fitsDiets(r: any, diets: string[]): boolean {
  const d = diets.map((x) => x.toLowerCase());
  if ((d.includes("vegetarian") || d.includes("vegan")) && any(r, MEAT)) return false;
  if (d.includes("vegan") && (ings(r).some((n) => DAIRY.test(n) && !NOT_DAIRY.test(n)) || any(r, /\beggs?\b|\bhoney\b|\bmayo/))) return false;
  if (d.includes("dairy-free") && ings(r).some((n) => DAIRY.test(n) && !NOT_DAIRY.test(n))) return false;
  if (d.includes("gluten-free") && ings(r).some((n) => GLUTEN.test(n) && !GF_OK.test(n))) return false;
  if ((d.includes("keto") || d.includes("low-carb")) && ings(r).some((n) => CARBY.test(n) && !/\b(cauliflower rice|almond flour|coconut flour)\b/.test(n))) return false;
  return true;
}

// The main ingredient, so the week doesn't serve chicken three nights running
const PROTEINS: [string, RegExp][] = [
  ["chicken", /\bchicken\b(?! (broth|stock|bouillon))/], ["beef", /\b(beef|steak|brisket|short ribs)\b(?! (broth|stock))/], ["pork", /\b(pork|bacon|ham|sausage|chorizo|pancetta)\b/],
  ["turkey", /\bturkey\b/], ["lamb", /\blamb\b/], ["seafood", /\b(salmon|shrimp|prawns?|cod|tilapia|halibut|tuna|scallops?|mussels|clams|crab|lobster|fish)\b(?! sauce)/],
  ["tofu", /\b(tofu|tempeh)\b/], ["beans", /\b(beans|chickpeas|lentils)\b/], ["eggs", /\beggs?\b/], ["pasta", /\b(pasta|spaghetti|penne|rigatoni|linguine|fettuccine|orzo|macaroni|gnocchi)\b/],
];
export function mainOf(r: any): string {
  const t = String(r?.title || "").toLowerCase();
  for (const [k, re] of PROTEINS) if (re.test(t)) return k;
  const list = ings(r);
  for (const [k, re] of PROTEINS) if (list.some((n) => re.test(n))) return k;
  return "other";
}

// Fresh produce a recipe needs, for leaning toward dinners that share it
export function produceOf(r: any): string[] {
  return Array.from(new Set(recipeGroceries(r).filter((g) => !isStaple(g.name) && aisleOf(g.name) === "Produce").map((g) => groceryKey(g.name))));
}

const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export type DayAsk = { key: string; level: Level };
export type Pick = { recipe: any; minutes: number } | null;

// Fill each day in order. avoid = titles not to use (already planned, recently cooked, already shown)
export function pickWeek(pool: any[], days: DayAsk[], opts: { diets: string[]; avoid: string[]; fixed?: Record<string, any>; rand?: () => number }): { picks: Record<string, Pick>; matches: Record<string, number> } {
  const rand = opts.rand || Math.random;
  const avoid = new Set(opts.avoid.map(norm));
  const ok = pool.filter((r) => r?.title && isDinner(r) && fitsDiets(r, opts.diets));
  const picks: Record<string, Pick> = {};
  const matches: Record<string, number> = {};
  const used = new Set<string>();
  const order = days.map((d) => d.key);
  // what's on the neighbouring days (already planned or picked), for variety
  const mainOn: Record<string, string> = {};
  for (const [k, r] of Object.entries(opts.fixed || {})) if (r) { mainOn[k] = mainOf(r); used.add(norm(r.title)); }
  const produce = new Set<string>();
  for (const r of Object.values(opts.fixed || {})) if (r) produceOf(r).forEach((p) => produce.add(p));
  const neighbours = (key: string) => {
    const all = Object.keys({ ...mainOn, ...Object.fromEntries(order.map((k) => [k, 1])) }).sort();
    const i = all.indexOf(key);
    return [all[i - 1], all[i + 1]].filter(Boolean).map((k) => mainOn[k]).filter(Boolean);
  };
  for (const d of days) {
    if (d.level === "skip") continue;
    const [lo, hi] = LEVEL_RANGE[d.level];
    const fit = ok.filter((r) => { const m = minMinutes(r); return m >= lo && m <= hi; });
    const fresh = fit.filter((r) => !avoid.has(norm(r.title)) && !used.has(norm(r.title)));
    matches[d.key] = fresh.length;
    if (!fresh.length) { picks[d.key] = null; continue; }
    const near = neighbours(d.key);
    const scored = fresh.map((r) => {
      const main = mainOf(r);
      const shared = produceOf(r).filter((p) => produce.has(p)).length;
      return { r, s: (near.includes(main) && main !== "other" ? -3 : 0) + Math.min(shared, 2) * 0.8 + rand() * 1.6 };
    }).sort((a, b) => b.s - a.s);
    const r = scored[0].r;
    picks[d.key] = { recipe: r, minutes: maxMinutes(r) };
    used.add(norm(r.title));
    mainOn[d.key] = mainOf(r);
    produceOf(r).forEach((p) => produce.add(p));
  }
  return { picks, matches };
}

// Produce that more than one dinner in the week uses
export function sharedProduce(recipes: any[]): string[] {
  const count: Record<string, number> = {};
  for (const r of recipes) for (const p of produceOf(r)) count[p] = (count[p] || 0) + 1;
  return Object.keys(count).filter((k) => count[k] > 1);
}
