// Публичные формы: GET - токен формы; POST ?kind=lead - «перезвоните мне», POST ?kind=listing - заявка на витрину
import { json, formToken, checkFormToken, notify, clean, num, phoneOk } from '../lib/http.js';
import { saveLead, saveListing, rid } from '../lib/store.js';
import { KINDS, DISTRICTS, autoTitle } from '../lib/listings.js';

export function GET() {
  return json({ t: formToken() });
}

export async function POST(req) {
  const kind = new URL(req.url).searchParams.get('kind');
  let b;
  try { b = await req.json(); } catch { return json({ error: 'Не удалось прочитать форму' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: 'Пустая форма' }, 400);

  // боты: заполненное скрытое поле или форма без настоящего токена
  if (clean(b.company)) return json({ ok: true });
  const t = checkFormToken(b.t);
  if (t === 'bad' || t === 'old') return json({ error: 'Страница устарела, обновите её и отправьте ещё раз' }, 400);
  if (t === 'fast') return json({ error: 'Слишком быстро. Проверьте поля и отправьте ещё раз' }, 400);
  if (!b.consent) return json({ error: 'Нужно согласие на обработку персональных данных' }, 400);

  const name = clean(b.name, 80), phone = clean(b.phone, 30);
  if (!name) return json({ error: 'Укажите имя', field: 'name' }, 400);
  if (!phoneOk(phone)) return json({ error: 'Проверьте номер телефона', field: 'phone' }, 400);
  const now = new Date().toISOString();

  if (kind === 'lead') {
    const lead = {
      id: now.replace(/\D/g, '').slice(0, 14) + '-' + rid(6), createdAt: now, done: false,
      name, phone, message: clean(b.message, 1500), lot: clean(b.lot, 160), lotId: clean(b.lotId, 40), page: clean(b.page, 200),
    };
    await saveLead(lead);
    await notify(`Новое обращение с сайта\n${name}, ${phone}${lead.lot ? '\nУчасток: ' + lead.lot : ''}${lead.message ? '\n' + lead.message : ''}`);
    return json({ ok: true });
  }

  if (kind === 'listing') {
    const area = num(b.area), price = num(b.price);
    const k = KINDS[b.kind] ? b.kind : null;
    if (!k) return json({ error: 'Выберите категорию земли', field: 'kind' }, 400);
    if (!area || area > 1e6) return json({ error: 'Укажите площадь в сотках', field: 'area' }, 400);
    if (!price) return json({ error: 'Укажите цену', field: 'price' }, 400);
    const place = clean(b.place, 200);
    if (!place) return json({ error: 'Укажите, где находится участок', field: 'place' }, 400);
    const photos = (Array.isArray(b.photos) ? b.photos : []).filter((p) => /^photos\/[a-z0-9]{16}\.(jpg|webp|png)$/.test(p)).slice(0, 10);
    const l = {
      id: rid(8), status: 'pending', createdAt: now, updatedAt: now,
      owner: { name, phone, email: clean(b.email, 120), role: clean(b.role, 40) },
      kind: k, vri: clean(b.vri, 200), area, price,
      district: DISTRICTS.includes(b.district) ? b.district : 'Другой', place, kn: clean(b.kn, 200), distKad: num(b.distKad) || '',
      power: clean(b.power, 120), gas: clean(b.gas, 120), water: clean(b.water, 120), sewer: clean(b.sewer, 120), road: clean(b.road, 160),
      description: clean(b.description, 4000), photos, checks: {}, note: '', adminNote: '',
    };
    l.title = autoTitle(l);
    await saveListing(l);
    await notify(`Новая заявка на витрину\n${l.title}, ${KINDS[k]}, ${price.toLocaleString('ru-RU')} ₽\n${name}, ${phone}\nФото: ${photos.length}`);
    return json({ ok: true, id: l.id });
  }

  return json({ error: 'Неизвестная форма' }, 400);
}
