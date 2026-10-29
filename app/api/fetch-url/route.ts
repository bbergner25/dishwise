import { NextRequest, NextResponse } from "next/server";

const PAYWALLED = ["nytimes.com", "wsj.com", "washingtonpost.com", "ft.com", "economist.com"];

function extractJsonLd(html: string): string | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items: any[] = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      for (const item of items) {
        const t = item["@type"];
        if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) {
          return formatJsonLdRecipe(item);
        }
      }
    } catch {}
  }
  return null;
}

function formatJsonLdRecipe(r: any): string {
  const lines: string[] = [];
  if (r.name) lines.push(`Recipe: ${r.name}`);
  if (r.description) lines.push(`Description: ${r.description}`);
  if (r.prepTime) lines.push(`Prep time: ${r.prepTime}`);
  if (r.cookTime) lines.push(`Cook time: ${r.cookTime}`);
  if (r.totalTime) lines.push(`Total time: ${r.totalTime}`);
  if (r.recipeYield) lines.push(`Servings: ${Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield}`);
  const ingredients: string[] = r.recipeIngredient || [];
  if (ingredients.length) {
    lines.push("\nIngredients:");
    ingredients.forEach((ing: string) => lines.push(`- ${ing}`));
  }
  const instructions: any[] = r.recipeInstructions || [];
  if (instructions.length) {
    lines.push("\nInstructions:");
    instructions.forEach((step: any, i: number) => {
      const text = typeof step === "string" ? step : (step.text || step.name || "");
      if (text) lines.push(`${i + 1}. ${text}`);
    });
  }
  return lines.join("\n");
}

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

const BROWSER_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

function isTikTok(hostname: string): boolean {
  return /(^|\.)tiktok\.com$/.test(hostname);
}

// TikTok recipes usually live in the video caption. We try several ways to read it,
// because TikTok answers server requests inconsistently (short links sometimes redirect
// to a sign-in or home page instead of the video):
//   1. resolve the link to /@user/video/<id> (redirects, then any video id in the page)
//   2. oEmbed (TikTok's public embed API) -> `title` is the caption
//   3. the embed page / video page HTML -> the caption inside its JSON ("desc")
// The longest caption found wins.
const VIDEO_ID_RE = /\/video\/(\d{8,})/;

function decodeJsonString(s: string): string {
  try { return JSON.parse(`"${s}"`); } catch { return s.replace(/\\n/g, "\n").replace(/\\u002F/gi, "/"); }
}

function captionFromHtml(html: string): string {
  let best = "";
  const patterns = [
    /"desc"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
    /"description"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
    /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const t = decodeJsonString(m[1]).replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
      if (t.length > best.length) best = t;
    }
  }
  return best;
}

async function getText(url: string): Promise<{ finalUrl: string; html: string } | null> {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(10000),
    });
    return { finalUrl: r.url, html: await r.text() };
  } catch { return null; }
}

