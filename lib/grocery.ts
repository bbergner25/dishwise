// The grocery list: store aisles, merging the same item from several recipes, and adding up amounts.
import { ingredientUses, isStaple } from "./pantry";

export const AISLES = ["Produce", "Meat & seafood", "Dairy & eggs", "Bakery", "Deli", "Pantry", "Spices & baking", "Frozen", "Drinks", "Household", "Other"] as const;
export type Aisle = typeof AISLES[number];

const RULES: [Aisle, RegExp][] = [
  ["Frozen", /\bfrozen\b|\bice cream\b|\bpuff pastry\b|\bphyllo\b|\bfilo\b/],
  ["Household", /\bpaper towel|\btoilet paper\b|\bfoil\b|\bplastic wrap\b|\bparchment\b|\bzip ?lock|\bziploc|\btrash bag|\bdish soap\b|\bdetergent\b|\bsponges?\b|\bnapkins?\b|\bdiapers?\b|\bwipes\b/],
  ["Drinks", /\bcoffee\b|\btea bags?\b|\bjuice box|\bsoda\b|\bsparkling water\b|\bbeer\b|\bwine\b(?! vinegar)|\bseltzer\b|\bkombucha\b/],
  ["Meat & seafood", /\bchicken\b(?! (?:broth|stock|bouillon))|\bbeef\b(?! (?:broth|stock|bouillon))|\bpork\b|\bturkey\b|\blamb\b|\bsausages?\b|\bbacon\b|\bham\b|\bsteaks?\b|\bchorizo\b|\bprosciutto\b|\bpancetta\b|\bsalmon\b|\bshrimp\b|\bprawns?\b|\bcod\b|\btilapia\b|\bhalibut\b|\btuna steak|\bscallops?\b|\bmussels\b|\bclams\b|\bcrab\b|\blobster\b|\bfish\b(?! sauce)|\bveal\b|\bduck\b|\bribs\b|\bbrisket\b|\bground (?:meat|bison)\b|\bmeatballs?\b/],
  ["Dairy & eggs", /\beggs?\b(?!plant)|(?<!coconut |almond |oat |evaporated |condensed )milk\b(?! chocolate)|(?<!peanut |almond |apple |cashew )\bbutter\b(?!milk)|\bbuttermilk\b|\bcream\b|\bhalf[- ]and[- ]half\b|\byogh?urt\b|\bcheese\b|\bcheddar\b|\bmozzarella\b|\bparmesan\b|\bparmigiano\b|\bpecorino\b|\bfeta\b|\bricotta\b|\bmascarpone\b|\bgruyere\b|\bgruyère\b|\bbrie\b|\bgouda\b|\bprovolone\b|\bmonterey jack\b|\bcotija\b|\bqueso\b|\bcr[eè]me fra[iî]che\b|\bsour cream\b|\bghee\b|\btofu\b|\btempeh\b|\bhummus\b|\bpesto\b|\btortillas?\b(?! chips)/],
  ["Bakery", /\bbread\b(?! ?crumbs)|\bbuns?\b|\brolls?\b(?! oats)|\bbaguette\b|\bciabatta\b|\bsourdough\b|\bbrioche\b|\bpita\b|\bnaan\b|\bbagels?\b|\bcroissants?\b|\bengl?ish muffins?\b|\bflatbread\b|\bfocaccia\b/],
  ["Deli", /\bsalami\b|\bpepperoni\b|\bdeli\b|\brotisserie\b|\bolives?\b(?! oil)|\bpastrami\b|\bcorned beef\b/],
  ["Spices & baking", /\bflour\b|\bsugar\b|\bbaking (?:soda|powder)\b|\byeast\b|\bvanilla\b|\bcocoa\b|\bchocolate chips?\b|\bcornstarch\b|\bcorn starch\b|\bspices?\b|\bseasoning\b|\bcumin\b|\bpaprika\b|\bcinnamon\b|\bnutmeg\b|\bturmeric\b|\boregano\b|\bchil[ei] powder\b|\bcayenne\b|\bcoriander\b(?! leaves)|\bcardamom\b|\ballspice\b|\b(?:ground|whole) cloves\b|\bground ginger\b|\bbay lea(?:f|ves)\b|\bpeppercorns?\b|\bblack pepper\b|\bwhite pepper\b|\bred pepper flakes\b|\bsalt\b|\bgaram masala\b|\bcurry powder\b|\bgarlic powder\b|\bonion powder\b|\bdried (?:thyme|basil|rosemary|sage|dill|parsley)\b|\bfennel seeds?\b|\bmustard seeds?\b|\bsesame seeds\b|\bsprinkles\b|\bhoney\b|\bmaple syrup\b|\bmolasses\b|\bcorn ?meal\b|\bpanko\b|\bbread ?crumbs\b|\bbreadcrumbs?\b/],
  ["Produce", /\bonions?\b|\bshallots?\b|\bgarlic\b|\bginger\b|\bscallions?\b|\bleeks?\b|\bpotato(?:es)?\b|\bsweet potato|\byams?\b|\bcarrots?\b|\bcelery\b|\bbell peppers?\b|\bjalape[nñ]os?\b|\bserranos?\b|\bpoblanos?\b|\bhabaneros?\b|\bchil(?:i|e)s?\b(?! (?:powder|flakes|sauce|oil))|(?<!crushed |diced |canned |stewed |sun[- ]dried |fire[- ]roasted |whole peeled )\btomato(?:es)?\b(?! (?:paste|sauce))|\btomatillos?\b|\blettuce\b|\bromaine\b|\bspinach\b|\bkale\b|\barugula\b|\bchard\b|\bcabbage\b|\bbok choy\b|\bbroccoli(?:ni)?\b|\bcauliflower\b|\bzucchini\b|\bsquash\b|\bpumpkin\b(?! puree)|\beggplant\b|\bcucumbers?\b|\bmushrooms?\b|\bcorn\b(?! ?(?:starch|meal|tortilla|syrup))|\bpeas\b|\bgreen beans\b|\basparagus\b|\bbrussels sprouts\b|\bbeets?\b|\bradish(?:es)?\b|\bfennel\b(?! seed)|\bavocados?\b|\blemons?\b(?! juice from)|\blimes?\b|\boranges?\b|\bapples?\b(?! cider vinegar)|\bpears?\b|\bbananas?\b|\bberries\b|\bstrawberries\b|\bblueberries\b|\braspberries\b|\bgrapes?\b|\bpeach(?:es)?\b|\bmangos?\b|\bmangoes\b|\bpineapple\b|\bwatermelon\b|\bmelon\b|\bcherries\b|\bherbs?\b|\bbasil\b|\bcilantro\b|\bparsley\b|\bmint\b|\bdill\b|\bthyme\b|\brosemary\b|\bsage\b|\bchives\b|\btarragon\b|\blemongrass\b|\bsprouts\b|\bmicrogreens\b|\bkiwis?\b|\bplums?\b|\bfigs?\b|\bdates\b|\bcoleslaw mix\b|\bsalad greens\b|\bmixed greens\b/],
  ["Pantry", /\bpasta\b|\bspaghetti\b|\bpenne\b|\brigatoni\b|\bfusilli\b|\blinguine\b|\bfettuccine\b|\blasagna\b|\borzo\b|\bmacaroni\b|\bnoodles?\b|\brice\b|\bquinoa\b|\bcouscous\b|\bfarro\b|\bbarley\b|\boats\b|\blentils\b|\bbeans\b|\bchickpeas\b|\bgarbanzo\b|\bbroth\b|\bstock\b|\bbouillon\b|\bcanned\b|\bcans?\b|\btomato paste\b|\btomato sauce\b|\bcrushed tomatoes\b|\bmarinara\b|\bsalsa\b|\boil\b|\bvinegar\b|\bsoy sauce\b|\btamari\b|\bfish sauce\b|\boyster sauce\b|\bhoisin\b|\bsriracha\b|\bhot sauce\b|\bketchup\b|\bmustard\b|\bmayo(?:nnaise)?\b|\bworcestershire\b|\bpeanut butter\b|\btahini\b|\bjam\b|\bnuts\b|\balmonds\b|\bwalnuts\b|\bpecans\b|\bcashews\b|\bpeanuts\b|\bpine nuts\b|\bpistachios\b|\braisins\b|\bcoconut milk\b|\bcoconut\b|\bcrackers\b|\bchips\b|\bcereal\b|\bgranola\b|\bcapers\b|\banchov(?:y|ies)\b|\bsun[- ]dried\b|\bcurry paste\b|\bgochujang\b|\bmiso\b|\badobo\b|\bmirin\b|\bsake\b|\bwine vinegar\b|\bcooking wine\b|\bevaporated milk\b|\bcondensed milk\b|\bgelatin\b|\bpuree\b/],
];

