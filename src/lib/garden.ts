import { getCollection, type CollectionEntry } from 'astro:content';

export type Note = CollectionEntry<'notes'>;

export const STATUS = {
  seedling: { emoji: '🌱', label: 'Seedling', blurb: 'A rough idea, just planted' },
  budding: { emoji: '🌿', label: 'Budding', blurb: 'Taking shape' },
  evergreen: { emoji: '🌳', label: 'Evergreen', blurb: 'Solid and well-tended' },
} as const;

export const lastTended = (n: Note) => n.data.updated ?? n.data.created;

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function allNotes(): Promise<Note[]> {
  const notes = await getCollection('notes');
  return notes.sort((a, b) => lastTended(b).getTime() - lastTended(a).getTime());
}

const slugOf = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function outgoingLinks(n: Note): string[] {
  const body = n.body ?? '';
  return [...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((m) => slugOf(m[1]));
}

export function backlinksFor(slug: string, notes: Note[]): Note[] {
  return notes.filter((n) => n.id !== slug && outgoingLinks(n).includes(slug));
}

/** Notes nobody links to and that link to nothing: good candidates to connect. */
export function orphans(notes: Note[]): Note[] {
  const linked = new Set(notes.flatMap(outgoingLinks));
  return notes.filter((n) => !linked.has(n.id) && outgoingLinks(n).length === 0);
}

/** Activity per day, counting both planting and tending. */
export function activity(notes: Note[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const n of notes) {
    const days = new Set([dayKey(n.data.created), dayKey(lastTended(n))]);
    for (const d of days) map.set(d, (map.get(d) ?? 0) + 1);
  }
  return map;
}

export function streak(act: Map<string, number>, today = new Date()): number {
  let count = 0;
  const d = new Date(today);
  // Today not being done yet shouldn't break the streak.
  if (!act.has(dayKey(d))) d.setUTCDate(d.getUTCDate() - 1);
  while (act.has(dayKey(d))) {
    count++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return count;
}
