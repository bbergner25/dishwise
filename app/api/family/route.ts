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
    return NextResponse.json({ error: "Could not load that code" }, { status: 500 });
  }
}

// Family codes are read-only now (households replaced them), so nothing can be written here.
