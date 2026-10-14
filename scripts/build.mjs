// Сборка статических страниц в public/: блог из content/blog/*.md, форма «Продать участок»,
// политика, админка, robots.txt, а также блоки главной (подвал, статьи, разметка для поиска).
// Запуск: npm run build  (после правки статей или lib/site.js)
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { page, crumbs, esc, footer, ORG_LD, SITE, callBlock } from '../lib/site.js';
import { OWN, slugify } from '../lib/listings.js';
import { OBJECTS } from '../lib/objects.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'public');
const write = (rel, s) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); console.log('  ' + rel); };
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const ruDate = (d) => { const [y, m, dd] = d.split('-').map(Number); return `${dd} ${MONTHS[m - 1]} ${y}`; };

/* ---------- блог ---------- */
const COVERS = fs.readdirSync(path.join(OUT, 'assets/img/blog')).filter((f) => f.endsWith('.webp')).sort();

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('нет frontmatter: ' + file);
  const meta = Object.fromEntries(m[1].split('\n').filter(Boolean).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  return { ...meta, slug: path.basename(file, '.md'), md: m[2].trim() };
}

function faqOf(md) {
  const i = md.search(/^## Частые вопросы\s*$/m);
  if (i < 0) return [];
  const part = md.slice(i).split('\n').slice(1).join('\n').split(/^## /m)[0];
  return part.split(/^### /m).slice(1).map((b) => {
    const [q, ...rest] = b.split('\n');
    return { q: q.trim(), a: marked.parseInline(rest.join(' ').trim()).replace(/<[^>]+>/g, '') };
  }).filter((x) => x.q && x.a);
}

const blogDir = path.join(ROOT, 'content/blog');
const posts = (fs.existsSync(blogDir) ? fs.readdirSync(blogDir) : []).filter((f) => f.endsWith('.md'))
  .map((f) => parse(path.join(blogDir, f))).sort((a, b) => b.date.localeCompare(a.date));
posts.forEach((p, i) => { p.cover = '/assets/img/blog/' + (p.cover || COVERS[i % COVERS.length]); });

const renderer = new marked.Renderer();
renderer.heading = function ({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  return `<h${depth} id="${slugify(text.replace(/<[^>]+>/g, ''))}">${text}</h${depth}>\n`;
};
renderer.table = function (t) { return '<div class="tbl">' + marked.Renderer.prototype.table.call(this, t) + '</div>'; };
renderer.link = function ({ href, tokens }) {
  const text = this.parser.parseInline(tokens);
  const ext = /^https?:/.test(href) && !href.startsWith(SITE.url);
  return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
};

const postCard = (p) => `<article class="bc">
  <a class="bc__img" href="/blog/${p.slug}" tabindex="-1" aria-hidden="true"><img src="${p.cover}" alt="" loading="lazy" width="800" height="450"></a>
  <p class="bc__d">${ruDate(p.date)} · ${p.mins} мин</p>
  <h3><a href="/blog/${p.slug}">${esc(p.title)}</a></h3>
  <p>${esc(p.description)}</p>
</article>`;

for (const p of posts) {
  p.html = marked.parse(p.md, { renderer, gfm: true });
  p.mins = Math.max(2, Math.round(p.md.split(/\s+/).length / 170));
  p.faq = faqOf(p.md);
  p.toc = [...p.md.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim()).filter((t) => t !== 'Частые вопросы');
}

for (const p of posts) {
  const c = crumbs([['/blog', 'Блог'], [null, p.title]]);
  const more = posts.filter((x) => x !== p).slice(0, 3);
  write(`blog/${p.slug}.html`, page({
    title: p.title + ' - Инвест 47', description: p.description, path: '/blog/' + p.slug, active: 'blog', type: 'article', image: p.cover,
    jsonld: [c.ld, {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description,
      datePublished: p.date, dateModified: p.date, image: SITE.url + p.cover, inLanguage: 'ru',
      author: { '@type': 'Organization', name: 'Инвест 47', url: SITE.url }, publisher: { '@type': 'Organization', name: 'Инвест 47', logo: { '@type': 'ImageObject', url: SITE.url + '/assets/img/logo.svg' } },
      mainEntityOfPage: SITE.url + '/blog/' + p.slug,
    }, p.faq.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null],
    body: `<article class="wrap post">
  ${c.html}
  <header class="post__h">
    <p class="bc__d">${ruDate(p.date)} · ${p.mins} мин чтения</p>
    <h1 class="h1">${esc(p.title)}</h1>
    <p class="lead">${esc(p.description)}</p>
  </header>
  <img class="post__cover" src="${p.cover}" alt="" width="1200" height="675" fetchpriority="high">
  <div class="post__grid">
    ${p.toc.length > 2 ? `<nav class="toc" aria-label="Содержание"><p class="eyebrow">Содержание</p><ol>${p.toc.map((t) => `<li><a href="#${slugify(t)}">${esc(t)}</a></li>`).join('')}</ol></nav>` : '<div></div>'}
    <div class="prose">${p.html}</div>
  </div>
  <aside class="post__cta">
    <div><p class="eyebrow">Инвест 47</p><h2 class="h2">Участки промназначения на Мурманском шоссе</h2><p>Свободны 3 участка из 11: 150 кВт, выезд на трассу Кола, без управляющей компании. Продаёт собственник.</p></div>
    <div class="row"><a class="btn" href="/#uchastki">Смотреть участки</a><a class="btn btn--ghost" href="/vitrina">Витрина участков</a></div>
  </aside>
</article>
${more.length ? `<section class="wrap"><header class="sec__h"><h2>Ещё в блоге</h2></header><div class="bgrid">${more.map(postCard).join('')}</div></section>` : ''}`,
  }));
}

{
  const c = crumbs([[null, 'Блог']]);
  write('blog/index.html', page({
    title: 'Блог о покупке и продаже земли в Ленобласти - Инвест 47',
    description: 'Практические статьи о земельных участках: промназначение и ВРИ, проверка участка перед покупкой, электричество, подъезд, сделка и регистрация.',
    path: '/blog', active: 'blog', jsonld: [c.ld],
    body: `<section class="wrap">
  ${c.html}
  <p class="eyebrow">Блог</p>
  <h1 class="h1">Земля без сюрпризов</h1>
  <p class="lead">Разбираем, как выбрать и проверить участок, что можно строить на земле промназначения и как пройти сделку без лишних рисков.</p>
  <div class="bgrid bgrid--all">${posts.map(postCard).join('')}</div>
</section>`,
  }));
}

fs.writeFileSync(path.join(ROOT, 'lib/blog-index.js'), '// создаётся scripts/build.mjs, не править руками\nexport default ' +
  JSON.stringify(posts.map((p) => ({ slug: p.slug, title: p.title, date: p.date })), null, 1) + ';\n');

/* ---------- «Продать участок»: только через звонок, сами посетители участки не добавляют ---------- */
{
  const c = crumbs([['/vitrina', 'Витрина'], [null, 'Продать участок']]);
  write('vitrina/podat.html', page({
    title: 'Продать земельный участок через витрину Инвест 47',
    description: 'Хотите продать участок в Ленинградской области через витрину Инвест 47? Позвоните: обсудим участок и условия, проверим документы, ВРИ, подъезд и коммуникации и опубликуем.',
    path: '/vitrina/podat', active: 'podat', jsonld: [c.ld],
    body: `<section class="wrap podat">
  ${c.html}
  <div class="podat__grid">
    <div class="podat__intro">
      <p class="eyebrow">Витрина Инвест 47</p>
      <h1 class="h1">Продать участок через витрину</h1>
      <p class="lead">На витрине только участки, которые мы согласовали с владельцем и проверили сами. Поэтому разместить участок самостоятельно нельзя: сначала позвоните нам.</p>
      <div class="row"><a class="btn" href="${SITE.tel}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>Позвонить ${SITE.phone}</a></div>
      <ol class="podat__steps">
        <li><b>Звонок</b>Рассказываете об участке, обсуждаем, подходит ли он для витрины и на каких условиях.</li>
        <li><b>Проверка</b>Смотрим выписку ЕГРН и собственника, категорию и ВРИ, границы, подъезд и коммуникации.</li>
        <li><b>Публикация</b>Сами готовим карточку участка и согласуем её с вами. Ваш телефон на сайте не показываем.</li>
        <li><b>Покупатели</b>Обращения приходят к нам, мы передаём их вам и помогаем довести сделку.</li>
      </ol>
      <h2 class="h2" style="margin-top:36px">Что подготовить к звонку</h2>
      <ul class="checks podat__list">
        <li>Кадастровый номер - без него проверку не начать</li>
        <li>Где участок: населённый пункт, шоссе и километр</li>
        <li>Площадь, категорию земли и ВРИ</li>
        <li>Цену, за которую готовы продать</li>
        <li>Что с электричеством, газом, водой и подъездом</li>
        <li>Фото участка и подъезда - пришлёте после разговора</li>
      </ul>
      <p class="podat__more">Подробнее о проверке - в статье <a href="/blog/kak-prodat-uchastok-cherez-vitrinu">«Как продать участок через витрину»</a>.</p>
    </div>
    <div class="podat__call">
      ${callBlock({ title: 'Позвоните, чтобы разместить участок', text: 'Обсудим участок и условия размещения.' })}
    </div>
  </div>
</section>`,
  }));
}


/* ---------- админка ---------- */
write('admin.html', page({
  title: 'Админка - Инвест 47', path: '/admin', noindex: true, bodyClass: 'is-admin',
  body: '<section class="wrap adm" id="adm"><noscript>Включите JavaScript</noscript></section>', scripts: ['/assets/js/admin.js'],
}));

/* ---------- 404 ---------- */
write('404.html', page({
  title: 'Страница не найдена - Инвест 47', path: '/404', noindex: true,
  body: `<section class="wrap"><h1 class="h1">Такой страницы нет</h1><p class="lead">Возможно, ссылка устарела. Начните с главной или загляните на витрину.</p><div class="row"><a class="btn" href="/">На главную</a><a class="btn btn--ghost" href="/vitrina">Витрина участков</a></div></section>`,
}));

write('robots.txt', `User-agent: *\nDisallow: /admin\nDisallow: /api/\nAllow: /api/img\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

/* ---------- главная: объекты ---------- */
// размер маленькой картинки объекта из заголовка webp (VP8 / VP8L / VP8X)
function objSize(name) {
  const b = fs.readFileSync(path.join(OUT, 'assets/img/obj', name + '-s.webp'));
  const t = b.toString('ascii', 12, 16);
  if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (t === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}
const objPrice = (o) => {
  const ps = (o.plots || []).filter((p) => p.price && !p.sold).map((p) => p.price);
  if (o.price) return o.price;
  if (!ps.length) return 'Цена по запросу';
  return 'от ' + String(Math.min(...ps) / 1e6).replace('.', ',') + ' млн ₽';
};
function objCard(o, i) {
  const [w, h] = objSize(o.img);
  return `<article class="oc" data-kind="${o.kind}" data-i="${i}">
  <button class="oc__img" type="button" data-open="${i}" aria-label="Подробнее: ${esc(o.title)}"><img src="/assets/img/obj/${o.img}-s.webp" alt="${esc(o.title)}, визуализация" loading="lazy" width="${w}" height="${h}"><span>${String(i + 1).padStart(2, '0')}</span></button>
  <p class="oc__k">${esc(o.type)}${o.road ? ' · ' + esc(o.road) : ''}</p>
  <h3><button type="button" data-open="${i}">${esc(o.title)}</button></h3>
  <p class="oc__row"><b>${esc(o.area)}</b><span>${esc(o.status)}</span></p>
  <p class="oc__p">${esc(objPrice(o))}</p>
</article>`;
}

/* ---------- главная: вставки между метками ---------- */
{
  const f = path.join(OUT, 'index.html');
  let s = fs.readFileSync(f, 'utf8');
  const put = (name, content) => {
    const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
    if (!re.test(s)) throw new Error('нет метки ' + name + ' в index.html');
    s = s.replace(re, `$1\n${content}\n$2`);
  };
  put('blog', posts.slice(0, 3).map(postCard).join('\n'));
  put('objects', OBJECTS.map(objCard).join('\n'));
  put('objdata', `<script type="application/json" id="objData">${JSON.stringify(OBJECTS.map((o, i) => {
    const w = objSize(o.img);
    return { ...o, n: i + 1, w: w[0], h: w[1], priceT: objPrice(o) };
  })).replace(/</g, '\\u003c')}</script>`);
  put('foot', footer());
  const faq = [...s.matchAll(/<details class="qa"><summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)]
    .map((m) => ({ q: m[1].replace(/<[^>]+>/g, '').trim(), a: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }));
  const ld = [
    ORG_LD,
    { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Свободные участки Инвест 47', itemListElement: OWN.map((l, i) => ({
      '@type': 'ListItem', position: i + 1, item: { '@type': 'RealEstateListing', name: l.title, url: SITE.url + '/vitrina/' + l.slug,
        offers: { '@type': 'Offer', priceCurrency: 'RUB', availability: 'https://schema.org/InStock', ...(l.price ? { price: l.price } : {}) } } })) },
    faq.length && { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
  ].filter(Boolean);
  put('ld', ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n'));
  fs.writeFileSync(f, s);
  console.log('  index.html (вставки)');
}
console.log(`готово: ${posts.length} статей`);
