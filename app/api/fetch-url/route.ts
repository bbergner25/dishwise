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

// TikTok recipes usually live in the video caption. TikTok's public oEmbed endpoint
// (meant for embedding videos) returns the caption as `title`, with no API key.
// Short links (/t/..., vm.tiktok.com/...) are followed to the full /@user/video/ID address first.
async function importTikTok(url: string) {
  let videoUrl = url;
  if (!/\/video\/\d+/.test(videoUrl)) {
    try {
      const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(10000) });
      if (/\/video\/\d+/.test(r.url)) videoUrl = r.url;
      else {
        const html = await r.text();
        const m = html.match(/https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+/);
        if (m) videoUrl = m[0];
      }
    } catch {}
  }
  videoUrl = videoUrl.split("?")[0];

  const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`, {
    headers: { "User-Agent": BROWSER_UA, "Accept": "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Couldn't open that TikTok. Make sure the video is public, then copy its link again." }, { status: 422 });
  }
  const data = await res.json().catch(() => null);
  const caption: string = (data?.title || "").trim();
  const author: string = data?.author_unique_id || data?.author_name || "";
  // A caption with a real recipe has some length and some numbers (amounts, times, temps).
  if (caption.length < 60 || !/\d/.test(caption)) {
    return NextResponse.json({
      error: "This TikTok's caption doesn't include the recipe — it's probably only in the video. Tip: if the recipe is on screen, take a screenshot and use Photograph a recipe card.",
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
    if (PAYWALLED.some(d => hostname.includes(d))) {
      return NextResponse.json({
        error: "This site is paywalled and cannot be imported. Try AllRecipes, Serious Eats, Simply Recipes, Epicurious, or Food52."
      }, { status: 422 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

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

    // Fall back to plain text
    const text = cleanHtml(html);
    if (text.length < 100) {
      return NextResponse.json({ error: "Could not extract recipe from this page." }, { status: 422 });
    }

    return NextResponse.json({ text: text.slice(0, 15000) });
  } catch (e: any) {
    const msg = e?.name === "TimeoutError"
      ? "The site took too long to respond. Try again or a different URL."
      : "Could not reach this site. Try Serious Eats, Simply Recipes, or Food52.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
