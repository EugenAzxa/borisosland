// Админка: вход по паролю (ADMIN_PASSWORD), участки на витрине. Участки заводит только Инвест 47 после звонка владельца.
import { json, checkPassword, adminToken, isAdmin, clean, num } from '../lib/http.js';
import { allListings, saveListing, deleteListingFile, removeFiles, rebuildPublic, readJSON, rid } from '../lib/store.js';
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
    const listings = await allListings();
    listings.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return json({ listings, kinds: KINDS, districts: DISTRICTS, checks: CHECKS });
  }

  // новый участок заводит сам Инвест 47 после звонка владельца
  if (b.action === 'create') {
    const now = new Date().toISOString();
    const l = {
      id: rid(8), status: 'pending', createdAt: now, updatedAt: now, owner: { name: '', phone: '', email: '', role: 'Собственник' },
      title: 'Новый участок', kind: 'prom', vri: '', area: '', price: null, district: 'Всеволожский', place: '', kn: '', distKad: '',
      power: '', gas: '', water: '', sewer: '', road: '', description: '', photos: [], checks: {}, note: '', adminNote: '',
    };
    await saveListing(l);
    return json({ listing: l });
  }

  if (b.action === 'save') {
    const l = await readJSON(`listings/${clean(b.id, 20)}.json`);
    if (!l) return json({ error: 'Участок не найден' }, 404);
    const p = b.patch || {};
    for (const [k, max] of Object.entries(TEXT)) if (k in p) l[k] = clean(p[k], max);
    if ('area' in p) l.area = num(p.area) || l.area;
    if ('price' in p) l.price = num(p.price);
    if ('distKad' in p) l.distKad = num(p.distKad) || '';
    if ('kind' in p && KINDS[p.kind]) l.kind = p.kind;
    if ('district' in p && DISTRICTS.includes(p.district)) l.district = p.district;
    if ('checks' in p) l.checks = Object.fromEntries(Object.keys(CHECKS).filter((k) => p.checks[k]).map((k) => [k, 1]));
    if (Array.isArray(p.photos)) l.photos = p.photos.filter((x) => /^photos\/[a-z0-9]{16}\.(jpg|webp|png)$/.test(x)).slice(0, 20);
    if (p.owner) l.owner = { name: clean(p.owner.name, 80), phone: clean(p.owner.phone, 30), email: clean(p.owner.email, 120), role: clean(p.owner.role, 40) };
    if (p.status === 'approved' && (!l.area || !l.place)) return json({ error: 'Перед публикацией укажите площадь и где находится участок' }, 400);
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

  return json({ error: 'unknown action' }, 400);
}
