// Merging plan + grocery list changes from several devices or people.
// Each save sends what the device last saw (base) and what it has now (next). Only what
// actually changed on that device is applied on top of the latest copy, so two people
// checking off groceries at the same time don't undo each other.

export type PlanDoc = {
  plan: Record<string, any>;
  sides: Record<string, any>;
  made: Record<string, any>;
  list: { extras: any[]; checked: Record<string, number>; cleared: Record<string, number> };
};

const obj = (v: any) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
export function normalizeDoc(d: any): PlanDoc {
  const l = obj(d?.list);
  return {
    plan: obj(d?.plan), sides: obj(d?.sides), made: obj(d?.made),
    list: { extras: Array.isArray(l.extras) ? l.extras : [], checked: obj(l.checked), cleared: obj(l.cleared) },
  };
}

const same = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

// Apply the keys that changed between base and next onto target. With no base, only add/overwrite.
function mergeMap(target: Record<string, any>, base: Record<string, any> | null, next: Record<string, any>): { out: Record<string, any>; changed: string[] } {
  const out = { ...target };
  const changed: string[] = [];
  const keys = new Set([...Object.keys(next), ...(base ? Object.keys(base) : [])]);
  keys.forEach((k) => {
    if (base && same(base[k], next[k])) return; // untouched on this device
    if (next[k] === undefined) { if (k in out) { delete out[k]; changed.push(k); } }
    else if (!same(out[k], next[k])) { out[k] = next[k]; changed.push(k); }
  });
  return { out, changed };
}

export type MergeResult = { doc: PlanDoc; planChanged: string[]; addedExtras: any[]; newlyChecked: string[] };

export function mergeDocs(prevIn: any, baseIn: any | null, nextIn: any): MergeResult {
  const prev = normalizeDoc(prevIn), next = normalizeDoc(nextIn);
  const base = baseIn ? normalizeDoc(baseIn) : null;
  const plan = mergeMap(prev.plan, base?.plan || null, next.plan);
  const sides = mergeMap(prev.sides, base?.sides || null, next.sides);
  const made = mergeMap(prev.made, base?.made || null, next.made);
  const checked = mergeMap(prev.list.checked, base?.list.checked || null, next.list.checked);
  const cleared = mergeMap(prev.list.cleared, base?.list.cleared || null, next.list.cleared);

  // extras: by id — added here are added, removed here are removed, everything else kept
  const baseIds = new Set((base?.list.extras || []).map((x: any) => x?.id));
  const nextIds = new Set(next.list.extras.map((x: any) => x?.id));
  const removed = base ? Array.from(baseIds).filter((id) => !nextIds.has(id)) : [];
  const prevIds = new Set(prev.list.extras.map((x: any) => x?.id));
  const addedExtras = next.list.extras.filter((x: any) => x?.id && !baseIds.has(x.id) && !prevIds.has(x.id));
  const extras = [...prev.list.extras.filter((x: any) => !removed.includes(x?.id)), ...addedExtras].slice(-300);

  const newlyChecked = checked.changed.filter((k) => checked.out[k] && !prev.list.checked[k]);
  return {
    doc: { plan: plan.out, sides: sides.out, made: made.out, list: { extras, checked: checked.out, cleared: cleared.out } },
    planChanged: Array.from(new Set([...plan.changed, ...sides.changed])),
    addedExtras, newlyChecked,
  };
}
