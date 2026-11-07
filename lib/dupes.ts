// "Same dish, different name": Tater Tot Hotdish, Tater Tot Hotdish (No Cream of Mushroom Soup),
// Easy Tater Tot Hotdish Without Cream of Soups… all come down to "tater tot hotdish".
const FILLER = new Set(["classic", "easy", "simple", "quick", "best", "ultimate", "homemade", "the", "a", "an", "authentic", "traditional", "perfect", "recipe", "style", "scratch", "from", "made", "really", "super", "my", "our"]);

export function coreTitle(title: string): string {
  const base = String(title || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  let words = base.split(" ").filter(Boolean);
  // "… without cream of mushroom soup", "… no canned soup" describe a variation, not a different dish
  const cut = words.findIndex((w, i) => i >= 2 && (w === "without" || w === "no" || w === "minus" || w === "sans"));
  if (cut > 0) words = words.slice(0, cut);
  const core = words.filter((w) => !FILLER.has(w)).map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)).join(" ");
  return core || base;
}
