// Recipes the other people in your household have saved, for Library → Household.
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis, householdFor } from "../../../../lib/household";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ recipes: [] });
  const h = await householdFor(userId);
  if (!h) return NextResponse.json({ recipes: [], household: false });
  const others = h.members.filter((m) => m.id !== userId);
  if (!others.length) return NextResponse.json({ recipes: [], household: true });
  const lists = await redis.mget<any[][]>(...others.map((m) => `recipes:${m.id}`));
  const recipes: any[] = [];
  others.forEach((m, i) => {
    for (const r of (Array.isArray(lists[i]) ? lists[i] : []).slice(0, 300)) {
      if (r && typeof r === "object" && r.title) recipes.push({ ...r, _savedBy: m.name });
    }
  });
  return NextResponse.json({ recipes, household: true });
}
