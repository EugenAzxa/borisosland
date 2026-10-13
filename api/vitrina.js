// Витрина: /vitrina - список, /vitrina/<slug> - страница участка. HTML собирается на сервере,
// чтобы участки индексировались поисковиками.
import { html } from '../lib/http.js';
import { page, crumbs, esc, money, sot, SITE, callBlock } from '../lib/site.js';
import { publicListings } from '../lib/store.js';
import { OWN, KINDS, card, detail, listingLd } from '../lib/listings.js';

async function items() {
  const pub = await publicListings().catch(() => []);
  return [...OWN, ...pub];
}

function slugFrom(req) {
  const u = new URL(req.url);
  const q = u.searchParams.get('slug');
  if (q) return q;
  const m = u.pathname.match(/^\/vitrina\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export async function GET(req) {
  const slug = slugFrom(req);
  const all = await items();

  if (slug) {
    const l = all.find((x) => x.slug === slug);
    if (!l) {
      const c = crumbs([['/vitrina', 'Витрина'], [null, 'Участок не найден']]);
      return html(page({
        title: 'Участок не найден - Инвест 47', path: '/vitrina/' + slug, noindex: true, active: 'vitrina',
        body: `<section class="wrap">${c.html}<h1 class="h1">Участок не найден</h1><p class="lead">Возможно, он уже продан или снят с публикации.</p><div class="row"><a class="btn" href="/vitrina">Все участки на витрине</a></div></section>`,
      }), 404, 'public, max-age=0, s-maxage=30');
    }
    const c = crumbs([['/vitrina', 'Витрина'], [null, l.title]]);
    const desc = `${KINDS[l.kind] || 'Участок'}, ${sot(l.area)} сот., ${l.price ? money(l.price) : 'цена по запросу'}. ${l.place || ''}. ${l.own ? 'Продаёт собственник Инвест 47.' : 'Проверено Инвест 47.'}`.replace(/ /g, ' ');
    const more = all.filter((x) => x.slug !== l.slug).slice(0, 3);
    return html(page({
      title: `${l.title} - ${l.own ? 'Инвест 47' : 'витрина Инвест 47'}`, description: desc.slice(0, 200), path: '/vitrina/' + l.slug, active: 'vitrina',
      image: l.photos && l.photos[0] ? (l.photos[0].startsWith('/') ? l.photos[0] : '/api/img?p=' + encodeURIComponent(l.photos[0])) : undefined,
      jsonld: [c.ld, listingLd(l)],
      body: `<section class="wrap">${c.html}${detail(l)}</section>
${more.length ? `<section class="wrap"><header class="sec__h"><h2>Другие участки на витрине</h2></header><div class="vgrid">${more.map(card).join('')}</div></section>` : ''}`,
    }));
  }

  const kinds = [...new Set(all.map((x) => x.kind))];
  const districts = [...new Set(all.map((x) => x.district).filter(Boolean))].sort();
  const c = crumbs([[null, 'Витрина']]);
  const body = `<section class="wrap vhero">
  ${c.html}
  <p class="eyebrow">Витрина Инвест 47</p>
  <h1 class="h1">Проверенные земельные участки в Ленинградской области</h1>
  <p class="lead">Здесь только участки, которые мы проверили сами: собственник и документы по ЕГРН, категория и ВРИ, подъезд и коммуникации. Наши участки на Мурманском шоссе и участки партнёров.</p>
  <div class="row"><a class="btn" href="#katalog">Смотреть участки</a><a class="btn btn--ghost" href="/vitrina/podat">Продать свой участок</a></div>
</section>
<section class="wrap" id="katalog">
  <div class="vfilter" role="group" aria-label="Фильтр">
    <div class="chips" data-filter="kind"><button type="button" class="is-on" data-v="">Все</button>${kinds.map((k) => `<button type="button" data-v="${esc(k)}">${esc(KINDS[k] || k)}</button>`).join('')}</div>
    <div class="vfilter__r">
      ${districts.length > 1 ? `<label class="sel"><span class="vh">Район</span><select data-filter="district"><option value="">Все районы</option>${districts.map((d) => `<option>${esc(d)}</option>`).join('')}</select></label>` : ''}
      <label class="sel"><span class="vh">Сортировка</span><select data-sort><option value="">Сначала новые</option><option value="price">Сначала дешевле</option><option value="-price">Сначала дороже</option><option value="-area">Сначала больше</option></select></label>
    </div>
  </div>
  <p class="vcount" aria-live="polite"><b>${all.length}</b> ${plural(all.length, 'участок', 'участка', 'участков')}</p>
  <div class="vgrid" id="vgrid">${all.map(card).join('')}</div>
  <p class="vempty" hidden>По этим условиям участков пока нет. <a href="#podbor">Позвоните</a> - подберём.</p>
</section>
<section class="wrap vhow">
  <header class="sec__h"><h2>Как участок попадает на витрину</h2></header>
  <ol class="steps">
    <li><span>1</span><h3>Звонок</h3><p>Собственник <a href="/vitrina/podat">звонит нам</a>, обсуждаем участок и условия. Сами добавить участок нельзя.</p></li>
    <li><span>2</span><h3>Проверка</h3><p>Смотрим выписку ЕГРН, категорию и ВРИ, границы, подъезд и коммуникации. Если нужно - выезжаем на место.</p></li>
    <li><span>3</span><h3>Публикация</h3><p>Карточку участка готовим сами. Публикуем только то, что подтвердилось, и отмечаем, что именно проверено.</p></li>
    <li><span>4</span><h3>Покупатель</h3><p>Обращения приходят к нам, мы связываем покупателя с собственником и помогаем со сделкой.</p></li>
  </ol>
</section>
<section class="wrap vlead" id="podbor">
  <div><p class="eyebrow">Подбор</p><h2 class="h2">Не нашли подходящий участок?</h2><p class="lead">Расскажите, под какую задачу нужна земля и где. Подберём из проверенных или из тех, что ещё готовятся к публикации.</p></div>
  ${callBlock({ title: 'Подобрать участок', text: 'Расскажите по телефону, что ищете.' })}
</section>`;
  return html(page({
    title: 'Витрина проверенных земельных участков в Ленобласти - Инвест 47',
    description: 'Земельные участки в Ленинградской области, проверенные Инвест 47: промназначение, коммерция, ИЖС. Документы, ВРИ, подъезд и коммуникации проверены до публикации.',
    path: '/vitrina', active: 'vitrina', jsonld: [c.ld, {
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'Витрина участков Инвест 47',
      itemListElement: all.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE.url + '/vitrina/' + l.slug, name: l.title })),
    }],
    body, scripts: ['/assets/js/vitrina.js'],
  }));
}

function plural(n, a, b, c) {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c;
}
