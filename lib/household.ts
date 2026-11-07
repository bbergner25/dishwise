// Households: people who share one meal plan and one grocery list. Tied to accounts:
// you join with an invite link while signed in, and only members can read or change anything.
import { Redis } from "@upstash/redis";
import { clerkClient } from "@clerk/nextjs/server";

export const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

export type Member = { id: string; name: string; image?: string; joinedAt: number };
export type Household = { id: string; owner: string; members: Member[]; createdAt: number };

export const HH_KEY = (id: string) => `household:${id}`;
export const USER_HH_KEY = (userId: string) => `user-household:${userId}`;
export const HH_PLAN_KEY = (id: string) => `household-plan:${id}`;
export const INVITE_KEY = (token: string) => `household-invite:${token}`;
export const MAX_MEMBERS = 8;

export async function householdFor(userId: string): Promise<Household | null> {
  const id = await redis.get<string>(USER_HH_KEY(userId));
  if (!id) return null;
  const h = await redis.get<Household>(HH_KEY(id));
  if (!h || !h.members.some((m) => m.id === userId)) return null;
  return h;
}

// Where this person's plan + list live: their household's copy, or their own
export async function planKeyFor(userId: string): Promise<{ key: string; household: Household | null }> {
  const household = await householdFor(userId);
  return { key: household ? HH_PLAN_KEY(household.id) : `plan:${userId}`, household };
}

export async function memberInfo(userId: string): Promise<Member> {
  try {
    const u = await clerkClient().users.getUser(userId);
    const name = u.firstName || u.username || (u.emailAddresses?.[0]?.emailAddress || "").split("@")[0] || "Someone";
    return { id: userId, name, image: u.imageUrl || undefined, joinedAt: Date.now() };
  } catch {
    return { id: userId, name: "Someone", joinedAt: Date.now() };
  }
}

export const randomId = (n = 12) => {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

// Remove someone; hands ownership on if the owner leaves, and deletes an empty household.
// The person leaving keeps a copy of the plan as their own.
export async function removeMember(h: Household, userId: string): Promise<void> {
  const members = h.members.filter((m) => m.id !== userId);
  const doc = await redis.get<any>(HH_PLAN_KEY(h.id));
  if (doc) await redis.set(`plan:${userId}`, { plan: doc.plan || {}, sides: doc.sides || {}, made: doc.made || {}, list: doc.list || undefined, updatedAt: Date.now() });
  await redis.del(USER_HH_KEY(userId));
  if (!members.length) {
    await redis.del(HH_KEY(h.id));
    await redis.del(HH_PLAN_KEY(h.id));
    return;
  }
  const owner = h.owner === userId ? members[0].id : h.owner;
  await redis.set(HH_KEY(h.id), { ...h, owner, members });
}
