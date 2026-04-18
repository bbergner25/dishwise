import { NextRequest, NextResponse } from "next/server";

// Upstash Redis REST API - auto-injected when you connect via Vercel Storage
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key: string): Promise<string | null> {
  if (!KV_URL || !KV_TOKEN) throw new Error("KV not configured");
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  const data = await res.json();
  return data.result ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!KV_URL || !KV_TOKEN) throw new Error("KV not configured");
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([key, value]),
  });
}

// GET /api/family?code=ABC123
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  try {
    const data = await kvGet(`family:${code}`);
    if (!data) return NextResponse.json({ found: false }, { status: 404 });
    return NextResponse.json({ found: true, recipes: JSON.parse(data) });
  } catch (e) {
    console.error("KV GET error:", e);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
}

// POST /api/family  body: { code, recipes }
export async function POST(req: NextRequest) {
  try {
    const { code, recipes } = await req.json();
    if (!code || !Array.isArray(recipes)) {
      return NextResponse.json({ error: "Missing code or recipes" }, { status: 400 });
    }
    await kvSet(`family:${code.toUpperCase()}`, JSON.stringify(recipes));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("KV SET error:", e);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
}
