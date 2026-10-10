// Curated side-dish library for the "Pair it with a side" feature.
// Matching is pure string/tag logic against the main recipe's own text —
// no AI call, no extra wait, no extra cost. Sides are picked, not generated.
//
// How it works: each side is tagged with the cuisines/vibes it suits. We scan
// the main recipe's title + tagline + ingredient names for cuisine keywords,
// score every side by how many of its tags match, and take the top 3. A
// handful of "universal" sides (plain rice, a green salad, garlic bread...)
// always score at least a little, so there's always something to suggest
// even for a dish that doesn't match any cuisine keyword.

export interface SideDish {
  title: string;
  tagline: string;
  tags: string[];       // cuisine and/or vibe tags, see CUISINE_KEYWORDS below
  universal?: boolean;  // always eligible as a fallback, scored lowest
}

// Emphasis on variety of vegetable preparations, plus grains, salads, and breads.
export const SIDES: SideDish[] = [
  // --- Universal / always-safe fallbacks ---
  { title: "Simple Green Salad", tagline: "Mixed greens, shallot vinaigrette, shaved parmesan.", tags: ["light"], universal: true },
  { title: "Garlic Butter Rice", tagline: "Fluffy steamed rice finished with garlic butter and herbs.", tags: ["comfort"], universal: true },
  { title: "Roasted Mixed Vegetables", tagline: "Whatever's in season, roasted hot and fast with olive oil and salt.", tags: ["light"], universal: true },
  { title: "Garlic Bread", tagline: "Toasted and butter-crisp, with plenty of garlic.", tags: ["comfort"], universal: true },
  { title: "Steamed Broccoli with Lemon", tagline: "Bright, simple, and ready in 8 minutes.", tags: ["light"], universal: true },
  { title: "Crispy Smashed Potatoes", tagline: "Boiled, smashed, and roasted until the edges shatter.", tags: ["comfort"], universal: true },

  // --- Italian ---
  { title: "Caprese Salad", tagline: "Tomato, fresh mozzarella, basil, balsamic glaze.", tags: ["italian", "light"] },
  { title: "Garlic Roasted Broccolini", tagline: "Charred at the edges with chili flake and lemon.", tags: ["italian", "light"] },
  { title: "Parmesan Polenta", tagline: "Creamy, cheesy, and ready to soak up any sauce.", tags: ["italian", "comfort"] },
  { title: "Marinated White Bean Salad", tagline: "Cannellini beans, olive oil, oregano, red onion.", tags: ["italian", "light"] },
  { title: "Sautéed Garlic Spinach", tagline: "Wilted fast in olive oil with plenty of garlic.", tags: ["italian", "light"] },

  // --- Mexican ---
  { title: "Elote (Mexican Street Corn)", tagline: "Grilled corn with crema, cotija, chili powder, lime.", tags: ["mexican", "bold"] },
  { title: "Cilantro Lime Rice", tagline: "Steamed rice brightened with lime juice and fresh cilantro.", tags: ["mexican"] },
  { title: "Charred Poblano & Corn Salad", tagline: "Smoky poblanos, sweet corn, lime, cotija.", tags: ["mexican", "light"] },
  { title: "Refried Black Beans", tagline: "Creamy, deeply savory, finished with a little lime.", tags: ["mexican", "comfort"] },
  { title: "Quick Pickled Red Onions", tagline: "Sharp, bright, ready in 15 minutes — cuts through rich mains.", tags: ["mexican", "bold"] },

  // --- Asian (broad) ---
  { title: "Garlic Sesame Cucumber Salad", tagline: "Smashed cucumbers, rice vinegar, sesame oil, chili crisp.", tags: ["asian", "light"] },
  { title: "Garlic Bok Choy Stir-Fry", tagline: "Quick-charred baby bok choy with garlic and soy.", tags: ["asian", "light"] },
  { title: "Scallion Pancakes", tagline: "Crisp, flaky, and great for scooping up sauce.", tags: ["asian", "comfort"] },
  { title: "Miso Glazed Eggplant", tagline: "Roasted until silky, brushed with a sweet-savory miso glaze.", tags: ["asian", "bold"] },
  { title: "Steamed Jasmine Rice", tagline: "Light, fragrant, and the easiest pairing for anything saucy.", tags: ["asian"] },
  { title: "Quick Kimchi Slaw", tagline: "Cabbage, kimchi, rice vinegar — crunchy and tangy.", tags: ["asian", "bold"] },

  // --- Indian ---
  { title: "Cucumber Raita", tagline: "Cooling yogurt with cucumber, mint, and a pinch of cumin.", tags: ["indian", "light"] },
  { title: "Garlic Naan", tagline: "Soft, pillowy flatbread brushed with garlic butter.", tags: ["indian", "comfort"] },
  { title: "Jeera Rice", tagline: "Basmati rice tempered with whole cumin seed.", tags: ["indian"] },
  { title: "Sautéed Spiced Cauliflower", tagline: "Turmeric, cumin, and mustard seed, quick-cooked until tender.", tags: ["indian", "light"] },
  { title: "Tomato Cucumber Kachumber", tagline: "A crisp, lime-dressed salad to cut through a rich curry.", tags: ["indian", "light"] },

  // --- Mediterranean / Middle Eastern ---
  { title: "Greek Salad", tagline: "Cucumber, tomato, olives, feta, red wine vinaigrette.", tags: ["mediterranean", "light"] },
  { title: "Garlic Hummus", tagline: "Silky and bright, perfect for scooping with warm pita.", tags: ["mediterranean", "comfort"] },
  { title: "Charred Zucchini with Tahini", tagline: "Blistered zucchini drizzled with lemony tahini sauce.", tags: ["mediterranean", "light"] },
  { title: "Warm Pita Bread", tagline: "Soft, pillowy, and ready in minutes.", tags: ["mediterranean", "comfort"] },
  { title: "Tabbouleh", tagline: "Parsley-forward bulgur salad with tomato, mint, and lemon.", tags: ["mediterranean", "light"] },
  { title: "Roasted Eggplant with Pomegranate", tagline: "Smoky roasted eggplant, tangy pomegranate molasses.", tags: ["mediterranean", "bold"] },

  // --- American / Comfort ---
  { title: "Buttermilk Coleslaw", tagline: "Crisp cabbage and carrot in a tangy buttermilk dressing.", tags: ["american", "comfort"] },
  { title: "Mac and Cheese", tagline: "Classic, creamy, and always a crowd-pleaser.", tags: ["american", "comfort"] },
  { title: "Cornbread", tagline: "Slightly sweet, golden, and best with a little butter.", tags: ["american", "comfort"] },
  { title: "Roasted Brussels Sprouts", tagline: "Charred and caramelized with a balsamic drizzle.", tags: ["american", "light"] },
  { title: "Loaded Baked Potato", tagline: "Sour cream, chives, cheddar — a hearty classic.", tags: ["american", "comfort"] },
  { title: "Grilled Corn on the Cob", tagline: "Charred and brushed with herb butter.", tags: ["american", "light"] },
  { title: "Creamy Mashed Potatoes", tagline: "Butter, cream, and a soft, fluffy mash — a dinner-table staple.", tags: ["american", "comfort"] },
  { title: "Garlic Parmesan Roasted Potatoes", tagline: "Crispy-edged potato wedges with garlic and parmesan.", tags: ["american", "comfort"] },
  { title: "Green Bean Casserole", tagline: "Classic creamy green beans topped with crispy fried onions.", tags: ["american", "comfort"] },
  { title: "Honey Butter Dinner Rolls", tagline: "Soft, pillowy rolls brushed with honey butter.", tags: ["american", "comfort"] },
  { title: "Baked Beans", tagline: "Slow-simmered in a sweet, smoky tomato sauce.", tags: ["american", "comfort"] },
  { title: "Honey Glazed Carrots", tagline: "Tender roasted carrots glazed with honey and a little butter.", tags: ["american", "light"] },
  { title: "House Salad with Ranch", tagline: "Crisp lettuce, tomato, cucumber, shredded cheddar, ranch dressing.", tags: ["american", "light"] },
  { title: "Broccoli Cheddar Bake", tagline: "Tender broccoli baked in a creamy cheddar sauce.", tags: ["american", "comfort"] },
  { title: "Sweet Potato Fries", tagline: "Oven-baked until crisp, lightly salted.", tags: ["american", "light"] },
  { title: "Steamed Green Beans with Almonds", tagline: "Simple, crisp-tender green beans with toasted almonds.", tags: ["american", "light"] },
  { title: "Rice Pilaf", tagline: "Fluffy rice toasted with onion and a little butter before simmering.", tags: ["american", "comfort"] },
  { title: "Cinnamon Applesauce", tagline: "Lightly spiced and a little chunky — a classic family-dinner side.", tags: ["american", "light"] },

  // --- French ---
  { title: "Haricots Verts with Shallots", tagline: "Thin green beans, quickly sautéed with shallot and butter.", tags: ["french", "light"] },
  { title: "Potato Gratin", tagline: "Thinly sliced potatoes baked in cream and gruyère.", tags: ["french", "comfort"] },
  { title: "Frisée Salad with Dijon Vinaigrette", tagline: "Bitter greens, sharp mustard dressing, a touch of shallot.", tags: ["french", "light"] },

  // --- Spicy / bold leaning (cross-cuisine) ---
  { title: "Chili Garlic Green Beans", tagline: "Blistered green beans tossed in a spicy garlic sauce.", tags: ["bold", "asian", "light"] },
  { title: "Spicy Honey Roasted Carrots", tagline: "Sweet and heat, roasted until caramelized at the edges.", tags: ["bold", "light"] },
];

