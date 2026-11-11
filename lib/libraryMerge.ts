// How a save from one device is folded into the account's library.
export const MAX_RECIPES = 3000;
const MAX_ONE = 300_000;

const ok = (r: any) => r && typeof r === "object" && r.id != null && typeof r.title === "string" && JSON.stringify(r).length <= MAX_ONE;

// body: { changed: [recipes], removed: [ids] } from the current app, or { recipes: [whole list] } from an older copy.
// gone: { id: time removed }. Returns null when there's nothing usable in the body.
export function mergeLibrary(had: any[], goneWas: Record<string, number>, body: any, now: number): { list: any[]; gone: Record<string, number> } | null {
  let list = had.slice();
  const gone: Record<string, number> = { ...goneWas };
  if (Array.isArray(body?.changed) || Array.isArray(body?.removed)) {
    const removed: string[] = (Array.isArray(body.removed) ? body.removed : []).map((x: any) => String(x).slice(0, 80)).slice(0, MAX_RECIPES);
    const changed: any[] = (Array.isArray(body.changed) ? body.changed : []).filter(ok).slice(0, 200);
    for (const id of removed) gone[id] = now;
    const drop = new Set(removed);
    list = list.filter((r) => !drop.has(String(r?.id)));
    const at = new Map(list.map((r, i) => [String(r?.id), i]));
    const added: any[] = [];
    for (const r of changed) {
      const id = String(r.id);
      delete gone[id]; // saved again after being removed
      const i = at.get(id);
      if (i === undefined) { at.set(id, -1 - added.length); added.push(r); }
      else if (i < 0) added[-1 - i] = r;
      else list[i] = r;
    }
    return { list: [...added, ...list], gone };
  }
  if (Array.isArray(body?.recipes)) {
    // an older copy of the app: take recipes the account doesn't have, and nothing else
    const have = new Set(list.map((r) => String(r?.id)));
    for (const r of body.recipes.filter(ok)) {
      const id = String(r.id);
      if (!have.has(id) && !gone[id]) { list.push(r); have.add(id); }
    }
    return { list, gone };
  }
  return null;
}
