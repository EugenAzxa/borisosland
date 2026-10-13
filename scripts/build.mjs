// Сборка статических страниц в public/: блог из content/blog/*.md, форма «Продать участок»,
// политика, админка, robots.txt, а также блоки главной (подвал, статьи, разметка для поиска).
// Запуск: npm run build  (после правки статей или lib/site.js)
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { page, crumbs, esc, footer, ORG_LD, SITE } from '../lib/site.js';
import { KINDS, DISTRICTS, OWN, slugify } from '../lib/listings.js';

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

/* ---------- форма «Продать участок» ---------- */
{
  const c = crumbs([['/vitrina', 'Витрина'], [null, 'Разместить участок']]);
  const opt = (o) => Object.entries(o).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  write('vitrina/podat.html', page({
    title: 'Продать земельный участок через витрину Инвест 47 - подать заявку',
    description: 'Разместите свой земельный участок в Ленинградской области на витрине Инвест 47. Проверяем документы, ВРИ, подъезд и коммуникации и публикуем только проверенные участки.',
    path: '/vitrina/podat', active: 'podat', jsonld: [c.ld],
    body: `<section class="wrap podat">
  ${c.html}
  <div class="podat__grid">
    <div class="podat__intro">
      <p class="eyebrow">Витрина Инвест 47</p>
      <h1 class="h1">Разместить свой участок</h1>
      <p class="lead">Заполните заявку - мы проверим участок и документы. Если всё подтвердится, опубликуем его на витрине с отметкой «Проверено Инвест 47», а обращения покупателей передадим вам.</p>
      <ol class="podat__steps">
        <li><b>Проверяем</b>выписку ЕГРН и собственника, категорию и ВРИ, границы, подъезд, коммуникации.</li>
        <li><b>Публикуем</b>только то, что подтвердилось. Ваш телефон на сайте не показываем.</li>
        <li><b>Передаём покупателей</b>и помогаем довести сделку. Условия обсудим после проверки участка.</li>
      </ol>
      <p class="podat__more">Подробнее о проверке - в статье <a href="/blog/kak-prodat-uchastok-cherez-vitrinu">«Как продать участок через витрину»</a>.</p>
    </div>
    <form class="form form--big" data-form="listing" novalidate>
      <fieldset><legend>Участок</legend>
        <div class="f2">
          <label class="f"><span>Категория земли</span><select name="kind" required><option value="">Выберите</option>${opt(KINDS)}</select></label>
          <label class="f"><span>ВРИ <i>если знаете</i></span><input name="vri" maxlength="200" placeholder="Например, склады 6.9"></label>
        </div>
        <div class="f3">
          <label class="f"><span>Площадь, сот.</span><input name="area" inputmode="decimal" required placeholder="20"></label>
          <label class="f"><span>Цена, ₽</span><input name="price" inputmode="numeric" required placeholder="5 000 000"></label>
          <label class="f"><span>До КАД, км <i>примерно</i></span><input name="distKad" inputmode="decimal"></label>
        </div>
        <div class="f2">
          <label class="f"><span>Район</span><select name="district" required><option value="">Выберите</option>${DISTRICTS.map((d) => `<option>${d}</option>`).join('')}</select></label>
          <label class="f"><span>Где находится</span><input name="place" maxlength="200" required placeholder="Посёлок, шоссе и км, ориентир"></label>
        </div>
        <label class="f"><span>Кадастровый номер <i>ускорит проверку</i></span><input name="kn" maxlength="200" placeholder="47:07:0000000:000"></label>
      </fieldset>
      <fieldset><legend>Коммуникации и подъезд</legend>
        <div class="f2">
          <label class="f"><span>Электричество</span><input name="power" maxlength="120" placeholder="Например, 15 кВт подключено"></label>
          <label class="f"><span>Газ</span><input name="gas" maxlength="120" placeholder="Есть / по границе / нет"></label>
          <label class="f"><span>Вода</span><input name="water" maxlength="120" placeholder="Скважина, центральная"></label>
          <label class="f"><span>Канализация</span><input name="sewer" maxlength="120"></label>
        </div>
        <label class="f"><span>Подъезд</span><input name="road" maxlength="160" placeholder="Асфальт до участка, круглый год"></label>
        <label class="f"><span>Описание</span><textarea name="description" rows="5" maxlength="4000" placeholder="Что рядом, рельеф, что уже есть на участке, почему продаёте"></textarea></label>
      </fieldset>
      <fieldset><legend>Фото</legend>
        <div class="ph">
          <label class="ph__add"><input type="file" accept="image/*" multiple><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Добавить фото</span></label>
          <ul class="ph__list"></ul>
        </div>
        <p class="ph__n">До 10 фото</p>
      </fieldset>
      <fieldset><legend>Контакты <i>на сайте не показываем</i></legend>
        <div class="f2">
          <label class="f"><span>Имя</span><input name="name" autocomplete="name" maxlength="80" required></label>
          <label class="f"><span>Телефон</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="+7" required></label>
          <label class="f"><span>Почта <i>необязательно</i></span><input name="email" type="email" autocomplete="email" maxlength="120"></label>
          <label class="f"><span>Кто вы</span><select name="role"><option>Собственник</option><option>Представитель собственника</option><option>Агент</option></select></label>
        </div>
      </fieldset>
      <label class="hp" aria-hidden="true">Компания <input name="company" tabindex="-1" autocomplete="off"></label>
      <label class="chk"><input type="checkbox" name="consent" required><span>Даю согласие на <a href="/privacy" target="_blank">обработку персональных данных</a></span></label>
      <button class="btn" type="submit">Отправить на проверку</button>
      <p class="form__msg" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>`,
  }));
}

