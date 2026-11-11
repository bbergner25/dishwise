// Fetching a web address someone typed in, safely: public websites only, never this
// server's own network, with every redirect re-checked and the download size capped.
import { lookup } from "dns/promises";
import net from "net";

function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return privateV4(ip);
  const v = ip.toLowerCase();
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]);
  return v === "::" || v === "::1" || v.startsWith("::ffff:") || v.startsWith("64:ff9b:") ||
    /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
}

export async function assertPublic(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("BLOCKED: not a web address"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("BLOCKED: not a web address");
  if (u.username || u.password) throw new Error("BLOCKED: sign-in details in the address");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("BLOCKED: unusual port");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || /\.(localhost|local|internal|lan|home|corp)$/.test(host)) throw new Error("BLOCKED: private address");
  if (net.isIP(host)) { if (isPrivateIp(host)) throw new Error("BLOCKED: private address"); return u; }
  if (!host.includes(".")) throw new Error("BLOCKED: private address");
  const addrs = await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error("UNREACHABLE: no such site");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("BLOCKED: private address");
  return u;
}

// fetch() that checks the address and each redirect before going there
export async function safeFetch(raw: string, init: RequestInit = {}, maxHops = 5): Promise<Response> {
  let url = raw;
  for (let hop = 0; hop <= maxHops; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { ...init, redirect: "manual" });
    const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!loc) { Object.defineProperty(res, "url", { value: url }); return res; }
    url = new URL(loc, url).toString();
  }
  throw new Error("BLOCKED: too many redirects");
}

// the page text, stopping at a size limit instead of reading a huge download
export async function readText(res: Response, maxBytes = 3_000_000): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value); size += value.length;
  }
  try { await reader.cancel(); } catch {}
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, maxBytes).toString("utf8");
}