export function aisleOf(name: string): Aisle {
  const n = String(name || "").toLowerCase();
  for (const [aisle, re] of RULES) if (re.test(n)) return aisle;
  return "Other";
}

// "Yellow onions, diced" and "yellow onion" are the same thing on a list
const DROP = /\b(fresh|freshly|chopped|minced|diced|sliced|grated|shredded|crumbled|finely|roughly|thinly|large|small|medium|optional|divided|for serving|to taste|peeled|trimmed|halved|softened|melted|room temperature|packed|cold|warm)\b/g;
const singular = (w: string) => /(ss|us)$/.test(w) || w.length <= 3 ? w : w.replace(/leaves$/, "leaf").replace(/(tomato|potato)es$/, "$1").replace(/ies$/, "y").replace(/(ch|sh|x)es$/, "$1").replace(/s$/, "");
export function groceryKey(name: string): string {
  const n = String(name || "").toLowerCase().replace(/\([^)]*\)/g, " ").split(",")[0].replace(DROP, " ").replace(/[^a-z' -]+/g, " ").replace(/\s+/g, " ").trim();
  const ws = n.replace(/ (?:cloves?|leaves|leaf|sprigs?|stalks?|bunch|head|fillets?)$/, "").split(" ").filter(Boolean);
  if (!ws.length) return String(name || "").toLowerCase().trim();
  ws[ws.length - 1] = singular(ws[ws.length - 1]);
  return ws.join(" ");
}
export function displayName(name: string): string {
  const n = String(name || "").replace(/\([^)]*\)/g, "").split(",")[0].replace(/\s+/g, " ").trim();
  return n ? n[0].toUpperCase() + n.slice(1) : n;
}

