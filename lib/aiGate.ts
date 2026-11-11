// Who is asking, and whether they (or everyone together) have used up the AI allowance.
// Shared by every route that pays for a Claude call.
import { auth } from "@clerk/nextjs/server";
import { overLimit, overCap, clientIp } from "./guard";

// All Claude calls from everyone in one day. Raise ANTHROPIC_DAILY_CALL_CAP in Vercel as traffic grows.
export const DAILY_CAP = Number(process.env.ANTHROPIC_DAILY_CALL_CAP || 1000);

export async function caller(req: Request): Promise<{ who: string; signedIn: boolean }> {
  let who = `ip:${clientIp(req)}`;
  try { const { userId } = await auth(); if (userId) who = `u:${userId}`; } catch {}
  return { who, signedIn: who.startsWith("u:") };
}

// null = go ahead; otherwise why not
export async function aiGate(req: Request, redis: any): Promise<null | "person" | "all"> {
  const { who, signedIn } = await caller(req);
  if (await overLimit(redis, `ai10m:${who}`, signedIn ? 60 : 30, 600) ||
      await overLimit(redis, `aiday:${who}`, signedIn ? 400 : 120, 86400)) return "person";
  if (await overCap(redis, "aiday:all", DAILY_CAP, 86400)) return "all";
  return null;
}
