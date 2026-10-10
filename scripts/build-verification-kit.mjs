#!/usr/bin/env node
/**
 * Builds the park verification kit: a phone-friendly checklist of every entry,
 * grouped by park, land, and attraction in walking order, with Found / Not
 * found / Changed controls, a photo checkbox, and a notes line per find.
 * Results stay in the browser and can be copied out as CSV for the
 * spreadsheet's Onsite Verification tab.
 *
 *   node scripts/build-verification-kit.mjs
 *
 * Writes to kit/ (ignored by git):
 *   kit/index.html      the whole kit as one standalone page, printable
 *   kit/artifact.html   the same page without the document wrapper
 *   kit/<parkId>.csv    one paper checklist per park
 *
 * Nothing in content/ is read by the app from here; this is a field tool.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entriesDir = join(root, "content", "entries");
const outDir = join(root, "kit");
const destinations = JSON.parse(readFileSync(join(root, "content", "destinations.json"), "utf8"));


/** The order you meet these parts of an attraction. Mirrors walkOrder in src/data/query.ts. */
const AREA_ORDER = ["Entrance", "Lobby", "Queue", "Loading", "Dock", "Ride", "Post-show", "Exit", "Walkway", "Outdoor Display", "Shop"];
const LOCATION_ORDER = ["Outdoor", "Queue", "Pre-show", "Ride", "Indoor"];
/** Where an entry with no area context slots in, by location type. */
const LOCATION_AREA = { Outdoor: "Entrance", Queue: "Queue", "Pre-show": "Lobby", Ride: "Ride", Indoor: "Lobby" };

const entries = readdirSync(entriesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(entriesDir, f), "utf8")));

const byPark = new Map();
for (const e of entries) {
  if (!byPark.has(e.parkId)) byPark.set(e.parkId, new Map());
  const lands = byPark.get(e.parkId);
  if (!lands.has(e.landId)) lands.set(e.landId, { name: e.display.landName, attractions: new Map() });
  const land = lands.get(e.landId);
  if (!land.attractions.has(e.attractionId)) land.attractions.set(e.attractionId, { name: e.display.attractionName, entries: [] });
  land.attractions.get(e.attractionId).entries.push(e);
}

function distance(a, b) {
  if (!a || !b) return 0.02;
  const dx = (a.latitude - b.latitude) * 111;
  const dy = (a.longitude - b.longitude) * 111 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dx, dy);
}
function centroid(list) {
  const pts = list.map((e) => e.coordinates).filter(Boolean);
  if (!pts.length) return null;
  return { latitude: pts.reduce((s, p) => s + p.latitude, 0) / pts.length, longitude: pts.reduce((s, p) => s + p.longitude, 0) / pts.length };
}
/** Nearest-neighbor walk through a list of items that carry a `point`. */
function walk(items, start) {
  const left = items.slice().sort((a, b) => a.name.localeCompare(b.name));
  const out = [];
  let here = start;
  while (left.length) {
    let best = 0;
    if (here) {
      let bestD = Infinity;
      left.forEach((it, i) => { const d = it.point ? distance(here, it.point) : 0.02; if (d < bestD) { bestD = d; best = i; } });
    }
    const [next] = left.splice(best, 1);
    out.push(next);
    here = next.point ?? here;
  }
  return out;
}
function orderEntries(list) {
  const area = (e) => AREA_ORDER.indexOf(e.areaContext ?? LOCATION_AREA[e.locationType]);
  return list.slice().sort((a, b) => {
    const ia = area(a), ib = area(b);
    if (ia !== ib) return ia - ib;
    // Scene order within the area, numbered finds first; the rest by location type, then title.
    const sa = a.sceneOrder ?? Infinity, sb = b.sceneOrder ?? Infinity;
    if (sa !== sb) return sa < sb ? -1 : 1;
    const la = LOCATION_ORDER.indexOf(a.locationType), lb = LOCATION_ORDER.indexOf(b.locationType);
    if (la !== lb) return la - lb;
    return a.display.entryTitle.localeCompare(b.display.entryTitle);
  });
}

