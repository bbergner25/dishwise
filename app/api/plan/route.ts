import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// One meal plan per signed-in user: { plan, sides, made, updatedAt }
// plan:  { "YYYY-MM-DD": recipe }
// sides: { "YYYY-MM-DD": [{ title, status, recipe }] }
// made:  { "YYYY-MM-DD": true }

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const doc = await redis.get<any>(`plan:${userId}`);
    return NextResponse.json({ found: !!doc, ...(doc || {}) });
  } catch (err) {
    console.error("Plan GET error:", err);
    return NextResponse.json({ error: "Failed to load plan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { plan, sides, made } = await req.json();
    const obj = (v: any) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
    const doc = { plan: obj(plan), sides: obj(sides), made: obj(made), updatedAt: Date.now() };
    await redis.set(`plan:${userId}`, doc);
    return NextResponse.json({ ok: true, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error("Plan POST error:", err);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}
