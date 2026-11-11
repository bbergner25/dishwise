// Who may use the admin pages.
//
// With ADMIN_USER_IDS set in Vercel (your Every Chef account ID; several separated by commas),
// admin works only for those accounts while signed in, and no secret ever appears in a link.
// Links that DO something carry a short key that only works for that signed-in account and
// expires within two days, so a link can't be replayed by anyone else or triggered from another site.
//
// Without ADMIN_USER_IDS it falls back to the old shared secret in the link (WARM_SECRET).
import { auth } from "@clerk/nextjs/server";
import { createHash, timingSafeEqual } from "crypto";

const ids = () => (process.env.ADMIN_USER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const dayKey = (userId: string, daysAgo: number) =>
  createHash("sha256").update(`${process.env.CLERK_SECRET_KEY}|admin|${userId}|${new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10)}`).digest("hex").slice(0, 32);

export type Admin = {
  ok: boolean;        // may see the admin home page
  canAct: boolean;    // may run an action (anything other than the home page)
  key: string;        // what links carry in ?secret=
  bySignIn: boolean;
  userId: string | null;
};

export async function adminAccess(given: string | null): Promise<Admin> {
  let userId: string | null = null;
  try { userId = (await auth()).userId; } catch {}
  if (ids().length) {
    if (!userId || !ids().includes(userId)) return { ok: false, canAct: false, key: "", bySignIn: true, userId };
    const key = dayKey(userId, 0);
    const canAct = !!given && (same(given, key) || same(given, dayKey(userId, 1)));
    return { ok: true, canAct, key, bySignIn: true, userId };
  }
  const secret = process.env.WARM_SECRET || "";
  const ok = !!secret && !!given && same(given, secret);
  return { ok, canAct: ok, key: ok ? secret : "", bySignIn: false, userId };
}
