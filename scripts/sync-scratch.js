#!/usr/bin/env node
/* ==========================================================================
   scripts/sync-scratch.js — pulls your projects from Scratch
   --------------------------------------------------------------------------
   Why this exists: Scratch's API only lets scratch.mit.edu itself read its
   data from a web page (CORS), so the site can't fetch your projects live.
   This script fetches them outside the browser and saves them as
   site/scratch-data.js, which the site loads like any other file.

   Run it:  node scripts/sync-scratch.js
   Needs:   Node.js 18 or newer (uses the built-in fetch). No packages.

   On GitHub it runs nightly via .github/workflows/deploy.yml. Settings are
   in scratch.config.js.

   Safety: if anything goes wrong (Scratch down, typo in a studio ID), the
   script exits with an error and leaves the existing data untouched, so the
   site keeps showing the last good copy.
   ========================================================================== */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const config = require(path.join(ROOT, "scratch.config.js"));

const API = "https://api.scratch.mit.edu";
const PAGE_SIZE = 40;    // the most Scratch returns per request
const DELAY_MS = 200;    // pause between requests, well inside Scratch's rate limit
const OUTPUT = path.join(ROOT, config.output || "site/scratch-data.js");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


/* ---- Fetching --------------------------------------------------------- */

// GET a URL as JSON, retrying a few times if Scratch is busy or briefly down
async function getJSON(url, attempt = 1) {
  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "scratch-portfolio-sync" }
    });
  } catch (err) {
    if (attempt < 4) { await sleep(1000 * attempt * attempt); return getJSON(url, attempt + 1); }
    throw new Error(`Couldn't reach ${url} (${err.message})`);
  }

  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await sleep(1000 * attempt * attempt);
    return getJSON(url, attempt + 1);
  }
  if (res.status === 404) throw new Error(`Not found: ${url}. Check the username / studio ID.`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}`);
  return res.json();
}

// Scratch returns lists in pages of up to 40, so keep asking until a short page
async function getAllPages(url) {
  const all = [];
  for (let offset = 0; offset < 10000; offset += PAGE_SIZE) {
    const sep = url.includes("?") ? "&" : "?";
    const page = await getJSON(`${url}${sep}limit=${PAGE_SIZE}&offset=${offset}`);
    if (!Array.isArray(page)) throw new Error(`Expected a list from ${url}`);
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    await sleep(DELAY_MS);
  }
  return all;
}


/* ---- Shaping the data ------------------------------------------------- */

// Trim long text and collapse big gaps
function tidy(text, max = 400) {
  const t = String(text || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

// Keep only what the site needs. Scratch's field layout has varied between
// endpoints, so each value checks the nested form first, then the flat one.
function normalise(p) {
  return {
    title: String(p.title || "Untitled").trim(),
    instructions: tidy(p.instructions),
    notes: tidy(p.description),                       // "Notes and Credits" on Scratch
    thumbnail: p.image || "",
    author: (p.author && p.author.username) || p.username || "",
    shared: (p.history && p.history.shared) || p.shared || null,
    _loves: (p.stats && p.stats.loves) || p.loves || 0  // used for sorting, not saved
  };
}

const byNewest = (a, b) => (Date.parse(b[1].shared) || 0) - (Date.parse(a[1].shared) || 0);


/* ---- Reading the previous data --------------------------------------- */

function readExisting() {
  try {
    const text = fs.readFileSync(OUTPUT, "utf8");
    const match = text.match(/const SCRATCH_DATA = ([\s\S]*);\s*$/);
    return match ? JSON.parse(match[1]) : null;
  } catch {
    return null;
  }
}


/* ---- Main ------------------------------------------------------------- */

async function main() {
  const username = String(config.username || "").trim();
  if (!username) throw new Error("Set your Scratch username in scratch.config.js");

  // 1. Your shared projects
  console.log(`Fetching shared projects for ${username}…`);
  const raw = await getAllPages(`${API}/users/${encodeURIComponent(username)}/projects`);
  const projects = new Map(raw.map((p) => [String(p.id), normalise(p)]));
  console.log(`  ${projects.size} shared project(s)`);

  const previous = readExisting();
  const previousCount = previous ? Object.keys(previous.projects || {}).length : 0;
  if (projects.size === 0 && previousCount > 0) {
    throw new Error(
      `Scratch returned no projects but the site currently has ${previousCount}. ` +
      `Keeping the existing data in case this is a Scratch glitch.`
    );
  }

  // 2. Rows
  const rows = [];
  const addRow = (name, projectIds, source) => {
    if (name && projectIds.length) rows.push({ name, source, projectIds });
  };
  const auto = config.autoRows || {};
  const mine = [...projects.entries()];

  if (auto.newest) {
    addRow(auto.newest, [...mine].sort(byNewest).slice(0, auto.newestCount || 10).map(([id]) => id), "newest");
  }
  if (auto.mostLoved) {
    const loved = mine.filter(([, p]) => p._loves > 0).sort((a, b) => b[1]._loves - a[1]._loves);
    addRow(auto.mostLoved, loved.slice(0, auto.mostLovedCount || 10).map(([id]) => id), "mostLoved");
  }

  // 3. Studios (each becomes a row)
  for (const entry of config.studios || []) {
    const studioId = String(typeof entry === "object" ? entry.id : entry).trim();
    if (!/^\d+$/.test(studioId)) throw new Error(`"${studioId}" isn't a studio ID (it should be a number)`);

    await sleep(DELAY_MS);
    const studio = await getJSON(`${API}/studios/${studioId}`);
    const name = (typeof entry === "object" && entry.name) || studio.title || `Studio ${studioId}`;

    await sleep(DELAY_MS);
    const items = await getAllPages(`${API}/studios/${studioId}/projects`);
    const ids = [];
    for (const item of items) {
      const id = String(item.id);
      if (projects.has(id)) { ids.push(id); continue; }
      if (!config.studioProjectsFromOthers) continue;   // someone else's project
      await sleep(DELAY_MS);
      try {
        projects.set(id, normalise(await getJSON(`${API}/projects/${id}`)));
        ids.push(id);
      } catch (err) {
        console.warn(`  Skipped project ${id}: ${err.message}`);
      }
    }
    console.log(`  Studio "${name}": ${ids.length} project(s)`);
    addRow(name, ids, `studio:${studioId}`);
  }

  if (auto.all) {
    addRow(auto.all, [...mine].sort(byNewest).map(([id]) => id), "all");
  }

  // 4. Save, but only if something actually changed (keeps the history tidy)
  const saved = {};
  for (const [id, p] of projects) {
    const { _loves, ...keep } = p;
    saved[id] = keep;
  }
  const data = { syncedAt: new Date().toISOString(), username, rows, projects: saved };

  const comparable = (d) => JSON.stringify({ username: d.username, rows: d.rows, projects: d.projects });
  if (previous && comparable(previous) === comparable(data)) {
    console.log("No changes since the last sync.");
    return;
  }

  const file =
    "/* AUTO-GENERATED by scripts/sync-scratch.js. Don't edit by hand:\n" +
    "   it is replaced every time the sync runs. To tweak projects, use\n" +
    "   projects.js; for sync settings, use scratch.config.js. */\n" +
    `const SCRATCH_DATA = ${JSON.stringify(data, null, 2)};\n`;

  fs.writeFileSync(OUTPUT, file);
  console.log(`Saved ${Object.keys(saved).length} project(s) in ${rows.length} row(s) to ${path.relative(ROOT, OUTPUT)}`);
}

main().catch((err) => {
  console.error(`Sync failed: ${err.message}`);
  console.error("The existing project data was left unchanged.");
  process.exitCode = 1;
});
