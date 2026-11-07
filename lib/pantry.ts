// "Cook with what you have": matching what's in someone's fridge against a recipe's ingredients.
// Shared by the server (Community matches) and the app (ticking off what you have on the grocery list).

// Things we assume every kitchen has, so they never count as "you'll need".
const STAPLE_RE = /^(?:kosher |sea |flaky |fine |coarse |table )?salt\b|\b(?:black|white) pepper\b|^pepper\b|\bpeppercorns?\b|\b(?:olive|vegetable|canola|neutral|cooking|avocado|sunflower|grapeseed) oil\b|^oil\b|\bcooking spray\b|^water\b|\bice\b|^(?:granulated |white )?sugar\b|^(?:all[- ]purpose |plain )?flour\b|\bbaking (?:soda|powder)\b|\b(?:ground|dried) (?:cumin|coriander|cinnamon|ginger|nutmeg|turmeric|oregano|thyme|basil|rosemary|sage|paprika|cloves|allspice|cardamom|mustard)\b|\b(?:smoked |sweet )?paprika\b|\bchil[ei] powder\b|\b(?:garlic|onion) powder\b|\bred pepper flakes\b|\bcrushed red pepper\b|\bcayenne\b|\bbay leaf|\bbay leaves\b|\bitalian seasoning\b|\bvanilla extract\b|^cumin\b|^dried oregano\b/i;

export const STAPLES_NOTE = "oil, salt, pepper, flour, sugar and basic spices";

const STOP = new Set(["a","an","the","of","some","half","leftover","leftovers","fresh","frozen","bag","box","can","jar","pack","package","bunch","few","bit","little","old","open","opened","cooked","raw","whole","large","small","medium","and","or","in","my","to","use","up"]);
// When someone has "chicken thighs", a recipe with chicken breast still uses their chicken.
const PROTEINS = new Set(["chicken","beef","pork","turkey","lamb","salmon","shrimp","tofu","sausage","bacon","ham","steak","fish","cod","tuna","tilapia","prawns","duck"]);

const sing = (w: string) => w.length > 3 && !/ss$/.test(w) ? w.replace(/ies$/, "y").replace(/(oes|ches|shes|xes)$/, (m) => m.slice(0, -2)).replace(/s$/, "") : w;
const words = (s: string) => String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").split(",")[0].replace(/[^a-z ]+/g, " ").split(/\s+/).filter(Boolean).map(sing);

export function isStaple(name: string): boolean {
  const n = String(name || "").toLowerCase().replace(/^[\d\s\/.½¼¾⅓⅔-]+/, "").trim();
  return STAPLE_RE.test(n);
}

// The words that identify what someone has: "half a lemon" → ["lemon"], "chicken thighs" → ["chicken","thigh"]
export function itemKeys(item: string): string[] {
  return words(item).filter((w) => !STOP.has(w) && w.length > 1);
}

// Words that turn an ingredient into a different product: tomatoes ≠ tomato paste,
// chicken ≠ chicken broth, butter ≠ peanut butter, onion ≠ green onions.
const AFTER = new Set(["paste","sauce","broth","stock","bouillon","powder","flake","extract","seasoning","soup","ketchup","base","granule"]);
const BEFORE = new Set(["peanut","almond","cashew","apple","cocoa","green","spring","black","white","cayenne","ground"]);

// Does this ingredient line use this fridge item?
export function ingredientUses(ingredient: string, item: string): boolean {
  const ing = words(ingredient);
  const keys = itemKeys(item);
  if (!keys.length) return false;
  const fits = (k: string) => {
    const i = ing.indexOf(k);
    if (i < 0) return false;
    if (AFTER.has(ing[i + 1] || "") && !keys.includes(ing[i + 1])) return false;
    if (BEFORE.has(ing[i - 1] || "") && !keys.includes(ing[i - 1]) && !(k === "beef" || k === "turkey" || k === "pork" || k === "lamb")) return false;
    return true;
  };
  const head = keys[keys.length - 1];
  if (keys.every((k) => ing.includes(k)) && fits(head)) return true;
  if (head === "pepper" && keys.includes("bell") && !ing.includes("bell")) return false; // bell peppers ≠ jalapeño pepper
  if (keys.length <= 3 && fits(head)) return true;
  return keys.some((k) => PROTEINS.has(k) && fits(k));
}

const ingNames = (r: any): string[] =>
  (r?.ingredient_groups || []).flatMap((g: any) => (g?.items || []).map((i: any) => String(i?.name || ""))).filter(Boolean);

// How well a recipe uses what someone has: which of their items it uses, and what else they'd buy.
export function pantryFit(r: any, items: string[]): { uses: string[]; need: string[] } {
  const names = ingNames(r);
  const uses = items.filter((it) => names.some((n) => ingredientUses(n, it)));
  const need: string[] = [];
  for (const n of names) {
    if (isStaple(n) || items.some((it) => ingredientUses(n, it))) continue;
    const short = n.split(",")[0].replace(/\([^)]*\)/g, "").trim();
    if (short && !need.some((x) => x.toLowerCase() === short.toLowerCase())) need.push(short);
  }
  return { uses, need };
}
