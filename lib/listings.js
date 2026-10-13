// Витрина: справочники, собственные участки Инвест 47, разметка карточек и страницы участка
import { esc, money, sot, SITE } from './site.js';

export const KINDS = {
  prom: 'Промназначение',
  komm: 'Коммерческое назначение',
  izhs: 'ИЖС',
  lph: 'ЛПХ',
  snt: 'Садоводство (СНТ)',
  selhoz: 'Сельхозназначение',
  other: 'Другое',
};

export const DISTRICTS = ['Всеволожский', 'Кировский', 'Тосненский', 'Гатчинский', 'Ломоносовский', 'Выборгский', 'Приозерский',
  'Кингисеппский', 'Лужский', 'Волосовский', 'Волховский', 'Тихвинский', 'Лодейнопольский', 'Сланцевский', 'Санкт-Петербург', 'Другой'];

export const CHECKS = {
  docs: 'Документы и собственник проверены по ЕГРН',
  vri: 'Категория и ВРИ совпадают с объявлением',
  access: 'Есть подъезд к участку',
  utilities: 'Коммуникации подтверждены',
  visit: 'Участок осмотрен на месте',
};

/* Свои участки Инвест 47 - всегда первые на витрине */
export const OWN = [
  { id: 'u2372', slug: 'murmanskoe-6-km-23-72-sot', own: true, title: 'Участок 23,72 сот. у трассы Кола с подстанцией',
    kind: 'prom', area: 23.72, price: 15000000, district: 'Всеволожский', place: 'Мурманское шоссе, 6 км, Колтушское городское поселение',
    kn: '47:07:1047002:3249, 47:07:1047002:3250', power: '150 кВт, подстанция на участке', road: 'Внутренняя дорога, выезд на Р-21 «Кола»',
    photos: ['/assets/img/lots/u2372.webp', '/assets/img/plan.webp'],
    description: 'Первый участок от трассы Кола. На участке стоит подстанция, 150 кВт уже подключены - не нужно ждать техприсоединения. Вместе с участком в собственность переходит доля 4 сот. в участке под общей дорогой. Без управляющей компании и ежемесячных сборов.',
    checks: { docs: 1, vri: 1, access: 1, utilities: 1, visit: 1 } },
  { id: 'u2085', slug: 'murmanskoe-6-km-20-85-sot', own: true, title: 'Участок 20,85 сот. на Мурманском шоссе',
    kind: 'prom', area: 20.85, price: null, district: 'Всеволожский', place: 'Мурманское шоссе, 6 км, Колтушское городское поселение',
    power: 'Подстанция 150 кВт в посёлке', road: 'Внутренняя дорога, выезд на Р-21 «Кола»',
    photos: ['/assets/img/lots/u2085.webp', '/assets/img/plan.webp'],
    description: 'Участок промназначения во втором ряду от трассы, на общей внутренней дороге с выездом на Мурманское шоссе. Без управляющей компании. С участком передаётся доля в общей дороге.',
    checks: { docs: 1, vri: 1, access: 1, visit: 1 } },
  { id: 'u265', slug: 'murmanskoe-6-km-26-5-sot', own: true, title: 'Участок 26,5 сот. на Мурманском шоссе',
    kind: 'prom', area: 26.5, price: null, district: 'Всеволожский', place: 'Мурманское шоссе, 6 км, Колтушское городское поселение',
    power: 'Подстанция 150 кВт в посёлке', road: 'Внутренняя дорога, выезд на Р-21 «Кола»',
    photos: ['/assets/img/lots/u265.webp', '/assets/img/plan.webp'],
    description: 'Самый большой из свободных участков посёлка. Промназначение, подъезд по общей внутренней дороге с выездом на Мурманское шоссе, без управляющей компании. С участком передаётся доля в общей дороге.',
    checks: { docs: 1, vri: 1, access: 1, visit: 1 } },
];

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export const slugify = (s) => String(s).toLowerCase().split('').map((c) => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export const autoTitle = (l) => `Участок ${sot(l.area)} сот.${l.place ? ', ' + l.place.split(',')[0] : ''}`;

export const photoUrl = (p) => (p.startsWith('/') ? p : '/api/img?p=' + encodeURIComponent(p));

const perSot = (l) => (l.price && l.area ? Math.round(l.price / l.area / 1000) : null);

export function card(l) {
  const ph = l.photos && l.photos[0];
  const ps = perSot(l);
  const tags = [l.power && 'Электричество', l.gas && 'Газ', l.water && 'Вода', l.road && 'Подъезд'].filter(Boolean);
  return `<article class="vc" data-kind="${esc(l.kind)}" data-district="${esc(l.district || '')}" data-area="${l.area || 0}" data-price="${l.price || 0}" data-date="${esc(l.publishedAt || '')}">
  <a class="vc__img" href="/vitrina/${esc(l.slug)}" tabindex="-1" aria-hidden="true">
    ${ph ? `<img src="${esc(photoUrl(ph))}" alt="" loading="lazy" width="600" height="400">` : '<span class="vc__noimg"></span>'}
    <span class="vc__badge${l.own ? ' vc__badge--own' : ''}">${l.own ? 'Участок Инвест 47' : 'Проверено Инвест 47'}</span>
  </a>
  <div class="vc__b">
    <p class="vc__k">${esc(KINDS[l.kind] || 'Участок')}${l.district ? ' · ' + esc(l.district) + (l.district === 'Санкт-Петербург' || l.district === 'Другой' ? '' : ' р-н') : ''}</p>
    <h3><a href="/vitrina/${esc(l.slug)}">${esc(l.title)}</a></h3>
    <p class="vc__place">${esc(l.place || '')}</p>
    <p class="vc__row"><b>${sot(l.area)}<small> сот.</small></b><span>${l.price ? money(l.price) + (ps ? `<small>${ps} тыс. ₽ / сот.</small>` : '') : 'Цена по запросу'}</span></p>
    ${tags.length ? `<p class="vc__tags">${tags.map((t) => `<span>${t}</span>`).join('')}</p>` : ''}
  </div>
</article>`;
}

function facts(l) {
  const rows = [
    ['Категория', KINDS[l.kind]],
    ['Вид разрешённого использования', l.vri],
    ['Площадь', l.area && sot(l.area) + ' сот.'],
    ['Цена', l.price ? money(l.price) : 'По запросу'],
    ['Цена за сотку', perSot(l) && perSot(l) + ' тыс. ₽'],
    ['Район', l.district && (l.district === 'Санкт-Петербург' || l.district === 'Другой' ? l.district : l.district + ' район')],
    ['Расположение', l.place],
    ['До КАД', l.distKad && l.distKad + ' км'],
    ['Кадастровый номер', l.kn],
    ['Электричество', l.power],
    ['Газ', l.gas],
    ['Вода', l.water],
    ['Канализация', l.sewer],
    ['Подъезд', l.road],
  ].filter(([, v]) => v);
  return `<dl class="facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

export function detail(l) {
  const photos = (l.photos || []).map(photoUrl);
  const checks = Object.entries(CHECKS).filter(([k]) => l.checks && l.checks[k]);
  const desc = esc(l.description || '').split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  return `<article class="vd">
  <div class="vd__media">
    ${photos.length ? `<div class="gal" tabindex="0" aria-label="Фото участка">${photos.map((u, i) => `<img src="${esc(u)}" alt="${esc(l.title)}, фото ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} width="1200" height="800">`).join('')}</div>
    ${photos.length > 1 ? `<p class="gal__n">${photos.length} фото, листайте</p>` : ''}` : '<div class="gal gal--empty"><span>Фото появятся после осмотра</span></div>'}
    ${l.own ? '<p class="gal__n">Вид сверху - визуализация по генплану</p>' : ''}
  </div>
  <div class="vd__side">
    <p class="vc__badge vc__badge--static${l.own ? ' vc__badge--own' : ''}">${l.own ? 'Участок Инвест 47' : 'Проверено Инвест 47'}</p>
    <h1>${esc(l.title)}</h1>
    <p class="vd__price">${l.price ? money(l.price) : 'Цена по запросу'}</p>
    <p class="vd__place">${esc(l.place || '')}</p>
    <div class="row"><a class="btn" href="#zayavka">Узнать про участок</a><a class="btn btn--ghost" data-phone-link data-phone-only hidden href="#zayavka">Позвонить</a></div>
  </div>
  <div class="vd__body">
    <h2>Характеристики</h2>
    ${facts(l)}
    ${desc ? `<h2>Описание</h2><div class="vd__desc">${desc}</div>` : ''}
    ${checks.length ? `<h2>Что проверила Инвест 47</h2><ul class="checks">${checks.map(([, t]) => `<li>${t}</li>`).join('')}</ul>` : ''}
    ${l.note ? `<p class="vd__note"><b>Комментарий Инвест 47.</b> ${esc(l.note)}</p>` : ''}
  </div>
  <aside class="vd__form" id="zayavka">
    ${leadForm({ lot: l.title, lotId: l.id, title: 'Узнать про участок', text: 'Оставьте номер - перезвоним, расскажем про участок и договоримся о показе.' })}
  </aside>
</article>`;
}

export function listingLd(l) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: l.title,
    url: SITE.url + '/vitrina/' + l.slug,
    description: (l.description || '').slice(0, 300),
    image: (l.photos || []).filter((p) => p.startsWith('/')).map((p) => SITE.url + p).concat((l.photos || []).filter((p) => !p.startsWith('/')).map((p) => SITE.url + photoUrl(p))),
    datePosted: (l.publishedAt || '').slice(0, 10) || undefined,
    offers: { '@type': 'Offer', availability: 'https://schema.org/InStock', priceCurrency: 'RUB', ...(l.price ? { price: l.price } : {}), seller: { '@type': 'Organization', name: 'Инвест 47' } },
  };
}

