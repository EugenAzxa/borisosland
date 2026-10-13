// Хранилище: закрытый Vercel Blob (регион fra1). Карточки участков и фото не видны снаружи,
// фото отдаёт /api/img, опубликованные участки собраны в один файл pub/listings.json.
import { put, get, list, del } from '@vercel/blob';
import crypto from 'node:crypto';

const PFX = process.env.DATA_PREFIX || ''; // для локальных проверок: DATA_PREFIX=dev/

export const rid = (n = 10) => crypto.randomBytes(n).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, n);

export async function readJSON(path) {
  const r = await get(PFX + path, { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  return JSON.parse(await new Response(r.stream).text());
}

export async function writeJSON(path, data) {
  await put(PFX + path, JSON.stringify(data), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60,
  });
}

export async function putPhoto(buf, ext, type) {
  const path = `photos/${rid(16)}.${ext}`;
  await put(PFX + path, buf, { access: 'private', addRandomSuffix: false, contentType: type, cacheControlMaxAge: 31536000 });
  return path;
}

export async function getFile(path) {
  const r = await get(PFX + path, { access: 'private' }).catch(() => null);
  return r && r.statusCode === 200 ? r : null;
}

export async function removeFiles(paths) {
  if (paths.length) await del(paths.map((p) => PFX + p)).catch(() => {});
}

async function readAll(prefix) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix: PFX + prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : null;
  } while (cursor);
  const items = await Promise.all(out.map((b) => readJSON(b.pathname.slice(PFX.length)).catch(() => null)));
  return items.filter(Boolean);
}

export const allListings = () => readAll('listings/');

export const saveListing = (l) => writeJSON(`listings/${l.id}.json`, l);
export const deleteListingFile = (id) => removeFiles([`listings/${id}.json`]);

// Публичная часть: только опубликованные участки и только безопасные поля (без контактов владельца)
const PUBLIC_FIELDS = ['id', 'slug', 'title', 'kind', 'vri', 'area', 'price', 'district', 'place', 'kn', 'distKad',
  'power', 'gas', 'water', 'sewer', 'road', 'description', 'photos', 'checks', 'note', 'publishedAt', 'updatedAt'];

export function toPublic(l) {
  const o = {};
  for (const k of PUBLIC_FIELDS) if (l[k] !== undefined && l[k] !== '') o[k] = l[k];
  return o;
}

export async function rebuildPublic(listings) {
  const items = (listings || await allListings())
    .filter((l) => l.status === 'approved')
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    .map(toPublic);
  await writeJSON('pub/listings.json', items);
  return items;
}

export async function publicListings() {
  return (await readJSON('pub/listings.json')) || [];
}
