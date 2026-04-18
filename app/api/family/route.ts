import { NextRequest, NextResponse } from "next/server";

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key: string): Promise<string | null> {
  if (!KV_URL || !KV_TOKEN) throw new Error("KV_REST_API_URL or KV_REST_API_TOKEN not set");
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV GET failed: ${res.status}`);
  const data = await res.json();
  return data.result ?? null;
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!KV_URL || !KV_TOKEN) throw new Error("KV_REST_API_URL or KV_REST_API_TOKEN not set");
  // Upstash REST API: POST /set/key/value
  const res = await fetch(
    `${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    }
  );
  if (!res.ok) throw new Error(`KV SET failed: ${res.status}`);
}

// GET /api/family?code=ABC123
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  try {
    const data = await kvGet(`family:${code}`);
    if (!data) return NextResponse.json({ found: false }, { status: 404 });
    return NextResponse.json({ found: true, recipes: JSON.parse(data) });
  } catch (e: any) {
    console.error("KV GET error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
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
  } catch (e: any) {
    console.error("KV SET error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