const parks = [];
for (const d of destinations) {
  const lands = byPark.get(d.parkId);
  if (!lands) continue;
  // Lands in the order you walk them, from destinations.json; unlisted lands follow alphabetically.
  const order = d.landOrder ?? [];
  const landList = [...lands.entries()].map(([id, l]) => ({ id, name: l.name, attractions: l.attractions, point: centroid([...l.attractions.values()].flatMap((a) => a.entries)) }));
  landList.sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return a.name.localeCompare(b.name);
  });
  let here = null;
  const outLands = [];
  for (const land of landList) {
    const attractions = walk([...land.attractions.entries()].map(([id, a]) => ({ id, name: a.name, entries: orderEntries(a.entries), point: centroid(a.entries) })), here);
    here = attractions[attractions.length - 1].point ?? here;
    outLands.push({ id: land.id, name: land.name, attractions });
  }
  const label = d.region === "Florida" ? d.name : `${d.name} (${d.region})`;
  const countOf = (ls) => ls.reduce((s, l) => s + l.attractions.reduce((t, a) => t + a.entries.length, 0), 0);
  if (d.parkKey === "resorts") {
    // Each resort is its own trip, so each gets its own pick in the list,
    // grouped under the destination. The land heading would repeat the pick's
    // name, so those sections leave it out.
    parks.push({ id: d.parkId, name: label, group: true, sections: outLands.map((l) => ({ id: `${d.parkId}-${l.id}`, name: l.name, parkName: label, lands: [l], count: countOf([l]), solo: true })) });
  } else {
    parks.push({ id: d.parkId, name: label, sections: [{ id: d.parkId, name: label, parkName: label, lands: outLands, count: countOf(outLands) }] });
  }
}
const sections = parks.flatMap((p) => p.sections);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const csvCell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

const STATUS_CLASS = { Current: "st-current", Unverified: "st-unverified", Seasonal: "st-seasonal", Variable: "st-variable", Removed: "st-removed" };

function entryHtml(e, n) {
  const w = e.whereToLook ?? {};
  const rows = [
    ["Scene", w.scene], ["Spot", w.exactSpot], ["Face", w.orientation], ["Tip", e.bestTip],
    ["Viewing", e.viewing?.notes], ["Access", e.accessNotes],
  ].filter(([, v]) => v);
  return `<li class="e" id="e-${esc(e.id)}" data-id="${esc(e.id)}" data-src="${esc(e.sourceId ?? "")}" data-status="${esc(e.status)}" data-title="${esc(e.display.entryTitle)}" data-attraction="${esc(e.display.attractionName)}" data-land="${esc(e.display.landName)}">
<div class="e-head"><span class="n">${n}</span><h4>${esc(e.display.entryTitle)}</h4><span class="pill ${STATUS_CLASS[e.status] ?? ""}">${esc(e.status)}</span></div>
<p class="meta"><span class="src">${esc(e.sourceId ?? "no sheet id")}</span> · ${e.entryType === "FACT" ? "Hidden Surprise" : "Hidden Mickey"} · ${esc(e.difficulty)} · ${esc(e.confidence)}${e.areaContext ? " · " + esc(e.areaContext) : ""}</p>
<dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
<div class="ctl">
<div class="seg" role="group" aria-label="Outcome for ${esc(e.display.entryTitle)}">
<button type="button" class="o" data-v="found">Found</button><button type="button" class="o" data-v="missing">Not found</button><button type="button" class="o" data-v="changed">Changed</button></div>
<label class="ph"><input type="checkbox" id="p-${esc(e.id)}" class="photo"> Photo</label>
<input type="text" id="n-${esc(e.id)}" class="note" placeholder="Note" autocomplete="off" aria-label="Note for ${esc(e.display.entryTitle)}">
</div>
<p class="paper" aria-hidden="true">☐ Found &nbsp; ☐ Not found &nbsp; ☐ Changed &nbsp; ☐ Photo &nbsp; Note: ______________________________</p>
</li>`;
}

function parkHtml(p) {
  let n = 0;
  return `<section class="park" id="${esc(p.id)}" data-park="${esc(p.id)}" data-park-name="${esc(p.parkName)}" hidden>
${p.lands.map((l) => `${p.solo ? `<h2 class="land solo">${esc(l.name)}</h2>` : `<h2 class="land">${esc(l.name)}</h2>`}
${l.attractions.map((a) => `<article class="attr"><h3>${esc(a.name)} <small>${a.entries.length}</small></h3><ol class="list">${a.entries.map((e) => entryHtml(e, ++n)).join("\n")}</ol></article>`).join("\n")}`).join("\n")}
</section>`;
}

