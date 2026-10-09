// Turns [[note-slug]] and [[note-slug|label]] into links to /notes/<slug>/.
const PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function walk(node, base) {
  if (!node.children) return;
  const next = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value.includes('[[')) {
      let last = 0;
      for (const m of child.value.matchAll(PATTERN)) {
        if (m.index > last) next.push({ type: 'text', value: child.value.slice(last, m.index) });
        const target = m[1];
        next.push({
          type: 'link',
          url: `${base.replace(/\/$/, '')}/notes/${slugify(target)}/`,
          data: { hProperties: { className: ['wikilink'] } },
          children: [{ type: 'text', value: m[2] || target }],
        });
        last = m.index + m[0].length;
      }
      if (last < child.value.length) next.push({ type: 'text', value: child.value.slice(last) });
    } else {
      if (child.type !== 'code' && child.type !== 'inlineCode') walk(child, base);
      next.push(child);
    }
  }
  node.children = next;
}

export function remarkWikiLinks({ base = '/' } = {}) {
  return (tree) => walk(tree, base);
}