async function importTikTok(url: string) {
  let videoUrl = url.split("?")[0];
  let videoId = videoUrl.match(VIDEO_ID_RE)?.[1] || "";
  let pageHtml = "";

  // 1. Resolve short links (/t/..., vm.tiktok.com/...) to the full video address.
  if (!videoId) {
    // Ask for the redirect without following it first: the Location header is the most reliable source.
    try {
      const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(10000) });
      const loc = r.headers.get("location") || "";
      const id = loc.match(VIDEO_ID_RE)?.[1];
      if (id) { videoId = id; videoUrl = loc.split("?")[0]; }
    } catch {}
  }
  if (!videoId) {
    const page = await getText(url);
    if (page) {
      pageHtml = page.html;
      const id = page.finalUrl.match(VIDEO_ID_RE)?.[1] || page.html.match(VIDEO_ID_RE)?.[1] || page.html.match(/"(?:itemId|videoId|aweme_id)"\s*:\s*"?(\d{8,})/)?.[1];
      if (id) {
        videoId = id;
        const full = page.finalUrl.match(/https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+/)?.[0] || page.html.match(/https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+/)?.[0];
        videoUrl = full || `https://www.tiktok.com/@_/video/${id}`;
      }
    }
  }

  let caption = "";
  let author = "";

  // 2. oEmbed
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`, {
      headers: { "User-Agent": BROWSER_UA, "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      caption = (data?.title || "").trim();
      author = data?.author_unique_id || data?.author_name || "";
    }
  } catch {}

  // 3. Page JSON, when oEmbed gave nothing useful
  const looksLikeRecipe = (t: string) => t.length >= 60 && /\d/.test(t);
  if (!looksLikeRecipe(caption) && videoId) {
    for (const u of [`https://www.tiktok.com/embed/v2/${videoId}`, videoUrl]) {
      const page = u === videoUrl && pageHtml ? { finalUrl: u, html: pageHtml } : await getText(u);
      if (!page) continue;
      const c = captionFromHtml(page.html);
      if (c.length > caption.length) caption = c;
      if (!author) author = page.html.match(/"uniqueId"\s*:\s*"([\w.-]+)"/)?.[1] || "";
      if (looksLikeRecipe(caption)) break;
    }
  }
  if (!author) author = videoUrl.match(/@([\w.-]+)\/video/)?.[1] || "";
  if (author === "_") author = "";

  console.log("[tiktok-import]", JSON.stringify({ input: url, videoId, videoUrl, captionLength: caption.length, hasDigits: /\d/.test(caption) }));

  if (!videoId && !caption) {
    return NextResponse.json({ error: "Couldn't open that TikTok. Make sure the video is public, then copy its link again." }, { status: 422 });
  }
  if (!looksLikeRecipe(caption)) {
    return NextResponse.json({
      error: "We couldn't find a recipe in this TikTok's caption. If the recipe is on screen in the video, take a screenshot and use Photograph a recipe card.",
      source: "tiktok",
    }, { status: 422 });
  }
  return NextResponse.json({
    source: "tiktok",
    author,
    videoUrl,
    text: `This is the caption of a TikTok recipe video${author ? ` by @${author}` : ""}. Captions often list ingredients inline, with emojis, abbreviations or hashtags.\n\nCaption:\n${caption}`,
  });
}

export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    url = body.url?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (isTikTok(hostname)) {
      try { return await importTikTok(url); }
      catch { return NextResponse.json({ error: "Couldn't reach TikTok just now. Try again in a moment." }, { status: 502 }); }
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  // Paywalled sites (NYT Cooking and friends) often still include the recipe as structured data,
  // especially gift links, so try first and only give up if the recipe really isn't there.
  let paywalled = false;
  try { const h = new URL(url).hostname.replace("www.", ""); paywalled = PAYWALLED.some(d => h.includes(d)); } catch {}
  const PAYWALL_MSG = "This site is behind a paywall, so we couldn't read the recipe. Take screenshots of the ingredients and steps and use Photograph a recipe card instead (up to 4 at once).";

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok && paywalled) return NextResponse.json({ error: PAYWALL_MSG }, { status: 422 });
    if (!res.ok) {
      return NextResponse.json({
        error: `Could not load this page (${res.status}). Try Serious Eats, Simply Recipes, or Epicurious.`
      }, { status: 422 });
    }

    const html = await res.text();

    // Try JSON-LD first — works on AllRecipes, Food Network, Epicurious, etc.
    const jsonLdText = extractJsonLd(html);
    if (jsonLdText && jsonLdText.length > 100) {
      return NextResponse.json({ text: jsonLdText });
    }

    // Paywalled page with no structured recipe: the visible text is mostly the paywall itself
    if (paywalled) return NextResponse.json({ error: PAYWALL_MSG }, { status: 422 });

    // Fall back to plain text
    const text = cleanHtml(html);
    if (text.length < 100) {
      return NextResponse.json({ error: "Could not extract recipe from this page." }, { status: 422 });
    }

    return NextResponse.json({ text: text.slice(0, 15000) });
  } catch (e: any) {
    const msg = e?.name === "TimeoutError"
      ? "The site took too long to respond. Try again or a different URL."
      : paywalled ? PAYWALL_MSG : "Could not reach this site. Try Serious Eats, Simply Recipes, or Food52.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
