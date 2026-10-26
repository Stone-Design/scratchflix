# Scratchflix

A streaming-style portfolio for Scratch projects. GitHub fetches the projects
from Scratch every night and publishes the site to GitHub Pages, so a newly
shared project appears on the site by the next morning.

## What's where

| Path | What it is | Edit it? |
|---|---|---|
| `scratch.config.js` | Sync settings: Scratch username, automatic rows, studios | Yes |
| `site/projects.js` | Site name, featured project, hiding or retitling projects | Yes |
| `site/scratch-data.js` | Project data saved by the sync | No (overwritten each sync) |
| `site/index.html`, `styles.css`, `script.js`, `intro.js` | The site itself | Only to change the design |
| `scripts/sync-scratch.js` | The script that fetches from Scratch | No |
| `.github/workflows/deploy.yml` | The nightly sync and publish job | No |

## One-time setup

1. **Create a repository on GitHub.** Make it **public**, and don't add a
   README or any other files. On a free GitHub account, Pages only works on
   public repositories.

2. **Push this folder to it.** From a terminal, inside this folder:

   ```bash
   git init
   git add .
   git commit -m "First version"
   git branch -M main
   git remote add origin https://github.com/YOUR-GITHUB-NAME/YOUR-REPO.git
   git push -u origin main
   ```

   (GitHub Desktop works too. Make sure the hidden `.github` folder is
   included, as the automation lives there.)

3. **Turn on Pages.** In the repo, go to **Settings → Pages**. Under
   *Build and deployment*, set **Source** to **GitHub Actions**.

4. **Run it once.** Go to the **Actions** tab, choose
   **Sync Scratch projects & deploy**, then **Run workflow**. If the run
   started by your first push failed, that's only because Pages wasn't
   turned on yet, so this run fixes it.

5. **Visit your site** at `https://YOUR-GITHUB-NAME.github.io/YOUR-REPO/`.
   The link also appears in the finished run's summary.

## Everyday use

- **New project:** share it on Scratch. It appears after the nightly sync,
  or straight away if you press **Run workflow** on the Actions tab.
- **Categories:** make a studio on Scratch (e.g. "Action Games"), add your
  projects to it, and put its ID in `studios` in `scratch.config.js`. Each
  studio becomes a row.
- **Featured project, hiding, extra rows such as "My Favorites":** use
  `OVERRIDES` in `site/projects.js`.
- **Any change you push** to `main` republishes the site within a minute
  or two.

## Previewing on your own computer

```bash
node scripts/sync-scratch.js   # needs Node.js 18 or newer
```

Then open `site/index.html` in your browser. The sync also runs fine from
your own machine, so you can preview before pushing.

## Good to know

- **Only shared projects** can be fetched. Unshared ones never appear.
- **If a sync fails** (Scratch down, a mistyped studio ID), the site keeps
  the last good data and the run shows a yellow warning. The details are in
  the *Fetch projects from Scratch* step.
- **The nightly schedule can pause.** GitHub disables scheduled workflows
  in public repositories after 60 days with no repository activity. If that
  happens, re-enable it on the Actions tab. Pushes and **Run workflow**
  still work regardless.
- **Why not fetch live in the browser?** Scratch's API only lets
  `scratch.mit.edu` itself read the data from a web page (CORS), so the
  fetch has to happen outside the browser. That's what the nightly job is for.