/* ---------- политика конфиденциальности ---------- */
write('privacy.html', page({
  title: 'Политика обработки персональных данных - Инвест 47', description: 'Как Инвест 47 обрабатывает персональные данные, которые вы оставляете в формах на сайте.',
  path: '/privacy',
  body: `<article class="wrap post"><div class="prose prose--solo">
<h1 class="h1">Политика обработки персональных данных</h1>
<p>Эта политика описывает, какие персональные данные собирает сайт «Инвест 47» (далее - оператор), зачем и как они обрабатываются. Политика составлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».</p>
<h2>Какие данные мы получаем</h2>
<ul><li>имя;</li><li>номер телефона;</li><li>адрес электронной почты, если вы его указали;</li><li>сведения об участке и фотографии, которые вы прикладываете к заявке на витрину;</li><li>текст комментария.</li></ul>
<p>Данные вы передаёте сами, заполняя формы на сайте. Мы не просим и не обрабатываем специальные категории персональных данных.</p>
<h2>Зачем</h2>
<ul><li>чтобы перезвонить вам и ответить на вопрос об участке;</li><li>чтобы проверить участок, который вы предлагаете разместить на витрине, и связаться с вами по нему;</li><li>чтобы передать вам обращения покупателей по вашему участку.</li></ul>
<h2>Как обрабатываются данные</h2>
<p>Данные хранятся в защищённом хранилище, доступ к ним есть только у сотрудников оператора. Контакты владельцев участков на витрине не публикуются. Мы не продаём и не передаём ваши данные третьим лицам, кроме случаев, предусмотренных законом.</p>
<p>Данные хранятся до достижения целей обработки или до отзыва согласия.</p>
<h2>Согласие и его отзыв</h2>
<p>Отправляя форму и отмечая согласие, вы соглашаетесь на обработку указанных данных для перечисленных целей. Согласие можно отозвать в любой момент: напишите или позвоните нам через раздел <a href="/#kontakty">«Контакты»</a>, и мы удалим ваши данные.</p>
<h2>Файлы cookie и статистика</h2>
<p>Сайт может использовать сервисы веб-аналитики, чтобы понимать, какие страницы полезны посетителям. Эти сервисы работают с обезличенными данными.</p>
<h2>Изменения</h2>
<p>Оператор может обновлять эту политику. Актуальная версия всегда опубликована на этой странице.</p>
</div></article>`,
}));

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
