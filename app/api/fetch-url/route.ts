import { NextRequest, NextResponse } from "next/server";

// Domains that are known to be paywalled or unsupported
const BLOCKED = ["nytimes.com", "cooking.nytimes.com", "wsj.com", "washingtonpost.com"];

function cleanHtml(html: string): string {
  // Remove scripts, styles, nav, footer, ads, comments
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")       // strip remaining tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, "\n\n")     // collapse whitespace
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

  // Check blocked domains
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (BLOCKED.some(d => hostname.includes(d))) {
      return NextResponse.json({
        error: "This site requires a subscription and can't be imported. Try AllRecipes, Food Network, Simply Recipes, or Serious Eats."
      }, { status: 422 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Dishwise/1.0; recipe-importer)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!res.ok) {
      return NextResponse.json({
        error: `Site returned ${res.status}. It may be unavailable or paywalled.`
      }, { status: 422 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({ error: "URL does not point to a webpage" }, { status: 422 });
    }

    const html = await res.text();
    const text = cleanHtml(html);

    if (text.length < 100) {
      return NextResponse.json({ error: "Could not extract content from this page" }, { status: 422 });
    }

    return NextResponse.json({ text: text.slice(0, 15000) });
  } catch (e: any) {
    const msg = e?.name === "TimeoutError"
      ? "The site took too long to respond. Try again or try a different URL."
      : "Could not reach this site. It may be unavailable or blocking imports.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
