import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis, planKeyFor, memberInfo, type Household } from "../../../lib/household";
import { mergeDocs, normalizeDoc } from "../../../lib/planMerge";

export const dynamic = "force-dynamic";

// One meal plan + grocery list per signed-in user, or per household when they share one.
// { plan, sides, made, list, updatedAt, meta }
// plan:  { "YYYY-MM-DD": recipe }
// sides: { "YYYY-MM-DD": [{ title, status, recipe }] }
// made:  { "YYYY-MM-DD": true }
// list:  { extras: [...], checked: { itemId: time }, cleared: { itemId: time } }
// meta (households only): who added each meal / extra, who checked what, and recent activity

type Meta = {
  planBy: Record<string, { id: string; name: string; at: number }>;
  extrasBy: Record<string, { id: string; name: string }>;
  checkedBy: Record<string, { id: string; name: string; at: number }>;
  activity: { id: string; name: string; text: string; at: number }[];
};
const emptyMeta = (): Meta => ({ planBy: {}, extrasBy: {}, checkedBy: {}, activity: [] });

function publicHousehold(h: Household | null, userId: string) {
  if (!h) return null;
  return { id: h.id, owner: h.owner, me: userId, members: h.members.map((m) => ({ id: m.id, name: m.name, image: m.image })) };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { key, household } = await planKeyFor(userId);
    const doc = await redis.get<any>(key);
    return NextResponse.json({ found: !!doc, ...(doc || {}), household: publicHousehold(household, userId) });
  } catch (err) {
    console.error("Plan GET error:", err);
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}

const dayName = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    // New clients send { base, next }; older ones send the whole doc
    const next = body.next || body;
    const base = body.next ? body.base || null : null;
    const { key, household } = await planKeyFor(userId);
    const prev = (await redis.get<any>(key)) || {};
    const { doc, planChanged, addedExtras, newlyChecked } = mergeDocs(prev, base, next);
    if (!body.next && !next.list && prev.list) doc.list = normalizeDoc(prev).list; // older app without the list

    const out: any = { ...doc, updatedAt: Date.now() };
    if (household) {
      const meta: Meta = { ...emptyMeta(), ...(prev.meta || {}) };
      const me = household.members.find((m) => m.id === userId) || (await memberInfo(userId));
      const who = { id: userId, name: me.name };
      const now = Date.now();
      const log = (text: string) => meta.activity.unshift({ ...who, text, at: now });
      for (const k of planChanged) {
        const before = prev.plan?.[k], after = doc.plan[k];
        if (after && (!before || before.title !== after.title)) {
          meta.planBy[k] = { ...who, at: now };
          log(before ? `swapped ${dayName(k)} to ${after.title}` : `added ${after.title} to ${dayName(k)}`);
        } else if (!after && before) {
          delete meta.planBy[k];
          log(`removed ${dayName(k)}'s ${before.title}`);
        }
      }
      for (const x of addedExtras) meta.extrasBy[x.id] = who;
      if (addedExtras.length) log(addedExtras.length === 1 ? `added ${addedExtras[0].name} to the list` : `added ${addedExtras.length} things to the list`);
      for (const id of newlyChecked) meta.checkedBy[id] = { ...who, at: now };
      // keep meta small: only what still exists
      const extraIds = new Set(doc.list.extras.map((x: any) => x.id));
      for (const id of Object.keys(meta.extrasBy)) if (!extraIds.has(id)) delete meta.extrasBy[id];
      for (const id of Object.keys(meta.checkedBy)) if (!doc.list.checked[id]) delete meta.checkedBy[id];
      for (const k of Object.keys(meta.planBy)) if (!doc.plan[k]) delete meta.planBy[k];
      meta.activity = meta.activity.filter((a) => now - a.at < 7 * 864e5).slice(0, 30);
      out.meta = meta;
    }
    if (JSON.stringify(out).length > 2_000_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
    await redis.set(key, out);
    return NextResponse.json({ ok: true, ...out, household: publicHousehold(household, userId) });
  } catch (err) {
    console.error("Plan POST error:", err);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}
