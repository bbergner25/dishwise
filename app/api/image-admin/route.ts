// Private admin page for dish photos. Open in a browser:
//   /api/image-admin?secret=WARM_SECRET                         → status + links
//   /api/image-admin?secret=WARM_SECRET&action=test&dishes=Kung Pao Noodles|Cottage Pie|Fish Tacos
//   /api/image-admin?secret=WARM_SECRET&action=count             → how many dishes still need photos + est. cost
import { NextRequest, NextResponse } from "next/server";
import {
  redis, ensurePhoto, normalizeDish, photoKey, spentCents, imagesEnabled,
  MONTHLY_BUDGET_CENTS, COST_TENTHS, IMAGE_MODEL,
} from "../../../lib/mealImage";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const page = (title: string, body: string) =>
  new NextResponse(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;padding:20px;background:#FDFAF5;font-family:system-ui,sans-serif;color:#151210;max-width:1100px}h1{font-size:24px}a{color:#1A1F2E}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}.card{background:#fff;border:1px solid #ECE6DD;border-radius:16px;padding:12px}
.card img{width:100%;border-radius:10px;display:block}.muted{color:#6E635F;font-size:14px}details{margin-top:8px;font-size:13px}pre{white-space:pre-wrap}
table{border-collapse:collapse}td{padding:4px 12px 4px 0}</style></head><body>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });

async function allDishes(): Promise<Map<string, any>> {
  const dishes = new Map<string, any>();
  const add = (r: any) => { const t = normalizeDish(r?.title || ""); if (t && !dishes.has(t)) dishes.set(t, r); };
  const cacheKeys = await redis.keys("recipe-cache:v1:*");
  for (let i = 0; i < cacheKeys.length; i += 100) {
    const vals = await redis.mget<any[]>(...cacheKeys.slice(i, i + 100));
    vals.forEach((v) => v && add(v));
  }
  const userKeys = await redis.keys("recipes:*");
  for (const k of userKeys) {
    const list = await redis.get<any[]>(k);
    (list || []).forEach(add);
  }
  return dishes;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (!process.env.WARM_SECRET || sp.get("secret") !== process.env.WARM_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = encodeURIComponent(sp.get("secret")!);
  const action = sp.get("action") || "status";

  if (action === "test") {
    const titles = (sp.get("dishes") || "Kung Pao Noodles|Cottage Pie|Fish Tacos").split("|").map((s) => s.trim()).filter(Boolean).slice(0, 4);
    const model = sp.get("model") || IMAGE_MODEL;
    const results: any[] = [];
    for (const t of titles) { // one at a time, to stay under per-minute limits
      const cached = await redis.get<any>(`recipe-cache:v1:${normalizeDish(t)}`);
      const r = await ensurePhoto(cached || { title: t }, { force: true, skipBudget: true, model });
      results.push({ t, fromRecipe: !!cached, ...r });
    }
    const lite = "gemini-3.1-flash-lite-image";
    return page("Dish photo test", `<h1>Dish photo test</h1><p class="muted">Model: ${esc(model)} · photos that worked are now saved as each dish's photo.</p>
      <p><a href="?secret=${secret}&action=test&dishes=${encodeURIComponent(titles.join("|"))}${model === lite ? "" : `&model=${lite}`}">Try again${model === lite ? "" : " with the Lite model"}</a></p><div class="grid">${
      results.map((r) => `<div class="card"><strong>${esc(r.t)}</strong>${r.url ? `<img src="${esc(r.url)}" alt="">` : `<pre style="color:#B8340F;font-size:12px">${esc(r.status)}: ${esc(r.error || "")}</pre>`}
      <p class="muted">${r.fromRecipe ? "Built from the saved recipe" : "No saved recipe found, built from the name only"}</p>
      ${r.prompt ? `<details><summary>Prompt used</summary><pre>${esc(r.prompt)}</pre></details>` : ""}</div>`).join("")
    }</div><p><a href="?secret=${secret}">← Back</a></p>`);
  }

  if (action === "count") {
    const dishes = await allDishes();
    const titles = Array.from(dishes.keys());
    const have = new Set<string>();
    for (let i = 0; i < titles.length; i += 100) {
      const vals = await redis.mget<any[]>(...titles.slice(i, i + 100).map((t) => `dish-photo:v1:${t}`));
      vals.forEach((v, j) => v?.url && have.add(titles[i + j]));
    }
    const need = titles.filter((t) => !have.has(t));
    const instant = (need.length * COST_TENTHS) / 1000, batch = instant / 2;
    return page("Dish photo count", `<h1>Dish photos: backfill estimate</h1>
      <table><tr><td>Unique dishes in the app</td><td><strong>${titles.length}</strong></td></tr>
      <tr><td>Already have a photo</td><td>${have.size}</td></tr>
      <tr><td>Still need a photo</td><td><strong>${need.length}</strong></td></tr>
      <tr><td>Estimated cost, batch (about half price)</td><td><strong>$${batch.toFixed(2)}</strong></td></tr>
      <tr><td>Estimated cost, instant</td><td>$${instant.toFixed(2)}</td></tr></table>
      <details><summary>Dishes that still need a photo</summary><pre>${esc(need.join("\n"))}</pre></details>
      <p><a href="?secret=${secret}">← Back</a></p>`);
  }

  const spent = await spentCents();
  return page("Dish photos", `<h1>Dish photos</h1>
    <table><tr><td>Photos switched on for everyone</td><td><strong>${imagesEnabled() ? "Yes" : "No (only this admin page makes photos)"}</strong></td></tr>
    <tr><td>Model</td><td>${esc(IMAGE_MODEL)}</td></tr>
    <tr><td>Spent this month</td><td>$${(spent / 100).toFixed(2)} of $${(MONTHLY_BUDGET_CENTS / 100).toFixed(2)} cap</td></tr></table>
    <ul><li><a href="?secret=${secret}&action=test&dishes=${encodeURIComponent("Kung Pao Noodles|Cottage Pie|Fish Tacos")}">Make test photos: Kung Pao Noodles, Cottage Pie, Fish Tacos</a> (about 10¢, takes up to a minute)</li>
    <li><a href="?secret=${secret}&action=count">Count dishes that need photos + cost estimate</a></li></ul>`);
}