// Keywords used to detect which cuisine(s) and vibe a main dish belongs to,
// scanned across its title + tagline + ingredient names. A dish can match
// more than one cuisine (e.g. a fusion dish), which is fine — sides from
// either cuisine are fair game.
export const CUISINE_KEYWORDS: Record<string, string[]> = {
  italian: ["pasta", "parmesan", "parmigiano", "marinara", "pesto", "risotto", "italian", "mozzarella", "basil", "lasagna", "gnocchi", "ragu", "carbonara"],
  mexican: ["taco", "salsa", "cilantro", "chipotle", "tortilla", "mexican", "queso", "enchilada", "carnitas", "birria", "elote"],
  asian: ["soy sauce", "ginger", "sesame", "gochujang", "miso", "teriyaki", "kimchi", "rice vinegar", "asian", "noodle", "hoisin", "sriracha", "wonton", "dumpling", "bulgogi", "udon", "ramen"],
  indian: ["curry", "tikka", "masala", "turmeric", "garam masala", "indian", "naan", "paneer", "dal", "biryani", "tandoori"],
  mediterranean: ["feta", "tzatziki", "hummus", "mediterranean", "pita", "greek", "falafel", "halloumi"],
  american: ["bbq", "burger", "ranch", "buttermilk", "american", "smash", "mac and cheese", "fried chicken", "meatloaf", "pot roast", "pork chop", "roast chicken", "baked chicken", "grilled chicken", "casserole", "sloppy joe", "pot pie", "sheet pan", "steak", "pork tenderloin", "turkey", "ham", "chili"],
  french: ["french", "beurre blanc", "dijon", "gruyere", "gruyère", "bechamel", "confit", "bourguignon"],
};

