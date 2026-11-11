// Read-aloud in a natural voice (Gemini text-to-speech), saved as a small MP3 so each sentence
// is paid for once, for everyone: Community recipes and phrases like "Time's up for step 3" are shared.
//   POST { text } → { url }
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createHash } from "crypto";
import { put } from "@vercel/blob";
import { Mp3Encoder } from "@breezystack/lamejs";
import { overLimit, overCap, isRude } from "../../../lib/guard";
import { caller } from "../../../lib/aiGate";

export const maxDuration = 60;
const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
// new sentences voiced per day, everyone together (each is paid for once, then shared)
const DAILY_CAP = Number(process.env.SPEAK_DAILY_CAP || 2000);
const VOICE = process.env.TTS_VOICE || "Sulafat"; // warm
const MODELS = [process.env.GEMINI_TTS_MODEL, "gemini-2.5-flash-preview-tts", "gemini-2.5-flash-tts"].filter(Boolean) as string[];

async function speak(text: string): Promise<{ pcm: Buffer; rate: number }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  let last = "";
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Read this cooking step aloud in a warm, relaxed, friendly voice, like a friend cooking alongside you. Read only the step:\n\n${text}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      }),
      signal: AbortSignal.timeout(40000),
    });
    const raw = await res.text();
    if (res.status === 404) { last = raw.slice(0, 300); continue; } // try the next model name
    if (!res.ok) throw new Error(`Gemini TTS ${res.status}: ${raw.slice(0, 500)}`);
    const part = (JSON.parse(raw)?.candidates?.[0]?.content?.parts || []).find((p: any) => p.inlineData?.data || p.inline_data?.data);
    const d = part?.inlineData || part?.inline_data;
    if (!d?.data) throw new Error("No audio returned");
    const rate = Number(/rate=(\d+)/.exec(String(d.mimeType || d.mime_type || ""))?.[1]) || 24000;
    return { pcm: Buffer.from(d.data, "base64"), rate };
  }
  throw new Error(`No TTS model available: ${last}`);
}

function toMp3(pcm: Buffer, rate: number): Buffer {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const enc = new Mp3Encoder(1, rate, 48);
  const out: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += 1152) { const b = enc.encodeBuffer(samples.subarray(i, i + 1152)); if (b.length) out.push(b); }
  out.push(enc.flush());
  return Buffer.concat(out.map((b) => Buffer.from(b)));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").replace(/\s+/g, " ").trim().slice(0, 700);
    if (!text || isRude(text)) return NextResponse.json({ error: "Nothing to read" }, { status: 400 });
    const id = createHash("sha1").update(VOICE + "|" + text).digest("hex");
    const k = `tts:v1:${id}`;
    const hit = await redis.get<string>(k);
    if (hit) return NextResponse.json({ url: hit });
    const { who, signedIn } = await caller(req);
    if (await overLimit(redis, `speak:${who}`, signedIn ? 80 : 30, 600) ||
        await overLimit(redis, `speakday:${who}`, signedIn ? 400 : 60, 86400) ||
        await overCap(redis, "speakday:all", DAILY_CAP, 86400)) return NextResponse.json({ error: "Too many" }, { status: 429 });
    const { pcm, rate } = await speak(text);
    const mp3 = toMp3(pcm, rate);
    const blob = await put(`speech/${id}.mp3`, mp3, { access: "public", contentType: "audio/mpeg", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 * 60 * 24 * 365 });
    await redis.set(k, blob.url);
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("Speak error:", err);
    return NextResponse.json({ error: "Couldn't read that aloud" }, { status: 500 });
  }
}
