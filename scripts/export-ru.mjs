// Запасная копия сайта для обычного хостинга (reg.ru и любой другой с Apache) на случай блокировки Vercel.
// Всё лежит внутри: витрина - готовые страницы, фото участков, шрифты и three.js - свои файлы,
// с иностранных серверов ничего не грузится. Админки нет: витрина застывает на момент выгрузки.
//
// Запуск: npm run build && node scripts/export-ru.mjs
// Пишет ~/Desktop/invest47-reserv/ и ~/Desktop/invest47-reserv.zip
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PUB = path.join(ROOT, 'public');
const SOURCE = process.env.SOURCE || 'https://invest47.vercel.app';   // откуда брать витрину
const DOMAIN = process.env.DOMAIN || 'https://xn--4747-f4dst4bzbk.xn--p1ai';
const OUT = path.join(os.homedir(), 'Desktop', 'invest47-reserv');
const THREE = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const get = async (u, bin) => {
  const r = await fetch(u, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(r.status + ' ' + u);
  return bin ? Buffer.from(await r.arrayBuffer()) : r.text();
};
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(PUB, OUT, { recursive: true, filter: (f) => !/admin\.(html|js)$/.test(f) && !f.endsWith('.DS_Store') });
write('robots.txt', `User-agent: *\nDisallow: /admin\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
console.log('статика скопирована');

/* витрина: список и страницы участков с рабочего сайта, фото из хранилища - в файлы */
const photos = new Map();
async function localPhotos(html) {
  for (const m of html.matchAll(/\/api\/img\?p=([^"'\s<)]+)/g)) {
    const key = m[0];
    if (photos.has(key)) continue;
    const p = decodeURIComponent(m[1].replace(/&amp;/g, '&'));
    const ext = (p.match(/\.(\w+)$/) || [, 'jpg'])[1];
    const name = '/assets/img/vitrina/' + crypto.createHash('sha1').update(p).digest('hex').slice(0, 16) + '.' + ext;
    write(name, await get(SOURCE + key.replace(/&amp;/g, '&'), true));
    photos.set(key, name);
  }
  for (const [k, v] of photos) html = html.split(k).join(v);
  return html;
}
const list = await get(SOURCE + '/vitrina');
write('vitrina.html', await localPhotos(list));
const slugs = [...new Set([...list.matchAll(/href="\/vitrina\/([a-z0-9-]+)"/g)].map((m) => m[1]).filter((s) => s !== 'podat'))];
for (const s of slugs) write('vitrina/' + s + '.html', await localPhotos(await get(SOURCE + '/vitrina/' + s)));
console.log('витрина:', slugs.length, 'участков,', photos.size, 'фото');
write('sitemap.xml', await get(SOURCE + '/sitemap.xml'));

/* three.js для глобуса */
write('assets/vendor/three.module.min.js', await get(THREE, true));
const oj = path.join(OUT, 'assets/js/objects.js');
fs.writeFileSync(oj, fs.readFileSync(oj, 'utf8').replace(THREE, '/assets/vendor/three.module.min.js'));

/* шрифты Google - свои файлы */
const page = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const fontHref = page.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/)[1].replace(/&amp;/g, '&');
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
# /index.html и /blog/index.html -> / и /blog
RewriteCond %{THE_REQUEST} \\s/((?:[^?\\s]*/)?)index(?:\\.html)?[\\s?]
RewriteRule ^ /%1 [L,R=301]
# старые адреса .html -> без .html
RewriteCond %{THE_REQUEST} \\s/([^?\\s]+)\\.html[\\s?]
RewriteRule ^ /%1 [L,R=301]
RewriteRule ^admin/?$ - [G]

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

write('КАК-ЗАЛИТЬ.txt', `ЗАПАСНАЯ КОПИЯ САЙТА ИНВЕСТ 47 (выгружена ${new Date().toLocaleDateString('ru-RU')})

Когда нужна: если сайт на Vercel перестанет открываться в России.
Что внутри: весь сайт обычными файлами. Ничего не грузится с иностранных серверов.
Чего нет: админки. Витрина - снимок на день выгрузки; новые участки добавить через копию нельзя.

Как включить:
1. reg.ru -> Хостинг (тариф для сайтов, Linux, любой самый простой) -> подключить к домену инвест4747.рф.
2. Файловый менеджер хостинга -> папка сайта (обычно www/инвест4747.рф или public_html).
   Удалить оттуда всё, что положил хостинг, и загрузить СОДЕРЖИМОЕ этой папки
   (index.html и остальное должно лежать прямо в папке сайта, не во вложенной папке).
   Файл .htaccess скрытый - убедитесь, что он тоже загрузился.
3. reg.ru -> домен инвест4747.рф -> DNS-серверы -> вернуть ns1.hosting.reg.ru, ns2.hosting.reg.ru.
4. В панели хостинга включить бесплатный SSL-сертификат (Let's Encrypt) для домена.
5. Через 1-24 часа сайт откроется с хостинга reg.ru.

Обратно на Vercel: вернуть DNS-серверы ns1.vercel-dns.com, ns2.vercel-dns.com.
`);
console.log('готово:', OUT);

const zip = OUT + '.zip';
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-qr', zip, '.'], { cwd: OUT });
console.log('архив:', zip, Math.round(fs.statSync(zip).size / 1048576) + ' МБ');
