// DELETE /api/account: permanently deletes the signed-in person's account and their data.
// Required for the App Store: anyone who can create an account must be able to delete it in the app.
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";
import { householdFor, removeMember } from "../../../lib/household";

export const dynamic = "force-dynamic";

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    // leave their household (the others keep the shared plan)
    const h = await householdFor(userId);
    if (h) await removeMember(h, userId);
    // links this person shared stop working
    const shares = ((await redis.smembers(`user-shares:${userId}`)) || []) as string[];
    const keys = [
      `recipes:${userId}`, `recipes-removed:${userId}`, `plan:${userId}`, `user-shares:${userId}`,
      ...shares.flatMap((s) => [`recipe-share:${s}`, `recipe-share-token:${s}`, `recipe-share-redirect:${s}`]),
    ];
    for (let i = 0; i < keys.length; i += 50) await redis.del(...keys.slice(i, i + 50));
    await redis.srem("dish-photo-preview-users", userId);
    // finally the sign-in account itself
    await clerkClient().users.deleteUser(userId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Account delete error:", e?.message || e);
    return NextResponse.json({ error: "Couldn't delete the account. Please try again." }, { status: 500 });
  }
}
