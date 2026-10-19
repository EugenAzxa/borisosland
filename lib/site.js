// Общая разметка страниц: шапка, подвал, <head>. Используется и сборкой (scripts/build.mjs),
// и функциями в /api (витрина, карточка участка), чтобы все страницы выглядели одинаково.

export const SITE = {
  name: 'Инвест 47',
  url: (process.env.SITE_URL || 'https://invest47.vercel.app').replace(/\/$/, ''),
  address: 'Ленинградская обл., Всеволожский р-н, Колтушское городское поселение, Мурманское шоссе, 6 км',
  phone: '+7 911 090-47-47',
  tel: 'tel:+79110904747',
};

const ASSET_V = '9'; // поднять, чтобы браузеры перезагрузили css/js

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const money = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, '\u00a0') + '\u00a0₽';

export const sot = (n) => String(n).replace('.', ',');

export const NAV = [
  ['/#obekty', 'Объекты', 'home'],
  ['/#uchastki', 'Участки у Колы', 'kola'],
  ['/vitrina', 'Витрина', 'vitrina'],
  ['/vitrina/podat', 'Продать участок', 'podat'],
  ['/blog', 'Блог', 'blog'],
  ['/#kontakty', 'Контакты', 'kontakty'],
];

export function header(active = '') {
  return `<header class="top is-solid" id="top">
  <a class="brand" href="/" aria-label="Инвест 47, на главную">
    <img src="/assets/img/logo.svg" alt="" width="40" height="40">
    <span class="brand__t"><b>Инвест 47</b><i>Земельные участки</i></span>
  </a>
  <nav class="nav" id="nav" aria-label="Разделы">
    ${NAV.map(([href, t, k]) => `<a href="${href}"${k === active ? ' aria-current="page"' : ''}>${t}</a>`).join('\n    ')}
  </nav>
  <a class="btn btn--sm" href="${SITE.tel}">Позвонить</a>
  <button class="burger" type="button" aria-label="Меню" aria-controls="nav" aria-expanded="false"><i></i><i></i></button>
</header>`;
}

export function footer() {
  return `<footer class="foot">
  <div class="foot__cols">
    <div>
      <p class="foot__brand"><img src="/assets/img/logo.svg" alt="" width="36" height="36"><b>Инвест 47</b></p>
      <p>Земля и коммерческая недвижимость в Ленинградской области, более 15 лет на рынке. ${esc(SITE.address)}.</p>
      <p><a class="foot__tel" href="${SITE.tel}">${SITE.phone}</a></p>
    </div>
    <nav aria-label="Карта сайта">
      <a href="/#obekty">Все объекты</a>
      <a href="/#uchastki">Участки у трассы Кола</a>
      <a href="/#o-kompanii">О компании</a>
      <a href="/vitrina">Витрина участков</a>
      <a href="/vitrina/podat">Продать свой участок</a>
    </nav>
    <nav aria-label="Ещё">
      <a href="/blog">Блог</a>
      <a href="/#kontakty">Контакты</a>
    </nav>
  </div>
  <p class="foot__s">Виды с высоты на главной - визуализация. Границы и площади участков - по генплану, точные данные в выписке ЕГРН. Информация на сайте не является публичной офертой. <a class="foot__adm" href="/admin" rel="nofollow">Вход для администратора</a></p>
</footer>`;
}

export function page({ title, description = '', path = '/', body, active = '', noindex = false, jsonld = [], image = '/assets/img/og.jpg', type = 'website', bodyClass = '', scripts = [] }) {
  const canonical = SITE.url + path;
  const ld = jsonld.filter(Boolean).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${esc(canonical)}">`}
<meta name="theme-color" content="#0b0d09">
<meta property="og:type" content="${type}">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="Инвест 47">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image.startsWith('http') ? image : SITE.url + image)}">
<link rel="icon" href="/assets/img/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Unbounded:wght@300;400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css?v=${ASSET_V}">
${ld}
</head>
<body class="inner ${bodyClass}">
${header(active)}
<main class="page">
${body}
</main>
${footer()}
<script src="/assets/js/site.js?v=${ASSET_V}"></script>
${scripts.map((s) => `<script src="${s}?v=${ASSET_V}"></script>`).join('\n')}
</body>
</html>
`;
}

/* Вместо форм на сайте - только звонок */
export function callBlock({ title = 'Позвоните нам', text = '', id = '' } = {}) {
  return `<div class="call"${id ? ` id="${id}"` : ''}>
  <h2 class="form__t">${esc(title)}</h2>
  ${text ? `<p class="form__p">${esc(text)}</p>` : ''}
  <a class="call__num" href="${SITE.tel}">${SITE.phone}</a>
  <a class="btn" href="${SITE.tel}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>Позвонить</a>
</div>`;
}

export function crumbs(items) {
  // items: [[href, title], ..., [null, current]]
  const html = `<nav class="crumbs" aria-label="Навигация"><a href="/">Главная</a>${items.map(([h, t]) => h ? ` <span>/</span> <a href="${h}">${esc(t)}</a>` : ` <span>/</span> <span aria-current="page">${esc(t)}</span>`).join('')}</nav>`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [['/', 'Главная'], ...items].map(([h, t], i) => ({ '@type': 'ListItem', position: i + 1, name: t, ...(h ? { item: SITE.url + h } : {}) })),
  };
  return { html, ld };
}

export const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  name: 'Инвест 47',
  description: 'Продажа земельных участков промназначения на Мурманском шоссе и витрина проверенных участков в Ленинградской области.',
  url: SITE.url,
  logo: SITE.url + '/assets/img/logo.svg',
  image: SITE.url + '/assets/img/og.jpg',
  address: { '@type': 'PostalAddress', addressCountry: 'RU', addressRegion: 'Ленинградская область', addressLocality: 'Всеволожский район', streetAddress: 'Мурманское шоссе, 6 км' },
  areaServed: 'Ленинградская область',
  telephone: '+79110904747',
};
