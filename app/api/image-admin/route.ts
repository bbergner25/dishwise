import { auth } from "@clerk/nextjs/server";
// Private admin page for dish photos. Open in a browser:
//   /api/image-admin?secret=WARM_SECRET                         → status + links
//   /api/image-admin?secret=WARM_SECRET&action=test&dishes=Kung Pao Noodles|Cottage Pie|Fish Tacos
//   /api/image-admin?secret=WARM_SECRET&action=count             → how many dishes still need photos + est. cost
import { estimateTimes, TIME_KEY } from "../../../lib/times";
import { NextRequest, NextResponse } from "next/server";
import {
  redis, ensurePhoto, normalizeDish, spentCents, imagesEnabled,
  MONTHLY_BUDGET_CENTS, COST_TENTHS, IMAGE_MODEL,
  currentBatch, startBatch, pollBatch, failedDishes, BACKFILL_ON, BATCH_SIZE, PREVIEW_USERS,
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
// Re-estimate realistic times for recipes made before the realistic-times rule.
const TIME_FAILED = "recipe-time-failed:v1";
async function timesNeeded() {
  const all = await allDishes();
  const keys = Array.from(all.keys()).filter((k) => !all.get(k)?.total_time && (all.get(k)?.steps || []).length);
  const done = new Set<string>();
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const vals = await redis.mget<any[]>(...chunk.map(TIME_KEY));
    chunk.forEach((k, j) => vals[j] && done.add(k));
  }
  const failed = new Set(((await redis.smembers(TIME_FAILED)) || []) as string[]);
  const need = keys.filter((k) => !done.has(k) && !failed.has(k));
  return { all, need, total: keys.length, done: done.size, failed: failed.size };
}
async function fixTimes(budgetMs: number) {
  const t0 = Date.now();
  const { all, need } = await timesNeeded();
  let fixed = 0, errors: string[] = [];
  for (let i = 0; i < need.length && Date.now() - t0 < budgetMs; i += 6) {
    await Promise.all(need.slice(i, i + 6).map(async (k) => {
      try { await redis.set(TIME_KEY(k), await estimateTimes(all.get(k))); fixed++; }
      catch (e: any) { errors.push(`${k}: ${e.message}`); if (!/Anthropic (429|5\d\d)/.test(e.message)) await redis.sadd(TIME_FAILED, k); }
    }));
  }
  return { fixed, errors };
}

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
  if (cronOk) { const t0 = Date.now(); const photos = await pollAndContinue(); const left = 50000 - (Date.now() - t0); const times = left > 8000 ? await fixTimes(left - 8000) : null; return NextResponse.json({ photos, times }); } // daily Vercel cron keeps the backfill moving
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

  if (action === "times") {
    const run = sp.get("run") === "1" ? await fixTimes(35000) : null;
    const st = await timesNeeded();
    const going = !!run && st.need.length > 0 && run.fixed > 0;
    const body = `<h1>Realistic cook times</h1>
      <p class="muted">Recipes made before the realistic-times update get their prep, cook and total time re-estimated for a home cook. New recipes already include it.</p>
      <table><tr><td>Older recipes</td><td><strong>${st.total}</strong></td></tr>
      <tr><td>Re-estimated</td><td>${st.done}</td></tr>
      <tr><td>Still to do</td><td><strong>${st.need.length}</strong></td></tr>
      ${st.failed ? `<tr><td>Couldn't estimate</td><td>${st.failed}</td></tr>` : ""}</table>
      ${run ? `<p>${run.fixed} done just now.${going ? " Keep this page open, it continues automatically." : ""}</p>` : ""}
      ${run?.errors.length ? `<details><summary>Errors (${run.errors.length})</summary><pre style="white-space:pre-wrap">${esc(run.errors.slice(0, 20).join("\n"))}</pre></details>` : ""}
      ${st.need.length && !going ? `<p><a href="?secret=${secret}&action=times&run=1" style="display:inline-block;padding:12px 20px;border-radius:24px;background:#F4A021;color:#151210;font-weight:600;text-decoration:none">Re-estimate ${st.need.length} recipes (about $${(st.need.length * 0.006).toFixed(2)})</a></p>` : ""}
      ${!st.need.length ? "<p><strong>All done.</strong></p>" : ""}
      <p><a href="?secret=${secret}">← Back</a></p>`;
    return new NextResponse((await page("Cook times", body)).body, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...(going ? { Refresh: `2; url=?secret=${secret}&action=times&run=1` } : {}) },
    });
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

  if (action === "preview-on" || action === "preview-off") {
    const { userId } = await auth();
    if (!userId) return page("Sign in first", `<h1>Sign in first</h1><p>Sign in to everychef.app in this browser, then come back and tap the link again.</p><p><a href="/">Open Every Chef</a> · <a href="?secret=${secret}">← Back</a></p>`);
    if (action === "preview-on") await redis.sadd(PREVIEW_USERS, userId); else await redis.srem(PREVIEW_USERS, userId);
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
  let me: string | null = null;
  try { me = (await auth()).userId; } catch {}
  const mePreview = me ? !!(await redis.sismember(PREVIEW_USERS, me)) : false;
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
    <tr><td>Photos on your account</td><td>${!me ? `Not signed in here. <a href="/">Sign in to Every Chef</a> in this browser first.`
      : mePreview ? `<strong>Yes</strong>, on every device where you're signed in · <a href="?secret=${secret}&action=preview-off">Turn off</a>`
      : `No · <a href="?secret=${secret}&action=preview-on">Show photos on my account (all devices)</a>`}</td></tr>
    <tr><td>Model</td><td>${esc(IMAGE_MODEL)}</td></tr>
    <tr><td>Spent this month</td><td>$${(spent / 100).toFixed(2)} of $${(MONTHLY_BUDGET_CENTS / 100).toFixed(2)} cap</td></tr></table>
    <ul><li><a href="?secret=${secret}&action=test&dishes=${encodeURIComponent("Kung Pao Noodles|Cottage Pie|Fish Tacos")}">Make test photos: Kung Pao Noodles, Cottage Pie, Fish Tacos</a> (about 10¢, takes up to a minute)</li>
    <li><a href="?secret=${secret}&action=count">Count dishes that need photos + cost estimate</a></li>
    <li><a href="?secret=${secret}&action=times">Realistic cook times for older recipes</a></li></ul>`)).body, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...(running ? { Refresh: "60" } : {}) },
    });
}
