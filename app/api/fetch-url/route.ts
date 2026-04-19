import { NextRequest, NextResponse } from "next/server";

// Only hard-block true paywalls
const PAYWALLED = ["nytimes.com", "wsj.com", "washingtonpost.com", "ft.com", "economist.com"];

// Extract structured recipe data from JSON-LD (used by AllRecipes, Food Network, Epicurious, etc.)
function extractJsonLd(html: string): string | null {
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      for (const item of items) {
        if (item["@type"] === "Recipe" || (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))) {
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

  const ingredients = r.recipeIngredient || [];
  if (ingredients.length) {
    lines.push("\nIngredients:");
    ingredients.forEach((ing: string) => lines.push(`- ${ing}`));
  }

  const instructions = r.recipeInstructions || [];
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
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return NextResponse.json({
        error: `Could not load this page (${res.status}). Try a different recipe site like Serious Eats, Simply Recipes, or Epicurious.`
      }, { status: 422 });
    }

    const html = await res.text();

    // Try JSON-LD first — most reliable, works on AllRecipes, Food Network, Epicurious, etc.
    const jsonLdText = extractJsonLd(html);
    if (jsonLdText && jsonLdText.length > 100) {
      return NextResponse.json({ text: jsonLdText });
    }

    // Fall back to plain text extraction
    const text = cleanHtml(html);
    if (text.length < 100) {
      return NextResponse.json({ error: "Could not extract recipe from this page. Try copying the URL directly from the recipe page." }, { status: 422 });
    }

    return NextResponse.json({ text: text.slice(0, 15000) });
  } catch (e: any) {
    const msg = e?.name === "TimeoutError"
      ? "The site took too long to respond. Try again or try a different URL."
      : "Could not reach this site. Try Serious Eats, Simply Recipes, or Food52.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
