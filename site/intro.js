/* ==========================================================================
   intro.js — the opening "B" ident
   --------------------------------------------------------------------------
   The animation timeline itself lives in styles.css (section 11), so the
   overlay still fades away on its own even if this script fails to load.
   This script adds the extras:
     • the coloured light strands for the zoom-through
     • click / any key to skip
     • pausing the hero's own entrance animation until the intro is gone
     • telling script.js when it's done (so shared #play- links open after it)

   To change when the intro plays, edit INTRO_MODE in the <head> of index.html.
   ========================================================================== */

(() => {
  "use strict";

  const root = document.documentElement;
  const intro = document.getElementById("intro");
  let finished = false;

  // Removes the overlay and lets the rest of the page know
  function finish() {
    if (finished) return;
    finished = true;
    removeEventListener("keydown", skip);
    if (intro) intro.remove();
    root.classList.remove("intro-playing");   // un-pauses the hero animation
    window.introDone = true;
    document.dispatchEvent(new Event("intro:done"));
  }

  // Fast fade-out when the visitor clicks or presses a key
  function skip() {
    if (intro) intro.classList.add("intro--leaving");
  }

  // Don't play if: no overlay, turned off / already seen this session,
  // or the visitor has asked their device to reduce motion.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!intro || root.classList.contains("no-intro") || reduceMotion) {
    finish();
    return;
  }

  root.classList.add("intro-playing");
  try { sessionStorage.setItem("introSeen", "1"); } catch (e) { /* private mode: ignore */ }

  /* Light strands --------------------------------------------------------
     ~90 thin vertical bars of random width and colour. Weighted towards the
     accent colour, with a few warm and cool colours mixed in. */
  const strands = intro.querySelector(".intro__strands");
  const accent = getComputedStyle(root).getPropertyValue("--accent").trim() || "#e50914";
  const palette = [
    accent, accent, accent, accent,
    "#8a0610", "#ff5a1f", "#ffb800", "#ff2fa0", "#9d4edd", "#3a86ff", "#00c2ff"
  ];
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < 90; i++) {
    const strand = document.createElement("span");
    strand.className = "intro__strand";
    strand.style.setProperty("--w", (Math.random() * 1.6 + 0.2).toFixed(2) + "vw");
    strand.style.setProperty("--c", palette[Math.floor(Math.random() * palette.length)]);
    strand.style.setProperty("--o", (Math.random() * 0.7 + 0.3).toFixed(2));
    strand.style.setProperty("--d", (Math.random() * 0.4).toFixed(2) + "s");
    fragment.appendChild(strand);
  }
  strands.appendChild(fragment);

  // The overlay's own fade-out ends the intro. Child animations also bubble
  // "animationend" up to the overlay, so check it's the overlay's event.
  intro.addEventListener("animationend", (event) => {
    if (event.target === intro && event.animationName === "intro-out") finish();
  });

  intro.addEventListener("click", skip);
  addEventListener("keydown", skip);

  // Safety net: browsers can hold back animation events in background tabs
  setTimeout(finish, 5000);
})();