const BOLD_KEYWORDS = ["gochujang", "chili", "jalapeno", "jalapeño", "spicy", "sriracha", "harissa", "cajun", "buffalo"];
const LIGHT_KEYWORDS = ["grilled", "steamed", "salad", "poached", "citrus", "light", "fresh"];

function textOf(recipe: any): string {
  const ingredientNames = (recipe.ingredient_groups || [])
    .flatMap((g: any) => (g.items || []).map((i: any) => i.name))
    .join(" ");
  return `${recipe.title || ""} ${recipe.tagline || ""} ${ingredientNames}`.toLowerCase();
}

export function detectTags(recipe: any): string[] {
  const text = textOf(recipe);
  const tags: string[] = [];
  for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) tags.push(cuisine);
  }
  if (BOLD_KEYWORDS.some((k) => text.includes(k))) tags.push("bold");
  if (LIGHT_KEYWORDS.some((k) => text.includes(k))) tags.push("light");
  return tags;
}

// Deterministic per-recipe "shuffle" so ties don't always resolve the same
// way across different main dishes, but the SAME main dish always suggests
// the same sides (opening a recipe twice shouldn't reshuffle the pairing).
function seededIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

// Full ranked list of every side for this main, best match first — stable
// across calls (same main always ranks the same way), so "Show more" can
// just page further into this list instead of re-rolling anything.
export function rankSides(recipe: any): SideDish[] {
  const mainTags = detectTags(recipe);
  const seed = recipe.title || "";

  const scored = SIDES.map((side) => {
    const overlap = side.tags.filter((t) => mainTags.includes(t)).length;
    // universal sides get a small baseline so they're always eligible,
    // but true tag matches always rank above them
    const base = side.universal ? 0.5 : 0;
    const jitter = seededIndex(seed + side.title, 100) / 1000; // stable tiebreak, not random each render
    return { side, score: overlap + base + jitter };
  });

  scored.sort((a, b) => b.score - a.score);

  // de-dupe against the main dish's own title just in case of an exact name clash
  const mainTitleLower = (recipe.title || "").toLowerCase().trim();
  return scored
    .filter((s) => s.side.title.toLowerCase().trim() !== mainTitleLower)
    .map((s) => s.side);
}

// Returns up to `count` suggested sides for a given main recipe. Never calls
// an API — pure lookup/scoring over SIDES. Convenience wrapper over rankSides
// for callers that just want the top matches (e.g. a one-shot preview).
export function suggestSides(recipe: any, count = 3): SideDish[] {
  return rankSides(recipe).slice(0, count);
}
