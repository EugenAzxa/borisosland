// Запасная копия сайта для обычного хостинга (reg.ru и любой другой с Apache) на случай блокировки Vercel.
// Всё лежит внутри: шрифты и three.js - свои файлы, с иностранных серверов ничего не грузится.
// Витрина и админка на PHP (scripts/ru): участки в _data/listings.json, фото в uploads/vitrina.
// В архиве: site/ - залить на хостинг, INSTRUKCIYA*.txt - как включить и пароль админки (на сайт не попадает).
//
// Запуск: npm run build && node scripts/export-ru.mjs
// Пишет ~/Desktop/invest47-reserv/ и ~/Desktop/invest47-reserv.zip; пароль админки сохраняется между выгрузками (_src/ru-admin.txt)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PUB = path.join(ROOT, 'public');
const SOURCE = process.env.SOURCE || 'https://invest47.vercel.app';   // откуда брать витрину
const DOMAIN = process.env.DOMAIN || 'https://xn--4747-f4dst4bzbk.xn--p1ai';
const BASE = path.join(os.homedir(), 'Desktop', 'invest47-reserv');
const OUT = path.join(BASE, 'site');
process.env.SITE_URL = DOMAIN;
const { page, callBlock, SITE } = await import('../lib/site.js');
const { OWN, KINDS, DISTRICTS, CHECKS } = await import('../lib/listings.js');
const blog = (await import('../lib/blog-index.js')).default;
const THREE = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const get = async (u, bin) => {
  const r = await fetch(u, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(r.status + ' ' + u);
  return bin ? Buffer.from(await r.arrayBuffer()) : r.text();
};
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

fs.rmSync(BASE, { recursive: true, force: true });
fs.cpSync(PUB, OUT, { recursive: true, filter: (f) => !/admin\.(html|js)$/.test(f) && !f.endsWith('.DS_Store') });
write('robots.txt', `User-agent: *\nDisallow: /admin\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
console.log('статика скопирована');

/* витрина и админка на PHP */
for (const f of fs.readdirSync(path.join(ROOT, 'scripts/ru'))) fs.copyFileSync(path.join(ROOT, 'scripts/ru', f), path.join(OUT, f));
write('_tpl/page.html', page({ title: '%%TITLE%%', description: '%%DESC%%', path: '%%PATH%%', image: '%%IMG%%', active: 'vitrina', body: '%%BODY%%', scripts: ['/assets/js/vitrina.js'] }));
write('_tpl/call-item.html', callBlock({ title: 'Узнать про участок', text: 'Позвоните - расскажем про участок и договоримся о показе.' }));
write('_tpl/call-list.html', callBlock({ title: 'Подобрать участок', text: 'Расскажите по телефону, что ищете.' }));
const now = new Date().toISOString();
write('_data/listings.json', JSON.stringify(OWN.map((l) => ({ ...l, status: 'approved', createdAt: now, updatedAt: now, publishedAt: now, checks: l.checks || {} })), null, 2));
write('_data/meta.json', JSON.stringify({
  site: { url: DOMAIN, phone: SITE.phone, tel: SITE.tel }, kinds: KINDS, districts: DISTRICTS, checks: CHECKS,
  static_urls: [['/', '1.0', ''], ['/vitrina/podat', '0.7', ''], ['/vitrina', '0.9', ''], ['/blog', '0.7', ''], ...blog.map((p) => ['/blog/' + p.slug, '0.6', p.date])],
}, null, 2));
// пароль админки: один и тот же между выгрузками, хранится вне git (_src)
const passFile = path.join(ROOT, '_src/ru-admin.txt');
if (!fs.existsSync(passFile)) {
  const w = ['Zemlya', 'Kola', 'Uchastok', 'Trassa', 'Les', 'Park'];
  fs.writeFileSync(passFile, w[crypto.randomInt(w.length)] + '-' + crypto.randomInt(1000, 9999) + '-' + crypto.randomBytes(3).toString('hex'));
}
const PASS = fs.readFileSync(passFile, 'utf8').trim();
const salt = crypto.randomBytes(12).toString('hex');
write('_data/config.php', `<?php\nreturn ['salt' => '${salt}', 'hash' => '${crypto.createHash('sha256').update(salt + PASS).digest('hex')}'];\n`);
for (const d of ['_data', '_tpl']) write(d + '/.htaccess', 'Require all denied\n');
write('uploads/vitrina/.htaccess', '<FilesMatch "\\.(php|phtml|phar|pl|py|cgi|sh)$">\n  Require all denied\n</FilesMatch>\n');
const live = await get(SOURCE + '/vitrina').catch(() => '');
const extra = [...new Set([...live.matchAll(/href="\/vitrina\/([a-z0-9-]+)"/g)].map((m) => m[1]))].filter((x) => x !== 'podat' && !OWN.some((o) => o.slug === x));
if (extra.length) console.log('ВНИМАНИЕ: на рабочем сайте есть участки партнёров, их нужно завести в админке копии вручную:', extra.join(', '));
console.log('витрина и админка на PHP');

/* three.js для глобуса */
write('assets/vendor/three.module.min.js', await get(THREE, true));
const oj = path.join(OUT, 'assets/js/objects.js');
fs.writeFileSync(oj, fs.readFileSync(oj, 'utf8').replace(THREE, '/assets/vendor/three.module.min.js'));

/* шрифты Google - свои файлы */
const home = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const fontHref = home.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/)[1].replace(/&amp;/g, '&');
let css = await get(fontHref);
let nf = 0;
for (const m of [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g))]) {
  const name = 'f' + (++nf) + '.woff2';
  write('assets/fonts/' + name, await get(m, true));
  css = css.split(m).join('/assets/fonts/' + name);
}
write('assets/fonts/fonts.css', css);
console.log('шрифты:', nf, 'файлов');

/* во всех страницах: свои шрифты, адрес домена */
for (const f of walk(OUT).filter((f) => /\.(html|xml|txt)$/.test(f))) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\n?/g, '')
    .replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]+" rel="stylesheet">/g, '<link href="/assets/fonts/fonts.css" rel="stylesheet">')
    .split(SOURCE).join(DOMAIN).split('https://invest47.vercel.app').join(DOMAIN);
  fs.writeFileSync(f, s);
}

/* Apache: адреса без .html, своя 404, кеш кадров */
write('.htaccess', `AddDefaultCharset utf-8
DirectoryIndex index.html
Options -MultiViews
DirectorySlash Off
ErrorDocument 404 /404.html

RewriteEngine On
# https и без www (кроме проверки на своём компьютере)
RewriteCond %{HTTP_HOST} !^(localhost|127\\.0\\.0\\.1)
RewriteCond %{HTTPS} !=on [OR]
RewriteCond %{HTTP_HOST} ^www\\. [NC]
RewriteRule ^ https://xn--4747-f4dst4bzbk.xn--p1ai%{REQUEST_URI} [L,R=301]
# /blog/статья -> /blog/статья.html, /vitrina -> /vitrina.html (есть и папка vitrina, поэтому без слеша на конце)
RewriteCond %{DOCUMENT_ROOT}/$1.html -f
RewriteRule ^(.+?)/?$ $1.html [L]
# /blog -> /blog/index.html
RewriteCond %{DOCUMENT_ROOT}/$1/index.html -f
RewriteRule ^(.+?)/?$ $1/index.html [L]
# витрина, админка и карта сайта - PHP; служебные файлы закрыты
RewriteCond %{ENV:REDIRECT_STATUS} ^$
RewriteRule ^(_lib|_v|_sitemap|admin)\\.php$ - [F]
RewriteRule ^vitrina/podat/?$ vitrina/podat.html [L]
RewriteRule ^vitrina/?$ _v.php [L,QSA]
RewriteRule ^vitrina/([a-z0-9-]+)/?$ _v.php?slug=$1 [L,QSA]
RewriteRule ^sitemap\\.xml$ _sitemap.php [L]
RewriteRule ^admin/?$ admin.php [L,QSA]
# /index.html и /blog/index.html -> / и /blog
RewriteCond %{THE_REQUEST} \\s/((?:[^?\\s]*/)?)index(?:\\.html)?[\\s?]
RewriteRule ^ /%1 [L,R=301]
# старые адреса .html -> без .html
RewriteCond %{THE_REQUEST} \\s/([^?\\s]+)\\.html[\\s?]
RewriteRule ^ /%1 [L,R=301]

AddType application/javascript .mjs
AddType font/woff2 .woff2
AddType image/webp .webp
<IfModule mod_headers.c>
  <FilesMatch "\\.(webp|woff2|jpg|png|svg)$">
    Header set Cache-Control "public, max-age=604800"
  </FilesMatch>
  Header always set X-Content-Type-Options "nosniff"
</IfModule>
`);

fs.writeFileSync(path.join(BASE, 'INSTRUKCIYA - kak vklyuchit i parol.txt'), `ЗАПАСНАЯ КОПИЯ САЙТА ИНВЕСТ 47 (выгружена ${new Date().toLocaleDateString('ru-RU')})

Когда нужна: если основной сайт (Vercel) перестанет открываться в России.
Что внутри: папка site - весь сайт для обычного хостинга с PHP (reg.ru и любой другой).
С иностранных серверов ничего не грузится. Этот файл на хостинг НЕ заливать - в нём пароль.


КАК ВКЛЮЧИТЬ

1. reg.ru -> Хостинг -> самый простой тариф для сайтов (Linux, PHP 8) -> подключить к домену инвест4747.рф.
2. Файловый менеджер хостинга -> папка сайта (обычно www/инвест4747.рф или public_html).
   Удалить оттуда всё, что положил хостинг, и загрузить СОДЕРЖИМОЕ папки site
   (index.html, admin.php и остальное должно лежать прямо в папке сайта, не во вложенной папке).
   Скрытые файлы .htaccess тоже должны загрузиться - проще залить архив и распаковать его в файловом менеджере.
3. Папкам _data и uploads дать права на запись (обычно 755 уже подходит).
4. reg.ru -> домен инвест4747.рф -> DNS-серверы -> вернуть ns1.hosting.reg.ru, ns2.hosting.reg.ru.
5. В панели хостинга включить бесплатный SSL-сертификат (Let's Encrypt) для домена.
6. Через 1-24 часа сайт откроется с хостинга reg.ru.

Обратно на основной сайт: вернуть DNS-серверы ns1.vercel-dns.com, ns2.vercel-dns.com.
Участки, добавленные в админке копии, на основной сайт сами не переедут - их нужно завести там заново.


АДМИНКА: КАК ДОБАВИТЬ ИЛИ ИЗМЕНИТЬ УЧАСТОК

Вход: внизу любой страницы сайта ссылка «Вход для администратора» (или адрес инвест4747.рф/admin).
Пароль: ${PASS}

1. «Добавить участок» - появится форма нового участка.
2. Заполнить: название, площадь в сотках, цену в рублях (пусто - на сайте будет «Цена по запросу»),
   категорию, район, где находится, кадастровый номер, коммуникации, описание.
3. Фото: «Добавить фото» - можно выбрать несколько сразу (JPG, PNG, WEBP; фото с телефона подходят,
   сайт сам уменьшит их). Первое фото - обложка; другую обложку можно выбрать отметкой «Обложка».
   Отметка «Убрать» удаляет фото при сохранении.
4. Отметить, что проверено (документы, ВРИ, подъезд и т.д.) - это видно покупателю.
5. Статус «Опубликован» и «Сохранить». Участок сразу появится на странице «Витрина».
   «Черновик» - участок сохранён, но на сайте не виден. «Снят с публикации» - для проданных.
6. Изменить цену или описание: открыть участок в списке, поправить, «Сохранить».

Сменить пароль админки: попросить разработчика перевыгрузить копию с новым паролем.
`);
console.log('готово:', OUT);

const zip = BASE + '.zip';
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, '.'], { cwd: BASE });
console.log('архив:', zip, Math.round(fs.statSync(zip).size / 1048576) + ' МБ');
