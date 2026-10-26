/* ==========================================================================
   scratch.config.js — settings for the Scratch sync
   --------------------------------------------------------------------------
   scripts/sync-scratch.js reads this file, fetches your shared projects from
   Scratch, and writes them into site/scratch-data.js. On GitHub this runs
   every night automatically (see .github/workflows/deploy.yml).

   Only SHARED projects can be fetched. Unshared ones never appear.
   ========================================================================== */

module.exports = {
  // Your Scratch username
  username: "BearB2021",

  /* Rows built automatically from your projects.
     Rename them, or set a name to "" to turn that row off. */
  autoRows: {
    newest: "New Releases",     // most recently shared first
    newestCount: 10,

    mostLoved: "Most Loved",    // by number of loves (projects with 0 loves are skipped)
    mostLovedCount: 10,

    all: "All Projects"         // everything, newest first
  },

  /* Studios as rows: each studio becomes its own row, named after the studio.
     This is how you make categories like "Action Games" or "Animations":
     create a studio on Scratch, add your projects to it, and list it here.
     The studio ID is the number in its URL: scratch.mit.edu/studios/12345678/

     Either just the ID:              "12345678"
     or rename the row on this site:  { id: "12345678", name: "Action Games" }

     Rows appear in this order, between "Most Loved" and "All Projects". */
  studios: [
    // "12345678",
    // { id: "87654321", name: "Animations" },
  ],

  // Studios can contain other people's projects. false = only show yours.
  studioProjectsFromOthers: false,

  // Where the data is written (the site loads this file)
  output: "site/scratch-data.js"
};
