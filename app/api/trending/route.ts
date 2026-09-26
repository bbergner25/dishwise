import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { PROMOTED_DISHES } from "../../../lib/promoted";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// GET /api/trending
// Returns current trending dishes. Falls back to promoted list if no trending data exists yet.
export async function GET() {
  try {
    const data = await redis.get<{ dishes: string[]; generatedAt: string; cycle: string }>("trending:current");

    if (data?.dishes?.length) {
      return NextResponse.json({
        dishes: data.dishes,
        generatedAt: data.generatedAt,
        cycle: data.cycle,
        source: "agent",
      });
    }

    // Fallback: use promoted dishes if the agent hasn't run yet
    if (PROMOTED_DISHES.length > 0) {
      return NextResponse.json({
        dishes: PROMOTED_DISHES.slice(0, 6),
        source: "promoted",
      });
    }

    return NextResponse.json({ dishes: [], source: "empty" });
  } catch (err) {
    console.error("Trending GET error:", err);
    return NextResponse.json({ dishes: [], source: "error" });
  }
}
