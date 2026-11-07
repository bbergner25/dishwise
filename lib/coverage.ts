// How well the Community library covers "Plan my week": dinners per time level, overall and per diet.
import { isDinner, fitsDiets, levelOf, type Level } from "./quickplan";

export const COVER_DIETS = ["All", "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Low-Carb"] as const;
export const COVER_LEVELS: { id: Exclude<Level, "skip">; name: string; range: string }[] = [
  { id: "quick", name: "Quick", range: "under 30 minutes" },
  { id: "normal", name: "Normal", range: "30 to 60 minutes" },
  { id: "long", name: "Take my time", range: "over an hour" },
];
// Enough that two weeks of planning, skipping the last two weeks' dinners, still has real choice
export const TARGETS: Record<string, Record<string, number>> = {
  All: { quick: 40, normal: 30, long: 15 },
  default: { quick: 15, normal: 12, long: 6 },
};
export const targetFor = (diet: string, level: string) => (TARGETS[diet] || TARGETS.default)[level];

export type Coverage = { total: number; dinners: number; noTime: number; cells: Record<string, Record<string, string[]>> };

export function coverage(pool: any[]): Coverage {
  const cells: Record<string, Record<string, string[]>> = {};
  for (const d of COVER_DIETS) cells[d] = { quick: [], normal: [], long: [] };
  let dinners = 0, noTime = 0;
  for (const r of pool) {
    if (!isDinner(r)) continue;
    dinners++;
    const lv = levelOf(r);
    if (!lv || lv === "skip") { noTime++; continue; }
    for (const d of COVER_DIETS) if (d === "All" || fitsDiets(r, [d])) cells[d][lv].push(String(r.title));
  }
  return { total: pool.length, dinners, noTime, cells };
}

// The gaps worth filling, biggest shortfall first
export function gaps(c: Coverage): { diet: string; level: string; have: number; need: number }[] {
  const out: { diet: string; level: string; have: number; need: number }[] = [];
  for (const d of COVER_DIETS) for (const l of COVER_LEVELS) {
    const have = c.cells[d][l.id].length, target = targetFor(d, l.id);
    if (have < target) out.push({ diet: d, level: l.id, have, need: target - have });
  }
  return out.sort((a, b) => b.need - a.need);
}
