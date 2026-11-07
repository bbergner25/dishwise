// Households: create one by inviting someone, join with a link, leave, or (owner only) remove someone.
//   GET                                  → { household }
//   GET  ?invite=<token>                 → { valid, inviter, members }   (to show the join screen)
//   POST { action: "invite" }            → { url }       (creates your household if you don't have one)
//   POST { action: "join", token }       → { ok }        (your current plan joins the shared one)
//   POST { action: "leave" }             → { ok }        (you keep a copy of the plan)
//   POST { action: "remove", userId }    → { ok }        (owner only)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis, householdFor, memberInfo, randomId, removeMember, HH_KEY, USER_HH_KEY, HH_PLAN_KEY, INVITE_KEY, MAX_MEMBERS, type Household } from "../../../lib/household";
import { overLimit, clientIp } from "../../../lib/guard";
import { normalizeDoc } from "../../../lib/planMerge";

export const dynamic = "force-dynamic";

const pub = (h: Household | null, me: string) => h ? { id: h.id, owner: h.owner, me, members: h.members.map((m) => ({ id: m.id, name: m.name, image: m.image })) } : null;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("invite");
  if (token) {
    if (await overLimit(redis, `hh-invite:${clientIp(req)}`, 30, 600)) return NextResponse.json({ valid: false }, { status: 429 });
    const inv = await redis.get<{ hid: string; by: string }>(INVITE_KEY(token));
    const h = inv ? await redis.get<Household>(HH_KEY(inv.hid)) : null;
    if (!inv || !h) return NextResponse.json({ valid: false });
    const inviter = h.members.find((m) => m.id === inv.by) || h.members[0];
    return NextResponse.json({ valid: true, inviter: inviter?.name || "Someone", members: h.members.map((m) => m.name), full: h.members.length >= MAX_MEMBERS });
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ household: null });
  return NextResponse.json({ household: pub(await householdFor(userId), userId) });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (await overLimit(redis, `hh:${userId}`, 30, 600)) return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  let h = await householdFor(userId);

  if (body.action === "invite") {
    if (!h) {
      // Start a household from this person's own plan
      const id = randomId(14);
      h = { id, owner: userId, members: [await memberInfo(userId)], createdAt: Date.now() };
      const own = await redis.get<any>(`plan:${userId}`);
      await redis.set(HH_KEY(id), h);
      await redis.set(HH_PLAN_KEY(id), { ...normalizeDoc(own || {}), updatedAt: Date.now(), meta: { planBy: {}, extrasBy: {}, checkedBy: {}, activity: [] } });
      await redis.set(USER_HH_KEY(userId), id);
    }
    if (h.members.length >= MAX_MEMBERS) return NextResponse.json({ error: `A household can have up to ${MAX_MEMBERS} people.` }, { status: 400 });
    const token = randomId(20);
    await redis.set(INVITE_KEY(token), { hid: h.id, by: userId }, { ex: 14 * 86400 });
    const origin = req.headers.get("origin") || `https://${req.headers.get("host") || "everychef.app"}`;
    return NextResponse.json({ url: `${origin}/join/${token}`, household: pub(h, userId) });
  }

  if (body.action === "join") {
    const token = String(body.token || "");
    const inv = token ? await redis.get<{ hid: string; by: string }>(INVITE_KEY(token)) : null;
    const target = inv ? await redis.get<Household>(HH_KEY(inv.hid)) : null;
    if (!inv || !target) return NextResponse.json({ error: "This invite has expired. Ask for a new link." }, { status: 404 });
    if (target.members.some((m) => m.id === userId)) return NextResponse.json({ ok: true, household: pub(target, userId) });
    if (target.members.length >= MAX_MEMBERS) return NextResponse.json({ error: "That household is full." }, { status: 400 });
    if (h) await removeMember(h, userId); // leaving another household first

    // Bring this person's plan along: open days take their meal, taken days get it as a side
    const mine = normalizeDoc((await redis.get<any>(`plan:${userId}`)) || {});
    const shared: any = (await redis.get<any>(HH_PLAN_KEY(target.id))) || {};
    const doc = normalizeDoc(shared);
    const me = await memberInfo(userId);
    const meta = shared.meta || { planBy: {}, extrasBy: {}, checkedBy: {}, activity: [] };
    const today = new Date().toISOString().slice(0, 10);
    for (const [k, r] of Object.entries(mine.plan)) {
      if (k < today || !r) continue;
      if (!doc.plan[k]) { doc.plan[k] = r; meta.planBy[k] = { id: userId, name: me.name, at: Date.now() }; }
      else if ((r as any).title !== doc.plan[k].title) {
        const sides = Array.isArray(doc.sides[k]) ? doc.sides[k] : [];
        if (!sides.some((x: any) => x?.title === (r as any).title)) doc.sides[k] = [...sides, { title: (r as any).title, status: "done", recipe: r }];
      }
      for (const s of (mine.sides[k] || [])) {
        const sides = Array.isArray(doc.sides[k]) ? doc.sides[k] : [];
        if (s?.title && !sides.some((x: any) => x?.title === s.title)) doc.sides[k] = [...sides, s];
      }
    }
    const ids = new Set(doc.list.extras.map((x: any) => x.id));
    for (const x of mine.list.extras) if (!ids.has(x.id)) { doc.list.extras.push(x); meta.extrasBy[x.id] = { id: userId, name: me.name }; }
    meta.activity = [{ id: userId, name: me.name, text: "joined the household", at: Date.now() }, ...(meta.activity || [])].slice(0, 30);

    const updated: Household = { ...target, members: [...target.members, me] };
    await redis.set(HH_KEY(target.id), updated);
    await redis.set(HH_PLAN_KEY(target.id), { ...doc, updatedAt: Date.now(), meta });
    await redis.set(USER_HH_KEY(userId), target.id);
    return NextResponse.json({ ok: true, household: pub(updated, userId) });
  }

  if (body.action === "leave") {
    if (h) await removeMember(h, userId);
    return NextResponse.json({ ok: true, household: null });
  }

  if (body.action === "remove") {
    if (!h) return NextResponse.json({ error: "You're not in a household." }, { status: 400 });
    if (h.owner !== userId) return NextResponse.json({ error: "Only the person who started the household can remove people." }, { status: 403 });
    const who = String(body.userId || "");
    if (!who || who === userId || !h.members.some((m) => m.id === who)) return NextResponse.json({ error: "They're not in your household." }, { status: 400 });
    await removeMember(h, who);
    return NextResponse.json({ ok: true, household: pub(await householdFor(userId), userId) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
