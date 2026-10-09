// Browser-only helpers: read and write notes in the GitHub repo via the Contents API.
// The token lives in localStorage on this device and is only ever sent to api.github.com.

const TOKEN_KEY = 'garden-token';
const NOTES_DIR = 'src/content/notes';

export type NoteMeta = {
  title: string;
  status: 'seedling' | 'budding' | 'evergreen';
  created: string;
  updated?: string;
  tags: string[];
};
export type LoadedNote = { meta: NoteMeta; body: string; sha: string };

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
};
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t.trim());
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export function gardenConfig() {
  const d = document.body.dataset;
  return { repo: d.repo ?? '', branch: d.branch ?? 'main', base: (d.base ?? '').replace(/\/$/, '') };
}

const pad = (n: number) => String(n).padStart(2, '0');
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';

const toB64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};
const fromB64 = (b64: string) => {
  const bin = atob(b64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export function serialize(meta: NoteMeta, body: string): string {
  const lines = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    `status: ${meta.status}`,
    `created: ${meta.created}`,
    ...(meta.updated ? [`updated: ${meta.updated}`] : []),
    `tags: [${meta.tags.map((t) => JSON.stringify(t)).join(', ')}]`,
    '---',
    '',
    body.trim(),
    '',
  ];
  return lines.join('\n');
}

const unquote = (v: string) => {
  v = v.trim();
  if (v.startsWith('"')) { try { return JSON.parse(v); } catch { /* fall through */ } }
  return v.replace(/^['"]|['"]$/g, '');
};

export function parse(text: string): { meta: NoteMeta; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const front = m?.[1] ?? '';
  const body = (m?.[2] ?? text).replace(/^\s*\n/, '');
  const get = (k: string) => front.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1] ?? '';
  const tagsRaw = get('tags').trim().replace(/^\[|\]$/g, '');
  const status = unquote(get('status'));
  return {
    meta: {
      title: unquote(get('title')),
      status: status === 'budding' || status === 'evergreen' ? status : 'seedling',
      created: unquote(get('created')) || today(),
      updated: unquote(get('updated')) || undefined,
      tags: tagsRaw ? tagsRaw.split(',').map(unquote).filter(Boolean) : [],
    },
    body: body.trimEnd(),
  };
}

export class GardenError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

async function api(path: string, init: RequestInit = {}, query = '') {
  const { repo } = gardenConfig();
  const token = getToken();
  if (!token) throw new GardenError('Add your GitHub token first.', 401);
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}${query}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) throw new GardenError('GitHub rejected the token. Check it or make a new one.', 401);
  if (res.status === 403) throw new GardenError('The token isn’t allowed to do that (needs Contents: read & write).', 403);
  return res;
}

const ref = () => `?ref=${encodeURIComponent(gardenConfig().branch)}`;

export async function loadNote(slug: string): Promise<LoadedNote> {
  const res = await api(`${NOTES_DIR}/${slug}.md`, {}, ref());
  if (res.status === 404) throw new GardenError('That note doesn’t exist in the repo (yet?).', 404);
  if (!res.ok) throw new GardenError(`GitHub error ${res.status}`, res.status);
  const json = await res.json();
  return { ...parse(fromB64(json.content)), sha: json.sha };
}

async function exists(slug: string) {
  const res = await api(`${NOTES_DIR}/${slug}.md`, {}, ref());
  return res.status === 200;
}

/** Create (no sha) or update (sha) a note. Returns the slug used. */
export async function saveNote(opts: { slug?: string; sha?: string; meta: NoteMeta; body: string }) {
  let slug = opts.slug;
  if (!slug) {
    const base = slugify(opts.meta.title);
    slug = base;
    for (let i = 2; await exists(slug); i++) slug = `${base}-${i}`;
  }
  const { branch } = gardenConfig();
  const res = await api(`${NOTES_DIR}/${slug}.md`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `${opts.sha ? 'Tend' : 'Plant'}: ${opts.meta.title}`,
      content: toB64(serialize(opts.meta, opts.body)),
      branch,
      ...(opts.sha ? { sha: opts.sha } : {}),
    }),
  });
  if (res.status === 409 || res.status === 422) {
    throw new GardenError('This note changed elsewhere. Reload the page and try again.', res.status);
  }
  if (!res.ok) throw new GardenError(`GitHub error ${res.status}`, res.status);
  return slug;
}

export async function deleteNote(slug: string, sha: string, title: string) {
  const res = await api(`${NOTES_DIR}/${slug}.md`, {
    method: 'DELETE',
    body: JSON.stringify({ message: `Pull up: ${title}`, sha, branch: gardenConfig().branch }),
  });
  if (!res.ok) throw new GardenError(`GitHub error ${res.status}`, res.status);
}

/** Opens the token dialog; resolves true once a token has been saved. */
export function askForToken(): Promise<boolean> {
  const dlg = document.getElementById('token-dialog') as HTMLDialogElement | null;
  if (!dlg) return Promise.resolve(false);
  const input = dlg.querySelector<HTMLInputElement>('input')!;
  input.value = getToken();
  dlg.showModal();
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'save' && !!getToken()), { once: true });
  });
}
