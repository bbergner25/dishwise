import { Redis } from "@upstash/redis";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const CACHE_VERSION = "v1";

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, " ");
}

function normalize(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, " ");
}

async function getRecipe(slug: string) {
  const title = slugToTitle(slug);
  const key = `recipe-cache:${CACHE_VERSION}:${normalize(title)}`;
  try {
    const recipe = await redis.get<any>(key);
    return recipe || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const recipe = await getRecipe(params.slug);
  if (!recipe) return { title: "Recipe not found — Every Chef" };
  return {
    title: `${recipe.title} — Every Chef`,
    description: recipe.tagline,
    openGraph: {
      title: recipe.title,
      description: recipe.tagline,
      siteName: "Every Chef",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: recipe.title,
      description: recipe.tagline,
    },
  };
}

export default async function PublicRecipePage({ params }: { params: { slug: string } }) {
  const recipe = await getRecipe(params.slug);
  if (!recipe) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://everychef.app";

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#FDFAF5;font-family:'Outfit',sans-serif;color:#151210;}
        a{color:inherit;text-decoration:none;}

        .pr-nav{background:#1A1F2E;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;}
        .pr-wordmark{font-family:'Fraunces',serif;font-size:22px;font-weight:700;letter-spacing:-0.5px;}
        .pr-wordmark span:first-child{color:#FDFAF5;font-style:normal;}
        .pr-wordmark span:last-child{color:#F4A021;font-style:italic;}
        .pr-signin{background:#F4A021;color:#151210;border:none;border-radius:100px;padding:8px 18px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;}

        .pr-banner{background:#1A1F2E;padding:24px 24px 28px;position:relative;overflow:hidden;}
        .pr-banner::before{content:"";position:absolute;top:-60px;right:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(244,160,33,.07) 0%,transparent 70%);pointer-events:none;}
        .pr-eyebrow{font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#F4A021;margin-bottom:10px;font-weight:500;}
        .pr-title{font-family:'Fraunces',serif;font-size:clamp(24px,6vw,36px);font-weight:700;color:#FDFAF5;line-height:1.1;margin-bottom:10px;}
        .pr-tagline{font-size:14px;color:rgba(253,250,245,.65);line-height:1.55;margin-bottom:22px;font-weight:300;}
        .pr-divider{border:none;border-top:1px solid rgba(255,255,255,.1);margin-bottom:20px;}
        .pr-stats{display:grid;grid-template-columns:1fr 1fr 1fr;}
        .pr-stat{text-align:center;border-right:1px solid rgba(255,255,255,.1);padding:0 8px;}
        .pr-stat:last-child{border-right:none;}
        .pr-stat-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(253,250,245,.4);margin-bottom:5px;}
        .pr-stat-value{font-family:'Fraunces',serif;font-size:18px;font-weight:700;color:#FDFAF5;}

        .pr-body{max-width:720px;margin:0 auto;padding:32px 24px;}
        .pr-section-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#F4A021;font-weight:600;margin-bottom:16px;}
        .pr-group-label{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#151210;border-bottom:2px solid #F4A021;padding-bottom:6px;margin-bottom:12px;margin-top:20px;}
        .pr-group-label:first-of-type{margin-top:0;}
        .pr-ingredient{display:flex;align-items:flex-start;padding:10px 0;border-bottom:1px solid #EDE8E0;font-size:14px;gap:8px;}
        .pr-ingredient::before{content:"•";color:#F4A021;font-size:16px;flex-shrink:0;margin-top:-1px;}
        .pr-ingredient strong{font-weight:600;margin-right:3px;}
        .pr-steps{margin-top:32px;}
        .pr-step{display:flex;gap:16px;margin-bottom:20px;align-items:flex-start;}
        .pr-step-num{width:28px;height:28px;border-radius:50%;background:#1A1F2E;color:#FDFAF5;font-family:'Fraunces',serif;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
        .pr-step-text{font-size:14px;line-height:1.65;color:#2A2420;padding-top:4px;}

        .pr-cta{background:#1A1F2E;margin:0 24px 40px;border-radius:20px;padding:28px 24px;text-align:center;}
        .pr-cta-title{font-family:'Fraunces',serif;font-size:20px;color:#FDFAF5;margin-bottom:8px;}
        .pr-cta-title em{color:#F4A021;font-style:italic;}
        .pr-cta-sub{font-size:13px;color:rgba(253,250,245,.65);margin-bottom:20px;line-height:1.5;}
        .pr-cta-btn{display:inline-block;background:#F4A021;color:#151210;border-radius:100px;padding:13px 32px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;cursor:pointer;}

        .pr-footer{text-align:center;padding:20px 24px 40px;font-size:12px;color:#B8B0A8;}
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9,700;1,9,700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>

      {/* Nav */}
      <nav className="pr-nav">
        <a href={appUrl}>
          <div className="pr-wordmark">
            <span>every</span><span>chef</span>
          </div>
        </a>
        <a href={appUrl} className="pr-signin">Try Every Chef</a>
      </nav>

      {/* Banner */}
      <div className="pr-banner">
        <div className="pr-eyebrow">· Every Chef ·</div>
        <h1 className="pr-title">{recipe.title}</h1>
        <p className="pr-tagline">{recipe.tagline}</p>
        <hr className="pr-divider"/>
        <div className="pr-stats">
          <div className="pr-stat">
            <div className="pr-stat-label">Prep</div>
            <div className="pr-stat-value">{recipe.prep_time}</div>
          </div>
          <div className="pr-stat">
            <div className="pr-stat-label">Cook</div>
            <div className="pr-stat-value">{recipe.cook_time}</div>
          </div>
          <div className="pr-stat">
            <div className="pr-stat-label">Serves</div>
            <div className="pr-stat-value">{recipe.servings}</div>
          </div>
        </div>
      </div>

      {/* Recipe body */}
      <div className="pr-body">
        {/* Ingredients */}
        <div className="pr-section-label">Ingredients</div>
        {(recipe.ingredient_groups || []).map((group: any, gi: number) => (
          <div key={gi}>
            {group.label && <div className="pr-group-label">{group.label}</div>}
            {(group.items || []).map((item: any, ii: number) => (
              <div key={ii} className="pr-ingredient">
                <strong>{item.amount}</strong>{item.name}
              </div>
            ))}
          </div>
        ))}

        {/* Steps */}
        <div className="pr-steps">
          <div className="pr-section-label" style={{marginTop:32}}>Method</div>
          {(recipe.steps || []).map((step: string, i: number) => (
            <div key={i} className="pr-step">
              <div className="pr-step-num">{i + 1}</div>
              <div className="pr-step-text">{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="pr-cta">
        <div className="pr-cta-title">Like this recipe? <em>Save it.</em></div>
        <div className="pr-cta-sub">Every Chef generates recipes from across the internet, refined just for you. Free to try.</div>
        <a href={appUrl} className="pr-cta-btn">Open Every Chef →</a>
      </div>

      <div className="pr-footer">Generated by Every Chef · <a href={appUrl} style={{color:"#F4A021"}}>everychef.app</a></div>
    </>
  );
}
