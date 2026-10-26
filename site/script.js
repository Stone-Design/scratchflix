/* ==========================================================================
   script.js — builds the page from your project data and runs the player
   --------------------------------------------------------------------------
   You shouldn't need to edit this file. Projects come from scratch-data.js
   (synced from Scratch); tweak them in projects.js.

   1. Helpers (Scratch URLs, text tidy-up)
   2. Combine the project data (synced + hand-added + overrides)
   3. Build the rows and pick the featured project
   4. Hero (featured project)
   5. Rows and cards
   6. Row arrow buttons
   7. Play modal
   8. Navigation bar
   9. Start-up
   ========================================================================== */

(() => {
  "use strict";

  /* 1. HELPERS ----------------------------------------------------------- */

  // Scratch serves thumbnails at any size you ask for in the URL.
  const scratchThumb = (id, w = 480, h = 360) =>
    `https://uploads.scratch.mit.edu/get_image/project/${encodeURIComponent(id)}_${w}x${h}.png`;

  const scratchEmbed = (id) => `https://scratch.mit.edu/projects/${encodeURIComponent(id)}/embed`;
  const scratchPage  = (id) => `https://scratch.mit.edu/projects/${encodeURIComponent(id)}/`;

  // "Action Games" -> "action-games" (used for row ids / menu links)
  const slugify = (text) =>
    String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  // A category can be a single string or a list of strings
  const categoriesOf = (project) =>
    (Array.isArray(project.category) ? project.category : [project.category])
      .filter(Boolean)
      .map((c) => String(c).trim());

  // Turns a title into a stable colour (0–359) for the fallback poster
  const hueFor = (text) => {
    let hash = 0;
    for (const ch of String(text)) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
    return hash;
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Grab the elements we'll fill in
  const $ = (id) => document.getElementById(id);
  const els = {
    nav:            $("nav"),
    brand:          $("brand"),
    navLinks:       $("navLinks"),
    hero:           $("hero"),
    heroBackdrop:   $("heroBackdrop"),
    heroCategory:   $("heroCategory"),
    heroTitle:      $("heroTitle"),
    heroDesc:       $("heroDesc"),
    heroPlay:       $("heroPlay"),
    heroScratchLink:$("heroScratchLink"),
    rows:           $("rows"),
    footerProfile:  $("footerProfile"),
    footerSynced:   $("footerSynced"),
    modal:          $("modal"),
    modalTitle:     $("modalTitle"),
    modalClose:     $("modalClose"),
    modalFrame:     $("modalFrame"),
    modalMeta:      $("modalMeta"),
    modalDesc:      $("modalDesc"),
    modalScratchLink: $("modalScratchLink"),
    cardTemplate:   $("cardTemplate")
  };


  /* 2. COMBINE THE PROJECT DATA ----------------------------------------- */
  // Three sources, applied in this order:
  //   a) SCRATCH_DATA  (scratch-data.js, fetched from Scratch by the sync)
  //   b) PROJECTS      (projects.js, anything added by hand)
  //   c) OVERRIDES     (projects.js, tweaks keyed by Scratch ID)
  // They're declared with `const` in other files, so we read them by name.
  const config    = (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG) || {};
  const synced    = (typeof SCRATCH_DATA !== "undefined" && SCRATCH_DATA) || null;
  const manual    = (typeof PROJECTS !== "undefined" && Array.isArray(PROJECTS)) ? PROJECTS : [];
  const overrides = (typeof OVERRIDES !== "undefined" && OVERRIDES) || {};

  const byId = new Map();        // Scratch ID -> project
  const rowIds = new Map();      // row name   -> [Scratch IDs], in display order
  const autoRows = new Set();    // synced rows that aren't real categories
                                 // ("New Releases", "All Projects"…)

  const addToRow = (name, id) => {
    if (!rowIds.has(name)) rowIds.set(name, []);
    const ids = rowIds.get(name);
    if (!ids.includes(id)) ids.push(id);
  };

  // Rows forced to the front by SITE_CONFIG.categoryOrder
  for (const name of config.categoryOrder || []) rowIds.set(name, []);

  // a) Synced from Scratch
  if (synced && synced.projects) {
    for (const [id, p] of Object.entries(synced.projects)) {
      byId.set(String(id), {
        scratchId: String(id),
        title: p.title,
        description: p.instructions || p.notes || "",
        thumbnail: p.thumbnail || "",
        shared: p.shared || null
      });
    }
    for (const row of synced.rows || []) {
      if (!String(row.source || "").startsWith("studio:")) autoRows.add(row.name);
      for (const id of row.projectIds || []) if (byId.has(String(id))) addToRow(row.name, String(id));
    }
  }

  // b) Added by hand
  for (const p of manual) {
    const id = p && p.scratchId != null ? String(p.scratchId).trim() : "";
    if (!id || (!p.title && !byId.has(id))) {
      console.warn("[portfolio] Skipped a project in PROJECTS with no title or scratchId:", p);
      continue;
    }
    const { category, ...fields } = p;
    byId.set(id, { ...(byId.get(id) || {}), ...fields, scratchId: id });
    for (const cat of categoriesOf(p)) addToRow(cat, id);
  }

  // c) Overrides
  for (const [rawId, o] of Object.entries(overrides)) {
    const id = String(rawId).trim();
    if (!byId.has(id)) {
      console.warn(`[portfolio] OVERRIDES mentions ${id}, which isn't in the synced or hand-added projects.`);
      continue;
    }
    const { category, ...fields } = o || {};
    Object.assign(byId.get(id), fields);
    for (const cat of categoriesOf({ category })) addToRow(cat, id);
  }

  // Anything not in a row goes into the catch-all row
  const inARow = new Set([...rowIds.values()].flat());
  for (const id of byId.keys()) if (!inARow.has(id)) addToRow(config.uncategorisedRow || "More Projects", id);

  // Final tidy-up: drop hidden projects, work out badges and labels
  const newDays = Number(config.newBadgeDays ?? 30);
  const now = Date.now();
  for (const [id, p] of byId) {
    if (p.hidden) { byId.delete(id); continue; }
    const age = now - (Date.parse(p.shared) || 0);
    p.title = String(p.title || "Untitled");
    p.isNew = p.isNew ?? (newDays > 0 && !!p.shared && age < newDays * 864e5);
    p.categories = [...rowIds].filter(([, ids]) => ids.includes(id)).map(([name]) => name);
    p.labels = p.categories.filter((name) => !autoRows.has(name));   // shown in hero/player
  }

  const projects = [...byId.values()];


  /* 3. BUILD THE ROWS ---------------------------------------------------- */
  function buildGroups() {
    const groups = new Map();
    for (const [name, ids] of rowIds) {
      const items = ids.map((id) => byId.get(id)).filter(Boolean);   // hidden ones drop out
      if (items.length) groups.set(name, items);
    }
    return groups;
  }

  // Featured: marked in OVERRIDES, else the newest shared project, else the first
  function pickFeatured() {
    return (
      projects.find((p) => p.featured) ||
      [...projects].filter((p) => p.shared).sort((a, b) => Date.parse(b.shared) - Date.parse(a.shared))[0] ||
      projects[0]
    );
  }


  /* 4. HERO (FEATURED PROJECT) ------------------------------------------ */
  function renderHero(project) {
    if (!project) {
      els.hero.hidden = true;
      return;
    }

    els.heroTitle.textContent = project.title;
    els.heroDesc.textContent = project.description || "";
    els.heroCategory.textContent = project.labels.join(" • ");
    els.heroScratchLink.href = scratchPage(project.scratchId);
    els.heroPlay.setAttribute("aria-label", `Play ${project.title}`);
    els.heroPlay.addEventListener("click", () => openPlayer(project));

    // Try the sharpest image first, falling back step by step:
    // custom heroImage -> large Scratch thumbnail -> normal thumbnail -> plain colour
    const candidates = [
      project.heroImage,
      project.thumbnail,
      scratchThumb(project.scratchId, 960, 720),
      scratchThumb(project.scratchId)
    ].filter(Boolean);

    (function tryNext(i) {
      if (i >= candidates.length) return;           // nothing loaded: keep plain background
      const img = new Image();
      img.onload  = () => { els.heroBackdrop.style.backgroundImage = `url("${candidates[i]}")`; };
      img.onerror = () => tryNext(i + 1);
      img.src = candidates[i];
    })(0);
  }


  /* 5. ROWS AND CARDS ---------------------------------------------------- */
  const arrowIcon = (dir) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="${
      dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"
    }"/></svg>`;

  function createCard(project) {
    const item = els.cardTemplate.content.firstElementChild.cloneNode(true);
    const card = item.querySelector(".card");
    const img = item.querySelector(".card__img");

    card.setAttribute("aria-label", `Play ${project.title}`);
    card.style.setProperty("--hue", hueFor(project.title));
    item.querySelector(".card__title").textContent = project.title;
    item.querySelector(".card__fallback").textContent = project.title;
    item.querySelector(".card__badge").hidden = !project.isNew;

    // If the thumbnail can't load (wrong ID, unshared project, offline),
    // show a coloured title poster instead of a broken image.
    img.addEventListener("error", () => card.classList.add("is-fallback"), { once: true });
    img.src = project.thumbnail || scratchThumb(project.scratchId);

    card.addEventListener("click", () => openPlayer(project));
    return item;
  }

  function createRow(name, items) {
    const id = `row-${slugify(name)}`;
    const section = document.createElement("section");
    section.className = "row";
    section.id = id;
    section.setAttribute("aria-labelledby", `${id}-title`);

    const title = document.createElement("h2");
    title.className = "row__title";
    title.id = `${id}-title`;
    title.textContent = name;

    const viewport = document.createElement("div");
    viewport.className = "row__viewport";

    const track = document.createElement("ul");
    track.className = "row__track";
    track.setAttribute("aria-label", name);
    items.forEach((project) => track.appendChild(createCard(project)));

    const prev = document.createElement("button");
    prev.className = "row__arrow row__arrow--prev";
    prev.type = "button";
    prev.setAttribute("aria-label", `Scroll ${name} left`);
    prev.innerHTML = arrowIcon("prev");

    const next = document.createElement("button");
    next.className = "row__arrow row__arrow--next";
    next.type = "button";
    next.setAttribute("aria-label", `Scroll ${name} right`);
    next.innerHTML = arrowIcon("next");

    viewport.append(prev, track, next);
    section.append(title, viewport);
    setupArrows(track, prev, next);
    return section;
  }

  function renderRows(groups) {
    if (!groups.size) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No projects yet. They'll appear after the first sync from Scratch " +
        "(see README.md), or add some by hand in projects.js.";
      els.rows.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const [name, items] of groups) fragment.appendChild(createRow(name, items));
    els.rows.appendChild(fragment);
  }


  /* 6. ROW ARROW BUTTONS ------------------------------------------------- */
  // Scrolls one "page" of cards at a time and disables an arrow at either end.
  function setupArrows(track, prev, next) {
    const update = () => {
      const maxScroll = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxScroll;
    };

    const scrollByPage = (direction) =>
      track.scrollBy({
        left: direction * track.clientWidth * 0.85,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });

    prev.addEventListener("click", () => scrollByPage(-1));
    next.addEventListener("click", () => scrollByPage(1));
    track.addEventListener("scroll", update, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(update).observe(track);
    update();
  }


  /* 7. PLAY MODAL -------------------------------------------------------- */
  let lastFocused = null;

  function openPlayer(project) {
    lastFocused = document.activeElement;

    els.modalTitle.textContent = project.title;
    els.modalMeta.textContent = project.labels.join(" • ");
    els.modalDesc.textContent = project.description || "";
    els.modalScratchLink.href = scratchPage(project.scratchId);
    els.modalFrame.title = `${project.title} (Scratch project)`;
    els.modalFrame.src = scratchEmbed(project.scratchId);

    els.modal.showModal();
    document.body.classList.add("modal-open");

    // Put the project in the address bar so the link can be shared,
    // e.g. yoursite.com/#play-123456789
    history.replaceState(null, "", `#play-${project.scratchId}`);
  }

  function closePlayer() {
    if (els.modal.open) els.modal.close();
  }

  // Runs however the modal closes: X button, Esc key or backdrop click
  els.modal.addEventListener("close", () => {
    els.modalFrame.src = "about:blank";             // stops the game and its sound
    document.body.classList.remove("modal-open");
    history.replaceState(null, "", location.pathname + location.search);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  });

  els.modalClose.addEventListener("click", closePlayer);

  // A click that lands on the <dialog> itself (not its contents) is a backdrop click
  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) closePlayer();
  });

  // Once the game loads, give it keyboard focus so arrow keys work straight away
  els.modalFrame.addEventListener("load", () => {
    if (els.modal.open && els.modalFrame.src !== "about:blank") els.modalFrame.focus();
  });

  // Open a project straight from a shared link (#play-123456789)
  function openFromHash() {
    const match = location.hash.match(/^#play-(.+)$/);
    if (!match) return;
    const project = projects.find((p) => p.scratchId === decodeURIComponent(match[1]));
    if (project) openPlayer(project);
  }


  /* 8. NAVIGATION BAR ---------------------------------------------------- */
  function renderNav(groups) {
    const name = config.siteName || "My Scratch Studio";
    els.brand.textContent = name;
    document.title = name;

    // Up to 5 category shortcuts in the menu
    [...groups.keys()].slice(0, 5).forEach((category) => {
      const link = document.createElement("a");
      link.href = `#row-${slugify(category)}`;
      link.textContent = category;
      els.navLinks.appendChild(link);
    });

    const username = config.scratchUsername || (synced && synced.username);
    if (username) {
      const a = document.createElement("a");
      a.href = `https://scratch.mit.edu/users/${encodeURIComponent(username)}/`;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = `See all my projects on Scratch (@${username})`;
      els.footerProfile.appendChild(a);
    }

    // "Projects last updated from Scratch on 26 Oct 2026"
    const syncedAt = synced && Date.parse(synced.syncedAt);
    if (syncedAt) {
      els.footerSynced.textContent = "Projects last updated from Scratch on " +
        new Date(syncedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + ".";
    }

    // Nav turns solid once you scroll past the top
    const onScroll = () => els.nav.classList.toggle("nav--solid", window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }


  /* 9. START-UP ---------------------------------------------------------- */
  const groups = buildGroups();
  const featured = pickFeatured();

  renderNav(groups);
  renderHero(featured);
  renderRows(groups);

  // A shared #play- link opens the player, but only after the intro has
  // finished (otherwise the player would appear on top of the intro).
  if (window.introDone || !document.getElementById("intro")) openFromHash();
  else document.addEventListener("intro:done", openFromHash, { once: true });
})();
