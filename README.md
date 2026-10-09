# 🌱 Digital Garden

A place for half-formed ideas, built with [Astro](https://astro.build).

## Tend it

```bash
npm install
npm run dev                          # http://localhost:4321
npm run new "A thought" tag1,tag2    # plant a new seedling
```

Notes are markdown files in `src/content/notes/`. Frontmatter:

```yaml
title: My note
status: seedling   # seedling | budding | evergreen
created: 2026-10-09
updated: 2026-10-10   # bump when you tend it
tags: [ideas]
```

Link notes with `[[note-slug]]` or `[[note-slug|custom label]]`. Backlinks appear automatically.

## Writing from your phone

Edit or add files in `src/content/notes/` through the GitHub mobile app, or point Obsidian at that folder. Every push to `main` redeploys.

## Deploy

Enable **Settings → Pages → Source: GitHub Actions**, then push to `main`.

## Editing from the site itself

Use **✏️ Write** (or the quick box on the home page) to add and edit notes in the browser. Saving commits to this repo through the GitHub API, and the deploy action republishes in about a minute.

One-time setup: click ⚙ and paste a fine-grained token with **Contents: read and write** on this repo. It's stored only in that browser, so repeat on each device.
