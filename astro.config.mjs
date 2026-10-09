import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { remarkWikiLinks } from './src/lib/remark-wikilinks.mjs';

// On GitHub Pages the site lives at https://<user>.github.io/<repo>/
// The deploy workflow sets SITE and BASE; locally both are empty.
const base = process.env.BASE || '/';
const site = process.env.SITE || undefined;

export default defineConfig({
  site,
  base,
  markdown: {
    processor: unified({ remarkPlugins: [[remarkWikiLinks, { base }]] }),
  },
});
