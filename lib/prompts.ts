// Shared prompt builders. Moved out of App.tsx so the cache-warming route
// generates recipes using the exact same prompt as the live app — no risk
// of the two drifting apart over time.

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function buildPrompt(dish: string, diets: string[], seasonal: boolean, location: string): string {
  const d = diets.length ? " Dietary needs: " + diets.join(", ") + "." : "";
  const now = new Date();
  const monthYear = MONTHS[now.getMonth()] + " " + now.getFullYear();
  const s = seasonal && location
    ? ` Seasonal recipe for ${location} in ${monthYear}. Prioritize peak produce. Include a seasonal_note (one sentence).`
    : seasonal ? ` Prioritize ingredients in season (${monthYear}). Include a seasonal_note.` : "";
  return `Create a recipe for "${dish}".${d}${s}
Use US imperial measurements only (cups, tbsp, tsp, oz, lbs, °F) — no grams, ml, or Celsius.
Reply with ONLY valid JSON, no other text:
{"title":"...","tagline":"...","prep_time":"X mins","cook_time":"X mins","servings":"4","ingredient_groups":[{"label":"For the Marinade","items":[{"amount":"2 tbsp","name":"soy sauce"}]},{"label":"","items":[{"amount":"1 cup","name":"rice"}]}],"steps":["Step one."],"grocery_items":["soy sauce","rice"],"sources":["AllRecipes","Serious Eats"],"source_note":"...","seasonal_note":"..."}
Rules: group ingredients by component when useful; single group with empty label for simple recipes. 6-10 steps. grocery_items: flat names only. sources: 2-3 real sites. seasonal_note only if seasonal requested.`;
}
