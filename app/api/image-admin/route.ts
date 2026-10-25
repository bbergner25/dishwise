// Private admin page for dish photos. Open in a browser:
//   /api/image-admin?secret=WARM_SECRET                         → status + links
//   /api/image-admin?secret=WARM_SECRET&action=test&dishes=Kung Pao Noodles|Cottage Pie|Fish Tacos
//   /api/image-admin?secret=WARM_SECRET&action=count             → how many dishes still need photos + est. cost
import { NextRequest, NextResponse } from "next/server";
import {
  redis, ensurePhoto, normalizeDish, spentCents, imagesEnabled,
  MONTHLY_BUDGET_CENTS, COST_TENTHS, IMAGE_MODEL,
  currentBatch, startBatch, pollBatch, failedDishes, BACKFILL_ON, BATCH_SIZE,
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

// Dishes that still need a photo (skipping ones that failed before), as title → recipe.
async function needPhotos(): Promise<{ all: number; have: number; need: Map<string, any> }> {
  const dishes = await allDishes();
  const titles = Array.from(dishes.keys());
  const failed = new Set(await failedDishes());
  const need = new Map<string, any>();
  let have = 0;
  for (let i = 0; i < titles.length; i += 100) {
    const chunk = titles.slice(i, i + 100);
    const vals = await redis.mget<any[]>(...chunk.map((t) => `dish-photo:v1:${t}`));
    vals.forEach((v, j) => { if (v?.url) have++; else if (!failed.has(chunk[j])) need.set(chunk[j], dishes.get(chunk[j])); });
  }
  return { all: titles.length, have, need };
}

// Poll the running batch; when it finishes and the backfill is on, start the next one.
async function pollAndContinue() {
  const r = await pollBatch();
  let next: { started: number; error?: string } | null = null;
  if (!(await currentBatch()) && (await redis.get(BACKFILL_ON))) {
    const { need } = await needPhotos();
    if (need.size) next = await startBatch(need);
    else await redis.del(BACKFILL_ON);
  }
  return { ...r, next };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cronOk = !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (cronOk) return NextResponse.json(await pollAndContinue()); // daily Vercel cron keeps the backfill moving
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
    const { all, have, need } = await needPhotos();
    const instant = (need.size * COST_TENTHS) / 1000, batch = instant / 2;
    return page("Dish photo count", `<h1>Dish photos: backfill estimate</h1>
      <table><tr><td>Unique dishes in the app</td><td><strong>${all}</strong></td></tr>
      <tr><td>Already have a photo</td><td>${have}</td></tr>
      <tr><td>Still need a photo</td><td><strong>${need.size}</strong></td></tr>
      <tr><td>Estimated cost, batch (about half price)</td><td><strong>$${batch.toFixed(2)}</strong></td></tr>
      <tr><td>Estimated cost, instant</td><td>$${instant.toFixed(2)}</td></tr></table>
      ${need.size ? `<p><a href="?secret=${secret}&action=batch-start&confirm=1" style="display:inline-block;padding:12px 20px;border-radius:24px;background:#F4A021;color:#151210;font-weight:600;text-decoration:none">Approve backfill: ${need.size} photos, about $${batch.toFixed(2)}</a></p>
      <p class="muted">Runs in groups of ${BATCH_SIZE}. Each group takes up to a day (usually much less). Leave the status page open to speed it along; a daily check also keeps it going.</p>` : ""}
      <details><summary>Dishes that still need a photo</summary><pre>${esc(Array.from(need.keys()).join("\n"))}</pre></details>
      <p><a href="?secret=${secret}">← Back</a></p>`);
  }

  if (action === "batch-start" && sp.get("confirm") === "1") {
    await redis.set(BACKFILL_ON, "1");
    if (!(await currentBatch())) {
      const { need } = await needPhotos();
      const r = await startBatch(need);
      if (r.error) return page("Backfill", `<h1>Couldn't start the backfill</h1><pre style="color:#B8340F">${esc(r.error)}</pre><p><a href="?secret=${secret}">← Back</a></p>`);
    }
    return NextResponse.redirect(new URL(`/api/image-admin?secret=${secret}`, req.url));
  }

  if (action === "batch-stop") {
    await redis.del(BACKFILL_ON);
    return NextResponse.redirect(new URL(`/api/image-admin?secret=${secret}`, req.url));
  }

  const poll = (await currentBatch()) || (await redis.get(BACKFILL_ON)) ? await pollAndContinue() : null;
  const running = await currentBatch();
  const backfillOn = !!(await redis.get(BACKFILL_ON));
  const nextErr = poll?.next?.error || "";
  const outOfCredit = / 402|prepayment credits/i.test(nextErr);
  const spent = await spentCents();
  const batchHtml = running
    ? `<div style="padding:14px 16px;background:#FFF6E6;border:1px solid #F1D9A8;border-radius:14px;margin:12px 0"><strong>Backfill running</strong> · current group of ${running.keys.length} started ${esc(new Date(running.startedAt).toLocaleString("en-US",{timeZone:"America/Chicago"}))} (Central)<br>
       <span class="muted">Google status: ${esc(poll?.state || "checking")}${poll?.saved ? ` · ${poll.saved} photos saved just now` : ""}. This page checks again every minute while it's open.</span>
       ${backfillOn ? `<br><a href="?secret=${secret}&action=batch-stop">Stop after this group</a>` : ""}</div>`
    : backfillOn && nextErr ? `<div style="padding:14px 16px;background:#FDECE6;border:1px solid #F0C2B2;border-radius:14px;margin:12px 0"><strong>Backfill paused</strong> · ${outOfCredit
        ? "Google says your prepaid Gemini credit has run out. Add credit in Google AI Studio (Billing), then tap Resume."
        : "Google couldn't start the next group."}<br>
       <a href="?secret=${secret}">Resume</a> · <a href="?secret=${secret}&action=batch-stop">Stop backfill</a>
       <details><summary class="muted">Details</summary><pre style="color:#B8340F;white-space:pre-wrap">${esc(nextErr)}</pre></details></div>`
    : nextErr ? `<pre style="color:#B8340F;white-space:pre-wrap">${esc(nextErr)}</pre>`
    : "";
  return new NextResponse((await page("Dish photos", `<h1>Dish photos</h1>${batchHtml}
    <table><tr><td>Photos switched on for everyone</td><td><strong>${imagesEnabled() ? "Yes" : "No (only this admin page makes photos)"}</strong></td></tr>
    <tr><td>Model</td><td>${esc(IMAGE_MODEL)}</td></tr>
    <tr><td>Spent this month</td><td>$${(spent / 100).toFixed(2)} of $${(MONTHLY_BUDGET_CENTS / 100).toFixed(2)} cap</td></tr></table>
    <ul><li><a href="?secret=${secret}&action=test&dishes=${encodeURIComponent("Kung Pao Noodles|Cottage Pie|Fish Tacos")}">Make test photos: Kung Pao Noodles, Cottage Pie, Fish Tacos</a> (about 10¢, takes up to a minute)</li>
    <li><a href="?secret=${secret}&action=count">Count dishes that need photos + cost estimate</a></li></ul>`)).body, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...(running ? { Refresh: "60" } : {}) },
    });
}
