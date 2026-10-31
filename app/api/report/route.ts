// POST /api/report: someone flags a Community recipe or a shared recipe link.
// Reports wait on the admin page (Reported recipes) for a person to remove or dismiss.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";
import { overLimit, clientIp } from "../../../lib/guard";

export const dynamic = "force-dynamic";
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
const REASONS = ["Offensive or inappropriate", "Not a real recipe", "Unsafe or wrong instructions", "Copied without permission", "Something else"];

export async function POST(req: NextRequest) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const kind = b?.kind === "share" ? "share" : b?.kind === "community" ? "community" : "";
  const target = String(b?.target || "").slice(0, 160).trim();
  const reason = REASONS.includes(b?.reason) ? b.reason : "";
  if (!kind || !target || !reason) return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  if (await overLimit(redis, `report:${clientIp(req)}`, 20, 3600)) return NextResponse.json({ ok: true }); // quietly ignore floods
  let who = "";
  try { who = (await auth()).userId || ""; } catch {}
  const id = crypto.randomBytes(6).toString("hex");
  await redis.hset("reports:v1", { [id]: JSON.stringify({
    id, kind, target, reason, title: String(b?.title || "").slice(0, 120), note: String(b?.note || "").slice(0, 500),
    at: new Date().toISOString(), by: who ? "signed-in user" : "visitor",
  }) });
  return NextResponse.json({ ok: true });
}