function optionsHtml() {
  return parks.map((p) => p.group
    ? `<optgroup label="${esc(p.name)}">${p.sections.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} (${s.count})</option>`).join("")}</optgroup>`
    : p.sections.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} (${s.count})</option>`).join("")).join("");
}

const built = new Date().toISOString().slice(0, 10);
const total = sections.reduce((s, p) => s + p.count, 0);

const style = `
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<style>
/* Layout: a sticky toolbar, then one park at a time as a long numbered walk. */
:root {
  --bg: #f4f6f9; --panel: #ffffff; --ink: #171a21; --muted: #5c6472; --line: #d8dde6;
  --accent: #c8102e; --accent-ink: #ffffff; --soft: #fbe9ec;
  --ok: #1f7a3f; --ok-soft: #e3f3e8; --warn: #9a6400; --warn-soft: #fff3d6; --bad: #8a1c1c; --bad-soft: #fde4e4; --info: #27548a; --info-soft: #e4edf8;
  --display: "Lilita One", "Arial Black", Impact, sans-serif;
  --body: "Nunito", "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #15181e; --panel: #1e222a; --ink: #eef0f4; --muted: #a3abb8; --line: #343a46;
  --accent: #ff5a6e; --accent-ink: #1a0b0e; --soft: #3a1f25;
  --ok: #6fd48f; --ok-soft: #1d3326; --warn: #ffcf66; --warn-soft: #3a3014; --bad: #ff8a8a; --bad-soft: #3d1c1c; --info: #8fb6ec; --info-soft: #1e2a3d; color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #15181e; --panel: #1e222a; --ink: #eef0f4; --muted: #a3abb8; --line: #343a46;
  --accent: #ff5a6e; --accent-ink: #1a0b0e; --soft: #3a1f25;
  --ok: #6fd48f; --ok-soft: #1d3326; --warn: #ffcf66; --warn-soft: #3a3014; --bad: #ff8a8a; --bad-soft: #3d1c1c; --info: #8fb6ec; --info-soft: #1e2a3d; color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 var(--body); }
.wrap { max-width: 760px; margin: 0 auto; padding-block: 0 48px; padding-inline: 16px; }
.bar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--panel); border-bottom: 1px solid var(--line); }
.bar .wrap { padding-block: 10px 8px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
.bar .wrap > * { min-width: 0; }
.title { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.title h1 { font: 26px/1 var(--display); margin: 0; letter-spacing: 0.01em; }
.title h1 b { color: var(--accent); font-weight: inherit; }
.title .sub { color: var(--muted); font-size: 13px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
select, .btn, .note { font: inherit; color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 7px 10px; min-height: 36px; }
select { flex: 1 1 200px; min-width: 0; max-width: 100%; }
.btn { cursor: pointer; }
.btn.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 700; }
.btn.danger { color: var(--bad); }
.filters { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; color: var(--muted); align-items: center; }
.filters label { display: inline-flex; gap: 6px; align-items: center; }
.progress { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; margin-left: auto; }
.progress b { color: var(--ink); }
.track { height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; }
.track i { display: block; height: 100%; width: 0; background: var(--ok); transition: width 0.2s; }
.land { font: 22px/1.1 var(--display); margin: 28px 0 6px; padding-top: 10px; border-top: 2px solid var(--accent); color: var(--ink); text-wrap: balance; }
.land.solo { margin-top: 16px; }
.attr h3 { font: 700 16px/1.3 var(--body); margin: 18px 0 8px; display: flex; gap: 8px; align-items: baseline; }
.attr h3 small { color: var(--muted); font-weight: 600; font-size: 12px; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.e { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px 12px; display: grid; gap: 6px; min-width: 0; }
.e[data-o="found"] { border-color: var(--ok); box-shadow: inset 4px 0 0 var(--ok); }
.e[data-o="missing"] { border-color: var(--bad); box-shadow: inset 4px 0 0 var(--bad); }
.e[data-o="changed"] { border-color: var(--warn); box-shadow: inset 4px 0 0 var(--warn); }
.e-head { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.e-head .n { font: 15px/1 var(--display); color: var(--accent); min-width: 2ch; font-variant-numeric: tabular-nums; }
.e-head h4 { margin: 0; font: 700 16px/1.3 var(--body); flex: 1 1 auto; min-width: 0; }
.pill { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: var(--info-soft); color: var(--info); white-space: nowrap; }
.st-current { background: var(--ok-soft); color: var(--ok); }
.st-unverified { background: var(--info-soft); color: var(--info); }
.st-seasonal, .st-variable { background: var(--warn-soft); color: var(--warn); }
.st-removed { background: var(--bad-soft); color: var(--bad); }
.meta { margin: 0; font-size: 12px; color: var(--muted); }
.meta .src { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
dl { margin: 0; display: grid; gap: 3px; }
dl div { display: grid; grid-template-columns: 58px 1fr; gap: 8px; }
dt { color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding-top: 2px; }
dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.ctl { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 4px; }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.seg .o { font: 600 13px var(--body); color: var(--ink); background: var(--panel); border: 0; border-right: 1px solid var(--line); padding: 7px 10px; min-height: 36px; cursor: pointer; }
.seg .o:last-child { border-right: 0; }
.seg .o[aria-pressed="true"][data-v="found"] { background: var(--ok); color: #fff; }
.seg .o[aria-pressed="true"][data-v="missing"] { background: var(--bad); color: #fff; }
.seg .o[aria-pressed="true"][data-v="changed"] { background: var(--warn); color: #fff; }
.ph { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; font-weight: 600; min-height: 36px; }
.ph input { width: 18px; height: 18px; accent-color: var(--accent); }
.note { flex: 1 1 140px; min-width: 0; }
.paper { display: none; }
.sheet { display: none; margin-top: 10px; }
.sheet.open { display: grid; gap: 6px; }
.sheet textarea { width: 100%; min-height: 120px; font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace; color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 8px; }
.toast { position: fixed; left: 50%; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); background: var(--ink); color: var(--bg); padding: 8px 14px; border-radius: 999px; font-size: 13px; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
.toast.show { opacity: 1; }
.confirm { display: none; gap: 8px; align-items: center; font-size: 13px; }
.confirm.open { display: flex; }
.empty { color: var(--muted); text-align: center; padding: 40px 0; }
.foot { color: var(--muted); font-size: 12px; margin-top: 32px; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .track i, .toast { transition: none; } }
@media print {
  .bar, .ctl, .sheet, .toast, .foot { display: none !important; }
  .paper { display: block; font-size: 11px; color: #000; margin: 4px 0 0; }
  body { background: #fff; color: #000; font-size: 11px; }
  .e { break-inside: avoid; border: 1px solid #999; box-shadow: none !important; padding: 6px 8px; }
  .list { gap: 4px; }
  .land { break-before: page; border-top-color: #000; }
  .land:first-of-type { break-before: auto; }
  .pill { border: 1px solid #000; background: none !important; color: #000 !important; }
  .park[hidden] { display: none; }
}
</style>`;

