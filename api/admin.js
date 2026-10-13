// Админка: вход по паролю (ADMIN_PASSWORD), модерация заявок на витрину, обращения
import { json, checkPassword, adminToken, isAdmin, clean, num } from '../lib/http.js';
import { allListings, allLeads, saveListing, saveLead, deleteListingFile, deleteLeadFile, removeFiles, rebuildPublic, readJSON } from '../lib/store.js';
import { KINDS, DISTRICTS, CHECKS, slugify, OWN } from '../lib/listings.js';

const TEXT = { title: 160, vri: 200, place: 200, kn: 200, power: 120, gas: 120, water: 120, sewer: 120, road: 160, description: 4000, note: 600, adminNote: 2000 };

export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

  if (b.action === 'login') {
    if (!process.env.ADMIN_PASSWORD) return json({ error: 'Пароль админки не задан (ADMIN_PASSWORD)' }, 500);
    await new Promise((r) => setTimeout(r, 400)); // замедляем перебор
    if (!checkPassword(b.password)) return json({ error: 'Неверный пароль' }, 401);
    return json({ token: adminToken() });
  }
  if (!isAdmin(req)) return json({ error: 'Нужно войти заново' }, 401);

  if (b.action === 'list') {
    const [listings, leads] = await Promise.all([allListings(), allLeads()]);
    listings.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    leads.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return json({ listings, leads, kinds: KINDS, districts: DISTRICTS, checks: CHECKS });
  }

  if (b.action === 'save') {
    const l = await readJSON(`listings/${clean(b.id, 20)}.json`);
    if (!l) return json({ error: 'Заявка не найдена' }, 404);
    const p = b.patch || {};
    for (const [k, max] of Object.entries(TEXT)) if (k in p) l[k] = clean(p[k], max);
    if ('area' in p) l.area = num(p.area) || l.area;
    if ('price' in p) l.price = num(p.price);
    if ('distKad' in p) l.distKad = num(p.distKad) || '';
    if ('kind' in p && KINDS[p.kind]) l.kind = p.kind;
    if ('district' in p && DISTRICTS.includes(p.district)) l.district = p.district;
    if ('checks' in p) l.checks = Object.fromEntries(Object.keys(CHECKS).filter((k) => p.checks[k]).map((k) => [k, 1]));
    if (Array.isArray(p.photos)) l.photos = p.photos.filter((x) => l.photos.includes(x)); // порядок и удаление, без чужих путей
    if ('status' in p && ['pending', 'approved', 'rejected', 'archived'].includes(p.status)) {
      if (p.status === 'approved' && !l.publishedAt) l.publishedAt = new Date().toISOString();
      l.status = p.status;
    }
    if (!l.slug || 'title' in p) {
      let s = slugify(l.title) || 'uchastok';
      if (OWN.some((o) => o.slug === s)) s += '-' + l.id;
      const others = (await allListings()).filter((x) => x.id !== l.id && x.slug === s);
      l.slug = others.length ? s + '-' + l.id : s;
    }
    l.updatedAt = new Date().toISOString();
    await saveListing(l);
    await rebuildPublic();
    return json({ listing: l });
  }

  if (b.action === 'delete') {
    const l = await readJSON(`listings/${clean(b.id, 20)}.json`);
    if (!l) return json({ ok: true });
    await removeFiles(l.photos || []);
    await deleteListingFile(l.id);
    await rebuildPublic();
    return json({ ok: true });
  }

  if (b.action === 'lead') {
    const l = await readJSON(`leads/${clean(b.id, 40)}.json`);
    if (!l) return json({ error: 'Обращение не найдено' }, 404);
    if ('done' in b) l.done = !!b.done;
    if ('note' in b) l.note = clean(b.note, 1000);
    await saveLead(l);
    return json({ lead: l });
  }

  if (b.action === 'deleteLead') {
    await deleteLeadFile(clean(b.id, 40));
    return json({ ok: true });
  }

  return json({ error: 'unknown action' }, 400);
}
