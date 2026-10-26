/* ==========================================================================
   projects.js — YOUR SETTINGS AND TWEAKS
   --------------------------------------------------------------------------
   Your projects now come from Scratch automatically: GitHub fetches them
   every night into scratch-data.js. You don't need to list them here.

   Use this file to:
     • change the site name and a few display settings   (SITE_CONFIG)
     • pick the featured project, hide one, add it to
       extra rows, or rewrite its description            (OVERRIDES)
     • add a project by hand that the sync doesn't pick up (PROJECTS)

   To change WHICH projects and rows are fetched (username, studios),
   edit scratch.config.js in the top folder instead.
   ========================================================================== */

const SITE_CONFIG = {
  // Shown top-left in the navigation bar and in the browser tab
  siteName: "Scratchflix",

  // Adds a "see all my projects" link to the footer
  scratchUsername: "BearB2021",

  // Optional: force rows into this order, e.g. ["My Favorites", "New Releases"].
  // Rows you don't list keep their normal order after these.
  categoryOrder: [],

  // Projects shared within this many days get a NEW badge (0 turns it off)
  newBadgeDays: 30,

  // Row for any project that isn't in another row
  uncategorisedRow: "More Projects"
};


/* OVERRIDES ---------------------------------------------------------------
   Keyed by Scratch ID: the number in the project's URL,
   e.g. scratch.mit.edu/projects/123456789/  →  "123456789"

   featured: true       show it in the big hero banner
                        (if nothing is featured, your newest project is used)
   hidden: true         leave it off the site
   category: [...]      also put it in these rows, e.g. ["My Favorites"]
                        (a new name creates a new row)
   title / description  replace the text from Scratch
                        (by default the description is your Scratch
                        "Instructions", or "Notes and Credits" if those are empty)
   heroImage            a wide image (e.g. 1920×1080) for the hero banner
   thumbnail            your own card image instead of the Scratch thumbnail
   isNew                true/false to force the NEW badge on or off
   ------------------------------------------------------------------------ */
const OVERRIDES = {
  // "123456789": { featured: true, category: ["My Favorites"] },
  // "987654321": { hidden: true },
};


/* PROJECTS ----------------------------------------------------------------
   Optional: add projects by hand, in the same format as before. Most people
   can leave this empty. Each needs at least title, scratchId and category.
   ------------------------------------------------------------------------ */
const PROJECTS = [
  // { title: "My Game", scratchId: "123456789", category: ["Action Games"], description: "…" },
];
