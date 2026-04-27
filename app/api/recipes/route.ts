import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const recipes = await redis.get<any[]>(`recipes:${userId}`);
    return NextResponse.json({ recipes: recipes || [] });
  } catch (err) {
    console.error("Redis GET error:", err);
    return NextResponse.json({ error: "Failed to load recipes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { recipes } = await req.json();
    await redis.set(`recipes:${userId}`, recipes);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Redis POST error:", err);
    return NextResponse.json({ error: "Failed to save recipes" }, { status: 500 });
  }
}