/* Форма «перезвоните мне» - одна для главной, витрины и карточки участка */
export function leadForm({ lot = '', lotId = '', title = 'Оставьте номер - перезвоним', text = '' } = {}) {
  return `<form class="form" data-form="lead" novalidate>
  <h2 class="form__t">${esc(title)}</h2>
  ${text ? `<p class="form__p">${esc(text)}</p>` : ''}
  <input type="hidden" name="lot" value="${esc(lot)}"><input type="hidden" name="lotId" value="${esc(lotId)}">
  <label class="f"><span>Имя</span><input name="name" autocomplete="name" maxlength="80" required></label>
  <label class="f"><span>Телефон</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="+7" required></label>
  <label class="f"><span>Комментарий <i>необязательно</i></span><textarea name="message" rows="3" maxlength="1500" placeholder="Когда удобно позвонить, под какую задачу нужна земля"></textarea></label>
  <label class="hp" aria-hidden="true">Компания <input name="company" tabindex="-1" autocomplete="off"></label>
  <label class="chk"><input type="checkbox" name="consent" required><span>Даю согласие на <a href="/privacy" target="_blank">обработку персональных данных</a></span></label>
  <button class="btn" type="submit">Отправить</button>
  <p class="form__msg" role="status" aria-live="polite"></p>
</form>`;
}
