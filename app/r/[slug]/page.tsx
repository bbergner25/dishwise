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
  try {
    // 1) share permalinks: /r/<title-slug>-<8 hex>. app/api/share/route.ts stores
    //    the snapshot under recipe-share:<that exact slug>.
    const shared = await redis.get<any>(`recipe-share:${slug}`);
    if (shared) return shared;

    // 2) legacy links: /r/<title-slug>  ->  dish cache
    const title = slugToTitle(slug);
    const key = `recipe-cache:${CACHE_VERSION}:${normalize(title)}`;
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

// Same ingredient split the app uses: amount + item on the left, prep notes on the right.
const AMT_WORDS=new Set("cup cups c tbsp tbs tbl tablespoon tablespoons tsp teaspoon teaspoons oz ounce ounces fl lb lbs pound pounds g gram grams kg ml milliliter milliliters l liter liters litre litres pinch pinches dash dashes clove cloves can cans jar jars package packages pkg pkgs bag bags box boxes stick sticks slice slices sprig sprigs bunch bunches head heads handful handfuls quart quarts qt pint pints pt gallon gallons inch inches piece pieces small medium large extra x and or to of heaping scant level about approx approximately few couple dozen".split(" "));
const UNI_FRAC: Record<string,string>={"½":"1/2","¼":"1/4","¾":"3/4","⅓":"1/3","⅔":"2/3","⅛":"1/8","⅜":"3/8","⅝":"5/8","⅞":"7/8"};
function normalizeAmount(s: string){
  if(!s)return s;
  let t=s.replace(/(\d)?([½¼¾⅓⅔⅛⅜⅝⅞])/g,(_m,d,f)=>(d?d+" ":"")+UNI_FRAC[f]);
  t=t.replace(/(\d)([a-zA-Z])/g,"$1 $2");
  return t.replace(/\s{2,}/g," ").trim();
}
function splitIng(ing: any){
  const amount=String(ing?.amount||"").trim(), name=String(ing?.name||"").trim();
  if(amount&&/^[\d\/½⅓⅔¼¾⅛⅜⅝⅞.\-–\s]+$/.test(amount)){
    const m=name.match(/^(cups?|tablespoons?|tbsps?|teaspoons?|tsps?|ounces?|oz|pounds?|lbs?|cloves?|cans?|sticks?|slices?|sprigs?|pinch(?:es)?|dash(?:es)?|grams?|g|ml)\b\.?\s+(?:of\s+)?/i);
    if(m){
      const u=m[1].toLowerCase();
      const short=/^tablespoons?$/.test(u)?"tbsp":/^teaspoons?$/.test(u)?"tsp":/^pounds?$/.test(u)?"lbs":/^ounces?$/.test(u)?"oz":m[1];
      return {amount:`${amount} ${short}`,name:name.slice(m[0].length)};
    }
  }
  if(!amount||amount.length<12)return {amount,name};
  const toks=amount.split(/\s+/);
  let cut=toks.length;
  for(let i=0;i<toks.length;i++){
    const w=toks[i].toLowerCase().replace(/[.,()]/g,"");
    if(/^[\d\/½⅓⅔¼¾⅛⅜⅝⅞.\-–~]+$/.test(w)||AMT_WORDS.has(w)||/^\d/.test(w))continue;
    cut=i;break;
  }
  if(cut===toks.length||cut===0)return {amount,name};
  const keep=toks.slice(0,cut).join(" ").replace(/\s+(and|or|of|to|x)$/i,"");
  const moved=toks.slice(cut).join(" ").replace(/,$/,"");
  const joiner=!name?"":/^[,(]/.test(name)?"":/^([a-z]+ed|cut|chopped|sliced|diced|minced|peeled|trimmed|halved|about|for|to|plus|divided|optional|at|from|cubed|grated|shredded)\b/i.test(name)?", ":" ";
  return {amount:keep,name:moved+joiner+name};
}
function ingParts(ing: any){
  const sp=splitIng(ing); const name=sp.name;
  let depth=0, cut=-1;
  for(let i=0;i<name.length;i++){const c=name[i];if(c==="(")depth++;else if(c===")")depth=Math.max(0,depth-1);else if(c===","&&depth===0){cut=i;break;}}
  return {amount:normalizeAmount(sp.amount),item:(cut<0?name:name.slice(0,cut)).trim(),prep:(cut<0?"":name.slice(cut+1)).trim()};
}
function renderAmount(s: string){
  const m=s.match(/^(\d+) (\d+\/\d+)(.*)$/);
  if(!m)return s;
  return <>{m[1]}<span style={{marginLeft:"0.34em"}}>{m[2]}</span>{m[3]}</>;
}

export default async function PublicRecipePage({ params }: { params: { slug: string } }) {
  const recipe = await getRecipe(params.slug);
  if (!recipe) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://everychef.app";
  const openUrl = `${appUrl}/?open=${encodeURIComponent(params.slug)}`;
  const eyebrow = recipe._author ? `From @${String(recipe._author).replace(/^@/,"")}` : "Shared recipe";
  let sourceHost = "";
  try { if (recipe._sourceUrl) sourceHost = new URL(recipe._sourceUrl).hostname.replace(/^www\./,""); } catch {}
  const meta = [["Prep",recipe.prep_time],["Cook",recipe.cook_time],["Serves",recipe.servings]].filter(([,v])=>v);

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#FDFAF5;font-family:'Figtree',sans-serif;color:#151210;-webkit-font-smoothing:antialiased;}
        a{color:inherit;text-decoration:none;}

        .pr-header{background:#1A1F2E;height:64px;display:flex;align-items:center;justify-content:center;position:sticky;top:0;z-index:20;}
        .pr-wordmark{font-family:'Fraunces',serif;font-size:26px;font-weight:700;letter-spacing:-0.5px;line-height:1;}
        .pr-wordmark span:first-child{color:#FDFAF5;}
        .pr-wordmark span:last-child{color:#F4A021;font-style:italic;margin-left:2px;}

        .pr-head{max-width:820px;margin:0 auto;padding:28px 20px 0;display:flex;flex-direction:column;gap:10px;}
        .pr-eyebrow{font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6E635F;}
        .pr-title{font-family:'Fraunces',serif;font-size:34px;line-height:1.06;font-weight:700;letter-spacing:-.6px;color:#151210;}
        @media(min-width:768px){.pr-title{font-size:44px;}}
        .pr-tagline{font-size:16px;line-height:1.5;color:#4F4744;max-width:620px;}
        .pr-meta{margin-top:8px;display:flex;align-items:center;background:#fff;border-radius:16px;padding:4px;box-shadow:0 1px 3px rgba(26,31,46,.08);max-width:520px;}
        .pr-meta-item{flex:1;padding:8px 14px;display:flex;flex-direction:column;gap:2px;min-width:0;}
        .pr-meta-label{font-size:12px;color:#6E635F;}
        .pr-meta-value{font-size:16px;font-weight:600;color:#151210;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .pr-meta-div{width:1px;height:32px;background:#ECE6DD;flex-shrink:0;}

        .pr-body{max-width:820px;margin:0 auto;padding:28px 20px 0;display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:48px;}
        @media(max-width:760px){.pr-body{grid-template-columns:1fr;gap:32px;}}
        .pr-section-label{font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#6E635F;font-weight:600;margin-bottom:6px;}
        .pr-group-label{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1E3A2F;padding:14px 0 2px;}
        .pr-ings{list-style:none;}
        .pr-ing{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:baseline;padding:11px 0;border-bottom:1px solid #ECE6DD;font-size:17px;line-height:1.4;}
        .pr-ing.no-prep{grid-template-columns:minmax(0,1fr);}
        .pr-ing:last-child{border-bottom:none;}
        .pr-ing-main{color:#151210;font-weight:500;}
        .pr-ing-amt{font-weight:700;margin-right:.3em;}
        .pr-ing-prep{color:#6E635F;}
        .pr-steps{list-style:none;}
        .pr-step{display:flex;gap:16px;margin-bottom:24px;align-items:flex-start;}
        .pr-step-num{width:30px;height:30px;border-radius:50%;background:#1A1F2E;color:#FDFAF5;font-family:'Fraunces',serif;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .pr-step-text{font-size:17px;line-height:1.6;color:#151210;padding-top:2px;}
        .pr-source{max-width:820px;margin:0 auto;padding:4px 20px 0;font-size:14px;color:#6E635F;}
        .pr-source a{color:#1E3A2F;text-decoration:underline;text-underline-offset:3px;}

        .pr-cta{max-width:780px;margin:32px auto 0;padding:0 20px;}
        .pr-cta-card{background:#fff;border:1px solid #ECE6DD;border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:6px;}
        .pr-cta-title{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:#151210;}
        .pr-cta-sub{font-size:15px;line-height:1.5;color:#4F4744;}
        .pr-footer{text-align:center;padding:24px 20px calc(120px + env(safe-area-inset-bottom,0px));font-size:13px;color:#9A8F88;}
        .pr-footer a{color:#1E3A2F;}

        .pr-actionbar{position:fixed;left:0;right:0;bottom:0;z-index:30;background:rgba(253,250,245,.96);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-top:1px solid #ECE6DD;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));}
        .pr-actionbar-inner{max-width:780px;margin:0 auto;display:flex;}
        .pr-open{flex:1;min-height:52px;border-radius:26px;background:#F4A021;color:#151210;font-size:17px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;}
        .pr-open:hover{background:#E8941A;}
        .pr-open:focus-visible{outline:3px solid #1A1F2E;outline-offset:2px;}
      `}</style>

      <header className="pr-header">
        <a href={appUrl} aria-label="Every Chef home">
          <div className="pr-wordmark"><span>every</span><span>chef</span></div>
        </a>
      </header>

      <main>
        <div className="pr-head">
          <div className="pr-eyebrow">{eyebrow}</div>
          <h1 className="pr-title">{recipe.title}</h1>
          {recipe.tagline && <p className="pr-tagline">{recipe.tagline}</p>}
          {meta.length > 0 && (
            <div className="pr-meta">
              {meta.map(([label, value], i) => (
                <div key={label} style={{display:"contents"}}>
                  {i > 0 && <span className="pr-meta-div" aria-hidden="true"/>}
                  <div className="pr-meta-item">
                    <span className="pr-meta-label">{label}</span>
                    <span className="pr-meta-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pr-body">
          <section aria-labelledby="pr-ing-h">
            <h2 id="pr-ing-h" className="pr-section-label">Ingredients</h2>
            {(recipe.ingredient_groups || []).map((group: any, gi: number) => (
              <div key={gi}>
                {group.label && <h3 className="pr-group-label">{group.label}</h3>}
                <ul className="pr-ings">
                  {(group.items || []).map((ing: any, ii: number) => {
                    const pt = ingParts(ing);
                    return (
                      <li key={ii} className={`pr-ing${pt.prep ? "" : " no-prep"}`}>
                        <span className="pr-ing-main">{pt.amount && <span className="pr-ing-amt">{renderAmount(pt.amount)}</span>}{pt.item}</span>
                        {pt.prep && <span className="pr-ing-prep">{pt.prep}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          <section aria-labelledby="pr-method-h">
            <h2 id="pr-method-h" className="pr-section-label" style={{marginBottom:16}}>Method</h2>
            <ol className="pr-steps">
              {(recipe.steps || []).map((step: string, i: number) => (
                <li key={i} className="pr-step">
                  <span className="pr-step-num" aria-hidden="true">{i + 1}</span>
                  <span className="pr-step-text">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {sourceHost && (
          <p className="pr-source">Original recipe: <a href={recipe._sourceUrl} target="_blank" rel="noopener noreferrer">{sourceHost}</a></p>
        )}

        <div className="pr-cta">
          <div className="pr-cta-card">
            <div className="pr-cta-title">Cook it with Every Chef</div>
            <p className="pr-cta-sub">Save this recipe, scale the servings, build a grocery list for your store, and follow it step by step with timers.</p>
          </div>
        </div>
      </main>

      <footer className="pr-footer">Shared from <a href={appUrl}>everychef.app</a></footer>

      <div className="pr-actionbar">
        <div className="pr-actionbar-inner">
          <a href={openUrl} className="pr-open">Open in Every Chef</a>
        </div>
      </div>
    </>
  );
}