const body = `
<header class="bar"><div class="wrap">
  <div class="title"><h1>Three Little <b>Circles</b> Field Kit</h1><span class="sub">${total} finds · built ${built}</span></div>
  <div class="row">
    <select id="park" aria-label="Park or resort">${optionsHtml()}</select>
    <button type="button" class="btn primary" id="copy">Copy results</button>
    <button type="button" class="btn danger" id="reset">Reset park</button>
  </div>
  <div class="confirm" id="confirm"><span>Clear every result in this park?</span><button type="button" class="btn danger" id="reset-yes">Yes, clear</button><button type="button" class="btn" id="reset-no">Keep</button></div>
  <div class="filters">
    <label><input type="checkbox" id="hide-removed" checked> Hide removed</label>
    <label><input type="checkbox" id="only-open"> Only unchecked</label>
    <span class="progress"><b id="done">0</b> of <span id="shown">0</span> checked</span>
  </div>
  <div class="track"><i id="fill"></i></div>
  <div class="sheet" id="sheet"><textarea id="csv" readonly aria-label="Results as CSV"></textarea><span class="meta">Copied to the clipboard when that works. Otherwise select the text above. Paste into the Onsite Verification tab.</span></div>
</div></header>
<main class="wrap">
${sections.map(parkHtml).join("\n")}
<p class="empty" id="empty" hidden>Everything here is checked. Nice work.</p>
<p class="foot">Results live only in this browser. Copy them out before you clear site data or switch phones. Order is a walking order from the gate; within an attraction, entrance to exit.</p>
</main>
<div class="toast" id="toast" role="status"></div>
<script>
(function () {
  var KEY = "tlc-kit-v1";
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { state = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  var parkSel = document.getElementById("park");
  var hideRemoved = document.getElementById("hide-removed");
  var onlyOpen = document.getElementById("only-open");
  var toast = document.getElementById("toast"), toastT;
  function say(msg) { toast.textContent = msg; toast.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove("show"); }, 1800); }

  function paint(li) {
    var s = state[li.dataset.id] || {};
    if (s.o) li.dataset.o = s.o; else delete li.dataset.o;
    li.querySelectorAll(".o").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === s.o ? "true" : "false"); });
    li.querySelector(".photo").checked = !!s.p;
    var note = li.querySelector(".note"); if (note.value !== (s.n || "")) note.value = s.n || "";
  }
  function apply() {
    var id = parkSel.value;
    document.querySelectorAll(".park").forEach(function (sec) { sec.hidden = sec.dataset.park !== id; });
    var sec = document.getElementById(id);
    var shown = 0, done = 0;
    sec.querySelectorAll(".e").forEach(function (li) {
      var s = state[li.dataset.id] || {};
      var hide = (hideRemoved.checked && li.dataset.status === "Removed") || (onlyOpen.checked && s.o);
      li.hidden = hide;
      if (!hide) { shown++; if (s.o) done++; }
    });
    sec.querySelectorAll(".attr").forEach(function (a) { a.hidden = !a.querySelector(".e:not([hidden])"); });
    sec.querySelectorAll(".land").forEach(function (h) {
      var n = h.nextElementSibling, any = false;
      while (n && !n.classList.contains("land")) { if (n.classList.contains("attr") && !n.hidden) any = true; n = n.nextElementSibling; }
      h.hidden = !any;
    });
    document.getElementById("shown").textContent = shown;
    document.getElementById("done").textContent = done;
    document.getElementById("fill").style.width = shown ? (100 * done / shown) + "%" : "0";
    document.getElementById("empty").hidden = shown !== 0;
    try { localStorage.setItem(KEY + ":park", id); localStorage.setItem(KEY + ":f", (hideRemoved.checked ? "1" : "0") + (onlyOpen.checked ? "1" : "0")); } catch (e) {}
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  }

  document.querySelectorAll(".e").forEach(paint);
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest(".o"); if (!b) return;
    var li = b.closest(".e"), s = state[li.dataset.id] || (state[li.dataset.id] = {});
    if (s.o === b.dataset.v) delete s.o; else s.o = b.dataset.v;
    s.t = new Date().toISOString();
    if (!s.o && !s.p && !s.n) delete state[li.dataset.id];
    save(); paint(li);
    if (onlyOpen.checked) setTimeout(apply, 350); else apply();
  });
  document.addEventListener("change", function (ev) {
    if (ev.target.classList.contains("photo")) {
      var li = ev.target.closest(".e"), s = state[li.dataset.id] || (state[li.dataset.id] = {});
      s.p = ev.target.checked || undefined; s.t = new Date().toISOString();
      if (!s.o && !s.p && !s.n) delete state[li.dataset.id];
      save(); paint(li);
    }
  });
  document.addEventListener("input", function (ev) {
    if (ev.target.classList.contains("note")) {
      var li = ev.target.closest(".e"), s = state[li.dataset.id] || (state[li.dataset.id] = {});
      s.n = ev.target.value || undefined; s.t = new Date().toISOString();
      if (!s.o && !s.p && !s.n) delete state[li.dataset.id];
      save();
    }
  });
  parkSel.addEventListener("change", apply);
  hideRemoved.addEventListener("change", apply);
  onlyOpen.addEventListener("change", apply);

  var confirmBox = document.getElementById("confirm");
  document.getElementById("reset").addEventListener("click", function () { confirmBox.classList.add("open"); });
  document.getElementById("reset-no").addEventListener("click", function () { confirmBox.classList.remove("open"); });
  document.getElementById("reset-yes").addEventListener("click", function () {
    document.getElementById(parkSel.value).querySelectorAll(".e").forEach(function (li) { delete state[li.dataset.id]; paint(li); });
    save(); apply(); confirmBox.classList.remove("open"); say("Park results cleared");
  });

  var OUT = { found: "Found", missing: "Not found", changed: "Changed" };
  function csvCell(v) { v = v == null ? "" : String(v); return /[",\\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  document.getElementById("copy").addEventListener("click", function () {
    var rows = [["find_id", "entry_id", "park", "land", "attraction", "title", "app_status", "outcome", "photo_taken", "notes", "checked_at"]];
    document.querySelectorAll(".park").forEach(function (sec) {
      var park = sec.dataset.parkName;
      sec.querySelectorAll(".e").forEach(function (li) {
        var s = state[li.dataset.id]; if (!s || (!s.o && !s.p && !s.n)) return;
        rows.push([li.dataset.src, li.dataset.id, park, li.dataset.land, li.dataset.attraction, li.dataset.title, li.dataset.status, OUT[s.o] || "", s.p ? "yes" : "", s.n || "", s.t || ""]);
      });
    });
    var text = rows.map(function (r) { return r.map(csvCell).join(","); }).join("\\n");
    var sheet = document.getElementById("sheet"), ta = document.getElementById("csv");
    ta.value = text; sheet.classList.add("open");
    if (rows.length === 1) { say("No results yet"); return; }
    var n = rows.length - 1;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { say("Copied " + n + " result" + (n === 1 ? "" : "s")); }, function () { ta.focus(); ta.select(); say("Select the text to copy"); });
    } else { ta.focus(); ta.select(); say("Select the text to copy"); }
  });

  var first = location.hash.slice(1), remembered = null, flags = null;
  try { remembered = localStorage.getItem(KEY + ":park"); flags = localStorage.getItem(KEY + ":f"); } catch (e) {}
  if (first && document.getElementById(first) && document.getElementById(first).classList.contains("park")) parkSel.value = first;
  else if (remembered && parkSel.querySelector('option[value="' + remembered + '"]')) parkSel.value = remembered;
  if (flags && flags.length === 2) { hideRemoved.checked = flags[0] === "1"; onlyOpen.checked = flags[1] === "1"; }
  window.addEventListener("hashchange", function () { var h = location.hash.slice(1); if (parkSel.querySelector('option[value="' + h + '"]')) { parkSel.value = h; apply(); } });
  apply();
})();
</script>`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "artifact.html"), `<title>Three Little Circles Field Kit</title>${style}${body}\n`);
writeFileSync(join(outDir, "index.html"), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Three Little Circles Field Kit</title>${style}
</head>
<body>${body}
</body>
</html>
`);

for (const p of sections) {
  const rows = [["order", "find_id", "entry_id", "land", "attraction", "title", "status", "confidence", "scene", "exact_spot", "orientation", "tip", "access", "found", "photo", "notes"]];
  let n = 0;
  for (const l of p.lands) for (const a of l.attractions) for (const e of a.entries) {
    rows.push([++n, e.sourceId ?? "", e.id, l.name, a.name, e.display.entryTitle, e.status, e.confidence, e.whereToLook?.scene ?? "", e.whereToLook?.exactSpot ?? "", e.whereToLook?.orientation ?? "", e.bestTip ?? "", e.accessNotes ?? "", "", "", ""]);
  }
  writeFileSync(join(outDir, `${p.id}.csv`), rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
}

console.log(`Wrote kit/index.html, kit/artifact.html, and ${sections.length} CSV files for ${total} entries.`);
for (const p of parks) {
  if (p.group) console.log(`  ${p.name}: ${p.sections.length} resorts, ${p.sections.reduce((s, x) => s + x.count, 0)} finds`);
  else console.log(`  ${p.name}: ${p.sections[0].count} finds across ${p.sections[0].lands.length} lands`);
}
