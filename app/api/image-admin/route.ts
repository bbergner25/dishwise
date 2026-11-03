import { auth } from "@clerk/nextjs/server";
// Private admin page for dish photos. Open in a browser:
//   /api/image-admin?secret=WARM_SECRET                         → status + links
//   /api/image-admin?secret=WARM_SECRET&action=test&dishes=Kung Pao Noodles|Cottage Pie|Fish Tacos
//   /api/image-admin?secret=WARM_SECRET&action=count             → how many dishes still need photos + est. cost
import { estimateTimes, TIME_KEY, totalRange } from "../../../lib/times";
import { buildPrompt } from "../../../lib/prompts";
import { RECIPE_SYSTEM } from "../../../lib/guard";
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
  const own = (r: any) => !!(r?._scanned || r?._imported || r?._edited || r?._author); // those keep their own times
  const keys = Array.from(all.keys()).filter((k) => !all.get(k)?.total_time && !own(all.get(k)) && (all.get(k)?.steps || []).length);
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

  if (action === "brands" || action === "brands-apply") {
    // One-time cleanup: Community and Trending titles with brand, store, restaurant or creator names get cookbook names.
    const PROPOSAL = "brand-cleanup:proposal";
    const norm = (t: string) => String(t || "").toLowerCase().trim().replace(/\s+/g, " ");
    type Rename = { key: string; old: string; title: string; oldTagline?: string; tagline?: string };
    if (action === "brands-apply") {
      const list = (await redis.get<Rename[]>(PROPOSAL)) || [];
      let done = 0;
      for (const r of list) {
        const rec = await redis.get<any>(`recipe-cache:v1:${r.key}`);
        if (!rec) continue;
        await redis.set(`recipe-cache:v1:${r.key}`, { ...rec, title: r.title, ...(r.tagline ? { tagline: r.tagline } : {}) });
        // keep the dish's photo and cook-time estimate under its new name
        for (const prefix of ["dish-photo:v1:", "recipe-time:v1:"]) {
          const old = await redis.get(prefix + norm(r.old));
          if (old && !(await redis.get(prefix + norm(r.title)))) await redis.set(prefix + norm(r.title), old);
        }
        done++;
      }
      const tr = await redis.get<any>("trending:current");
      if (tr?.dishes?.length) {
        const map = new Map(list.flatMap((r) => [[norm(r.old), r.title], [norm(r.key), r.title]] as [string, string][]));
        const seen = new Set<string>();
        const dishes = tr.dishes.map((d: string) => map.get(norm(d)) || d).filter((d: string) => !seen.has(norm(d)) && seen.add(norm(d)));
        await redis.set("trending:current", { ...tr, dishes });
      }
      await redis.del("community-index:v2", "community-list:v1", PROPOSAL);
      return page("Brand cleanup", `<h1>Done</h1><p>Renamed ${done} recipes. Trending and the Community search now use the new names, and duplicates of the same dish show once.</p><p><a href="?secret=${secret}">← Back</a></p>`);
    }
    // Preview: ask the cheap model which titles need a new name
    const keys = await redis.keys("recipe-cache:v1:*");
    const items: { key: string; title: string; tagline: string }[] = [];
    for (let i = 0; i < keys.length; i += 100) {
      const vals = await redis.mget<any[]>(...keys.slice(i, i + 100));
      vals.forEach((v, j) => { if (v?.title) items.push({ key: keys[i + j].slice("recipe-cache:v1:".length), title: String(v.title), tagline: String(v.tagline || "") }); });
    }
    const renames: Rename[] = [];
    let error = "";
    for (let i = 0; i < items.length; i += 120) {
      const chunk = items.slice(i, i + 120);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 4000, messages: [{ role: "user", content:
`These are recipe titles and taglines from a cooking app. Find the ones whose title or tagline uses a brand, store, restaurant, chain or creator name (e.g. Trader Joe's, Chick-fil-A, Olive Garden, Costco, Starbucks, Taco Bell, a TikTok creator) or hype words like "viral", "TikTok" or "famous".
For each one, give a cookbook-style title that names the dish itself (e.g. "Trader Joe's Dumpling Bake" -> "Frozen Dumpling Bake", "Copycat Chick-fil-A Sandwich" -> "Crispy Pickle-Brined Chicken Sandwich"), and a cleaned tagline if the tagline needs it. Leave everything else out. Generic words like "Cajun", "Buffalo", "Philly", "Caesar" or "Marry Me" aren't brands.
${chunk.map((x, n) => `${n}. ${x.title} | ${x.tagline}`).join("\n")}
Reply with ONLY valid JSON: {"renames":[{"i":0,"title":"...","tagline":"... or empty if fine"}]}` }] }),
        });
        const data = await res.json();
        if (!res.ok) { error = `${res.status}: ${JSON.stringify(data).slice(0, 300)}`; break; }
        const text = (data.content || []).map((c: any) => c.text || "").join("");
        const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
        for (const r of j.renames || []) {
          const it = chunk[r.i];
          if (!it || !r.title || norm(r.title) === norm(it.title) && !r.tagline) continue;
          renames.push({ key: it.key, old: it.title, title: String(r.title).slice(0, 120), oldTagline: it.tagline, tagline: r.tagline ? String(r.tagline).slice(0, 200) : undefined });
        }
      } catch (e: any) { error = String(e?.message || e); break; }
    }
    await redis.set(PROPOSAL, renames, { ex: 86400 });
    return page("Brand cleanup", `<h1>Brand names in recipe titles</h1>
      <p class="muted">Checked ${items.length} Community recipes. These would get cookbook-style names. Nothing changes until you tap Apply.</p>
      ${error ? `<pre style="color:#B8340F">${esc(error)}</pre>` : ""}
      ${renames.length ? `<table>${renames.map((r) => `<tr><td>${esc(r.old)}${r.tagline ? `<br><span class="muted">${esc(r.oldTagline || "")}</span>` : ""}</td><td>→</td><td><strong>${esc(r.title)}</strong>${r.tagline ? `<br><span class="muted">${esc(r.tagline)}</span>` : ""}</td></tr>`).join("")}</table>
        <p><a href="?secret=${secret}&action=brands-apply" style="display:inline-block;padding:12px 20px;border-radius:24px;background:#F4A021;color:#151210;font-weight:600;text-decoration:none">Apply ${renames.length} renames</a></p>` : error ? "" : "<p><strong>Nothing to rename.</strong></p>"}
      <p><a href="?secret=${secret}">← Back</a></p>`);
  }

  if (action === "taste") {
    // Blind taste test: the same dishes written by both models, shown as A and B in random order.
    const MODELS = [
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (current)", inPer: 3, outPer: 15 },
      { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", inPer: 0.10, outPer: 0.50 },
    ];
    const dishes = (sp.get("dishes") || "Chicken Tikka Masala|Lasagna Soup|Shakshuka|Lemon Bars|Beef Pho|Senate Bean Soup")
      .split("|").map((d) => d.trim()).filter(Boolean).slice(0, 6);
    if (sp.get("run") !== "1") {
      return page("Taste test", `<h1>Recipe taste test</h1>
        <p class="muted">Writes each dish with both models and shows them side by side as A and B, in random order, so you judge the recipe and not the name. Each dish has a reveal at the bottom. Costs about ${(dishes.length * 2.5).toFixed(0)}¢ in total and takes up to a minute.</p>
        <form method="get"><input type="hidden" name="secret" value="${esc(sp.get("secret") || "")}"><input type="hidden" name="action" value="taste"><input type="hidden" name="run" value="1">
          <p><label>Dishes, separated by | (up to 6)<br><input name="dishes" value="${esc(dishes.join("|"))}" style="width:min(640px,100%);font-size:16px;padding:10px;border:1px solid #DDD3C5;border-radius:10px"></label></p>
          <button style="font-size:16px;padding:12px 20px;border-radius:24px;border:none;background:#F4A021;font-weight:600">Run the taste test</button></form>
        <p><a href="?secret=${secret}">← Back</a></p>`);
    }
    const key = process.env.ANTHROPIC_API_KEY!;
    const write = async (dish: string, m: typeof MODELS[number]) => {
      const t0 = Date.now();
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: m.id, max_tokens: 2048, system: RECIPE_SYSTEM, messages: [{ role: "user", content: buildPrompt(dish, [], false, "") }] }),
          signal: AbortSignal.timeout(50000),
        });
        const data = await res.json();
        if (!res.ok) return { m, secs: (Date.now() - t0) / 1000, error: `${res.status}: ${JSON.stringify(data).slice(0, 300)}` };
        const text = (data.content || []).map((c: any) => c.text || "").join("");
        const cents = ((data.usage?.input_tokens || 0) * m.inPer + (data.usage?.output_tokens || 0) * m.outPer) / 1e6 * 100;
        let r: any = null;
        try { r = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch {}
        return { m, secs: (Date.now() - t0) / 1000, cents, r, error: r ? "" : "Didn't return a readable recipe" };
      } catch (e: any) { return { m, secs: (Date.now() - t0) / 1000, error: String(e?.message || e) }; }
    };
    const results = await Promise.all(dishes.map(async (d) => ({ d, out: await Promise.all(MODELS.map((m) => write(d, m))) })));
    const card = (label: string, o: any) => {
      const r = o.r;
      if (!r) return `<div class="card"><h3>${label}</h3><p style="color:#B8340F">${esc(o.error || "No recipe")}</p></div>`;
      const ings = (r.ingredient_groups || []).map((g: any) => `${g.label ? `<p style="margin:10px 0 4px;font-weight:600">${esc(g.label)}</p>` : ""}<ul style="margin:0;padding-left:18px">${(g.items || []).map((i: any) => `<li>${esc(`${i.amount || ""} ${i.name || ""}`.trim())}</li>`).join("")}</ul>`).join("");
      const steps = `<ol style="padding-left:20px">${(r.steps || []).map((x: string) => `<li style="margin-bottom:6px">${esc(x)}</li>`).join("")}</ol>`;
      const checks = [Array.isArray(r.step_ingredients) && r.step_ingredients.length === (r.steps || []).length ? "step ingredients ✓" : "step ingredients missing", r.total_time ? "total time ✓" : "no total time"].join(" · ");
      return `<div class="card"><h3 style="margin:4px 0">${label}: ${esc(r.title || "")}</h3><p class="muted">${esc(r.tagline || "")}</p>
        <p><strong>${esc(totalRange(r) || "")}</strong> <span class="muted">· prep ${esc(r.prep_time || "?")} · cook ${esc(r.cook_time || "?")} · serves ${esc(r.servings || "?")}</span></p>
        ${ings}<p style="margin:12px 0 4px;font-weight:600">Method</p>${steps}<p class="muted">${checks}</p></div>`;
    };
    const body = results.map(({ d, out }) => {
      const flip = Math.random() < 0.5;
      const [a, b] = flip ? [out[1], out[0]] : [out[0], out[1]];
      return `<h2 style="margin-top:34px">${esc(d)}</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">${card("A", a)}${card("B", b)}</div>
        <details><summary style="font-size:15px;cursor:pointer">Reveal which is which</summary><p>A was <strong>${esc(a.m.name)}</strong> (${a.secs.toFixed(0)} sec, ${a.cents != null ? a.cents.toFixed(2) + "¢" : "n/a"}) · B was <strong>${esc(b.m.name)}</strong> (${b.secs.toFixed(0)} sec, ${b.cents != null ? b.cents.toFixed(2) + "¢" : "n/a"})</p></details>`;
    }).join("");
    const tot = (id: string) => results.reduce((n, x) => n + (x.out.find((o: any) => o.m.id === id)?.cents || 0), 0);
    return page("Taste test", `<h1>Recipe taste test</h1><p class="muted">Read A and B for each dish as a cook would: does it make sense, would it taste good, is anything missing? Then open the reveal.</p>${body}
      <h2 style="margin-top:34px">Cost of this run</h2><p>Sonnet: ${tot("claude-sonnet-4-6").toFixed(2)}¢ · Haiku: ${tot("claude-haiku-5-5").toFixed(2)}¢</p>
      <p><a href="?secret=${secret}&action=taste">Try other dishes</a> · <a href="?secret=${secret}">← Back</a></p>`);
  }

  if (action === "reports" || action === "report-remove" || action === "report-dismiss") {
    let msg = "";
    const all = (await redis.hgetall<Record<string, any>>("reports:v1")) || {};
    const list = Object.values(all).map((v: any) => (typeof v === "string" ? JSON.parse(v) : v)).sort((a: any, b: any) => (a.at < b.at ? 1 : -1));
    const id = sp.get("id") || "";
    const rep = list.find((r: any) => r.id === id);
    if (rep && action === "report-remove") {
      const norm = (t: string) => t.toLowerCase().trim().replace(/\s+/g, " ");
      if (rep.kind === "community") await redis.del(`recipe-cache:v1:${norm(rep.target)}`, "community-index:v2", "community-list:v1");
      else await redis.del(`recipe-share:${rep.target}`, `recipe-share-token:${rep.target}`, `recipe-share-redirect:${rep.target}`);
      const same = list.filter((r: any) => r.kind === rep.kind && r.target === rep.target).map((r: any) => r.id);
      if (same.length) await redis.hdel("reports:v1", ...same);
      msg = `Removed "${rep.title || rep.target}".`;
    } else if (rep && action === "report-dismiss") {
      await redis.hdel("reports:v1", id);
      msg = "Dismissed.";
    }
    const open = action === "reports" ? list : list.filter((r: any) => !(rep && (r.id === id || (action === "report-remove" && r.kind === rep.kind && r.target === rep.target))));
    const body = `<h1>Reported recipes</h1>
      <p class="muted">People can report Community recipes and shared links. Remove takes the recipe down for everyone; Dismiss keeps it.</p>
      ${msg ? `<p><strong>${esc(msg)}</strong></p>` : ""}
      ${open.length ? `<table>${open.map((r: any) => `<tr><td><strong>${esc(r.title || r.target)}</strong><br><span class="muted">${r.kind === "share" ? `Shared link · <a href="/r/${esc(r.target)}" target="_blank">open</a>` : "Community recipe"} · ${esc(new Date(r.at).toLocaleString("en-US", { timeZone: "America/Chicago" }))}</span></td>
        <td>${esc(r.reason)}${r.note ? `<br><span class="muted">${esc(r.note)}</span>` : ""}</td>
        <td><a href="?secret=${secret}&action=report-remove&id=${esc(r.id)}">Remove</a> · <a href="?secret=${secret}&action=report-dismiss&id=${esc(r.id)}">Dismiss</a></td></tr>`).join("")}</table>` : "<p>No reports. Nice.</p>"}
      <p><a href="?secret=${secret}">← Back</a></p>`;
    return page("Reported recipes", body);
  }

  if (action === "links" || action === "redirect") {
    const slugOf = (v: string | null) => (v || "").trim().replace(/[?#].*$/, "").split("/").filter(Boolean).pop() || "";
    let msg = "";
    if (action === "redirect") {
      const from = slugOf(sp.get("from")), to = slugOf(sp.get("to"));
      if (sp.get("undo") === "1" && from) { await redis.del(`recipe-share-redirect:${from}`); msg = `Removed the redirect for ${from}.`; }
      else if (!from || !to || from === to) msg = "Pick an old link and the link it should open instead.";
      else if (!(await redis.get(`recipe-share:${to}`))) msg = `Couldn't find the link ${to}.`;
      else { await redis.set(`recipe-share-redirect:${from}`, to); msg = `Done. ${from} now opens ${to}.`; }
    }
    const q = (sp.get("q") || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let rows: { slug: string; title: string; current: boolean; to: string | null }[] = [];
    if (q) {
      const keys = (await redis.keys(`recipe-share:*${q}*`)).slice(0, 60);
      const slugs = keys.map((k) => k.slice("recipe-share:".length));
      if (slugs.length) {
        const recs = await redis.mget<any[]>(...keys);
        const toks = await redis.mget<(string | null)[]>(...slugs.map((s) => `recipe-share-token:${s}`));
        const reds = await redis.mget<(string | null)[]>(...slugs.map((s) => `recipe-share-redirect:${s}`));
        rows = slugs.map((s, i) => ({ slug: s, title: String(recs[i]?.title || s), current: !!toks[i], to: reds[i] }));
      }
    }
    const currents = rows.filter((r) => r.current);
    const body = `<h1>Shared links</h1>
      <p class="muted">Links made before Oct 27 are snapshots that never update. Point an old one at a current link and anyone who opens it lands on the current recipe.</p>
      ${msg ? `<p><strong>${esc(msg)}</strong></p>` : ""}
      <form method="get"><input type="hidden" name="secret" value="${esc(sp.get("secret") || "")}"><input type="hidden" name="action" value="links">
        <input name="q" value="${esc(sp.get("q") || "")}" placeholder="Dish name, e.g. lasagna soup" style="font-size:16px;padding:10px 12px;border:1px solid #DDD3C5;border-radius:10px;width:min(320px,100%)">
        <button style="font-size:16px;padding:10px 16px;border-radius:10px;border:none;background:#F4A021;font-weight:600">Find links</button></form>
      ${q && !rows.length ? "<p>No shared links found for that name.</p>" : ""}
      ${rows.length ? `<table>${rows.map((r) => `<tr><td><a href="/r/${esc(r.slug)}" target="_blank">${esc(r.title)}</a><br><span class="muted">${esc(r.slug)}</span></td><td>${
        r.current ? "<strong>Current link</strong> (updates with edits)"
        : r.to ? `Opens <a href="/r/${esc(r.to)}" target="_blank">${esc(r.to)}</a> · <a href="?secret=${secret}&action=redirect&undo=1&from=${encodeURIComponent(r.slug)}&q=${encodeURIComponent(sp.get("q") || "")}">Undo</a>`
        : currents.length ? `<form method="get" style="display:flex;gap:6px;flex-wrap:wrap"><input type="hidden" name="secret" value="${esc(sp.get("secret") || "")}"><input type="hidden" name="action" value="redirect"><input type="hidden" name="q" value="${esc(sp.get("q") || "")}"><input type="hidden" name="from" value="${esc(r.slug)}">
            <select name="to" style="font-size:15px;padding:6px">${currents.map((c) => `<option value="${esc(c.slug)}">${esc(c.slug)}</option>`).join("")}</select>
            <button style="font-size:15px;padding:6px 12px;border-radius:8px;border:1px solid #1A1F2E;background:#fff">Point here</button></form>`
        : `<span class="muted">Old snapshot. Share the recipe again from the app to get a current link, then come back.</span>`
      }</td></tr>`).join("")}</table>` : ""}
      <p><a href="?secret=${secret}">← Back</a></p>`;
    return page("Shared links", body);
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
  const reportCount = await redis.hlen("reports:v1").catch(() => 0);
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
    <li><a href="?secret=${secret}&action=times">Realistic cook times for older recipes</a></li>
    <li><a href="?secret=${secret}&action=brands">Brand names in Community titles: check and clean up</a></li>
    <li><a href="?secret=${secret}&action=taste">Recipe taste test: Sonnet vs Haiku</a></li>
    <li><a href="?secret=${secret}&action=reports">Reported recipes${reportCount ? ` (${reportCount} waiting)` : ""}</a></li>
    <li><a href="?secret=${secret}&action=links">Shared links: point an old link at the current one</a></li></ul>`)).body, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...(running ? { Refresh: "60" } : {}) },
    });
}
