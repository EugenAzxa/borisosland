// sitemap.xml: статические страницы, статьи блога и опубликованные участки витрины
import { SITE } from '../lib/site.js';
import { OWN } from '../lib/listings.js';
import { publicListings } from '../lib/store.js';
import blog from '../lib/blog-index.js';

export async function GET() {
  const pub = await publicListings().catch(() => []);
  const urls = [
    ['/', '1.0'], ['/vitrina', '0.9'], ['/vitrina/podat', '0.7'], ['/blog', '0.7'], ['/privacy', '0.2'],
    ...OWN.map((l) => ['/vitrina/' + l.slug, '0.8']),
    ...pub.map((l) => ['/vitrina/' + l.slug, '0.8', l.updatedAt]),
    ...blog.map((p) => ['/blog/' + p.slug, '0.6', p.date]),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, pr, d]) => `<url><loc>${SITE.url}${u}</loc>${d ? `<lastmod>${String(d).slice(0, 10)}</lastmod>` : ''}<priority>${pr}</priority></url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=3600' } });
}
