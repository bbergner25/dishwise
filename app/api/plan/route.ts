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
// list:  { extras: [...], checked: { itemId: time }, cleared: { itemId: time } }  (the grocery list)

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
    const { plan, sides, made, list } = await req.json();
    const obj = (v: any) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
    const doc: any = { plan: obj(plan), sides: obj(sides), made: obj(made), updatedAt: Date.now() };
    if (list && typeof list === "object") {
      doc.list = { extras: Array.isArray(list.extras) ? list.extras.slice(0, 300) : [], checked: obj(list.checked), cleared: obj(list.cleared) };
    } else {
      const prev = await redis.get<any>(`plan:${userId}`); // an older app version saving the plan keeps the list
      if (prev?.list) doc.list = prev.list;
    }
    if (JSON.stringify(doc).length > 900_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
    await redis.set(`plan:${userId}`, doc);
    return NextResponse.json({ ok: true, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error("Plan POST error:", err);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}