// ---- amounts ----
const UNITS: [string, RegExp][] = [
  ["lb", /^(?:lbs?|pounds?)\.?$/], ["oz", /^(?:oz|ounces?)\.?$/], ["cup", /^cups?$/], ["tbsp", /^(?:tbsps?|tablespoons?|tbs|tb)\.?$/],
  ["tsp", /^(?:tsps?|teaspoons?)\.?$/], ["can", /^cans?$/], ["clove", /^cloves?$/], ["bunch", /^bunch(?:es)?$/], ["head", /^heads?$/],
  ["package", /^(?:packages?|pkgs?|packs?)$/], ["jar", /^jars?$/], ["slice", /^slices?$/], ["stalk", /^stalks?$/], ["sprig", /^sprigs?$/],
  ["g", /^(?:g|grams?)$/], ["kg", /^(?:kg|kilograms?)$/], ["ml", /^(?:ml|milliliters?)$/], ["pint", /^pints?$/], ["quart", /^quarts?$/],
];
const FRAC: Record<string, number> = { "½": .5, "¼": .25, "¾": .75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": .125 };
function num(s: string): number | null {
  s = s.trim();
  let m = s.match(/^(\d+)\s*([½¼¾⅓⅔⅛])$/); if (m) return +m[1] + FRAC[m[2]];
  if (FRAC[s] != null) return FRAC[s];
  m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/); if (m) return +m[1] + +m[2] / +m[3];
  m = s.match(/^(\d+)\/(\d+)$/); if (m) return +m[1] / +m[2];
  m = s.match(/^\d+(?:\.\d+)?$/); if (m) return parseFloat(s);
  return null;
}
// "1 lb" → {q:1,u:"lb"}, "2" → {q:2,u:""}, "1 (28 oz) can" → {q:1,u:"can"}, "to taste" → null
export function parseAmount(a: string): { q: number; u: string } | null {
  const s = String(a || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\b(?:large|small|medium|heaping|scant|about|level)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  const m = s.match(/^((?:\d+\s+)?\d+\/\d+|\d+\s*[½¼¾⅓⅔⅛]|[½¼¾⅓⅔⅛]|\d+(?:\.\d+)?)(?:\s*[-–]\s*[\d.\/]+)?\s*(.*)$/);
  if (!m) return null;
  const q = num(m[1]);
  if (q == null) return null;
  const rest = m[2].trim();
  if (!rest) return { q, u: "" };
  const word = rest.split(" ")[0];
  const unit = UNITS.find(([, re]) => re.test(word));
  return unit ? { q, u: unit[0] } : (rest.split(" ").length <= 2 ? { q, u: "" } : null);
}
const fmtQ = (q: number) => {
  const whole = Math.floor(q + 1e-9), f = q - whole;
  const fr = Math.abs(f - .5) < .02 ? "½" : Math.abs(f - .25) < .02 ? "¼" : Math.abs(f - .75) < .02 ? "¾" : Math.abs(f - 1 / 3) < .02 ? "⅓" : Math.abs(f - 2 / 3) < .02 ? "⅔" : f < .02 ? "" : null;
  if (fr === null) return String(Math.round(q * 10) / 10);
  return whole ? `${whole}${fr}` : (fr || "0");
};
const PLURAL: Record<string, string> = { cup: "cups", can: "cans", clove: "cloves", bunch: "bunches", head: "heads", package: "packages", jar: "jars", slice: "slices", stalk: "stalks", sprig: "sprigs", pint: "pints", quart: "quarts" };
export function fmtAmount(q: number, u: string): string {
  if (!u) return fmtQ(q);
  return `${fmtQ(q)} ${q > 1 && PLURAL[u] ? PLURAL[u] : u}`;
}
// Add up amounts that share a unit; otherwise list them side by side ("1 + ½ cup")
export function totalAmount(amounts: string[]): string {
  const list = amounts.map((a) => String(a || "").trim()).filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return list[0].replace(/\s*\([^)]*\)/g, "").trim() || list[0];
  const parsed = list.map(parseAmount);
  if (parsed.every(Boolean) && parsed.every((p) => p!.u === parsed[0]!.u)) {
    return fmtAmount(parsed.reduce((s, p) => s + p!.q, 0), parsed[0]!.u);
  }
  return list.join(" + ");
}

// The shopping-list name and amount for each grocery item in a recipe
export function recipeGroceries(r: any): { name: string; amount: string }[] {
  const ings: { name: string; amount: string }[] = (r?.ingredient_groups || []).flatMap((g: any) => (g?.items || []).map((i: any) => ({ name: String(i?.name || ""), amount: String(i?.amount || "") })));
  const items: string[] = Array.isArray(r?.grocery_items) && r.grocery_items.length ? r.grocery_items.map(String) : ings.map((i) => i.name.split(",")[0]);
  const used = new Set<number>();
  return items.filter(Boolean).map((name) => {
    const k = name.toLowerCase().trim();
    let i = ings.findIndex((x, j) => !used.has(j) && x.name.toLowerCase().trim() === k);
    if (i < 0) i = ings.findIndex((x, j) => !used.has(j) && ingredientUses(x.name, name));
    if (i >= 0) used.add(i);
    return { name, amount: i >= 0 ? ings[i].amount : "" };
  });
}

export { isStaple };
