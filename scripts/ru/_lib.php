<?php
// Запасная копия: общие функции витрины и админки. Данные - _data/listings.json, шаблон страницы - _tpl/page.html.
// Разметка карточек повторяет lib/listings.js основного сайта.
declare(strict_types=1);
mb_internal_encoding('UTF-8');

const DATA = __DIR__ . '/_data';
const UPLOADS = __DIR__ . '/uploads/vitrina';

function meta(): array { static $m; return $m ??= json_decode(file_get_contents(DATA . '/meta.json'), true); }
function site(string $k) { return meta()['site'][$k]; }

function e($s): string { return htmlspecialchars((string)($s ?? ''), ENT_QUOTES, 'UTF-8'); }
function sot($n): string { return str_replace('.', ',', rtrim(rtrim(number_format((float)$n, 2, '.', ''), '0'), '.')); }
function money($n): string { return str_replace(' ', "\u{00a0}", number_format((float)$n, 0, '', ' ')) . "\u{00a0}₽"; }
function per_sot(array $l): ?int { return !empty($l['price']) && !empty($l['area']) ? (int)round($l['price'] / $l['area'] / 1000) : null; }
function district_label(string $d): string { return in_array($d, ['Санкт-Петербург', 'Другой'], true) ? $d : $d . ' р-н'; }

/* ---------- данные ---------- */
function listings(): array {
  $f = DATA . '/listings.json';
  return is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : [];
}
function save_listings(array $all): void {
  $f = DATA . '/listings.json';
  $tmp = $f . '.tmp';
  file_put_contents($tmp, json_encode(array_values($all), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
  rename($tmp, $f);
}
function published(): array {
  $l = array_values(array_filter(listings(), fn($x) => ($x['status'] ?? '') === 'approved'));
  // свои участки Инвест 47 первыми, дальше - сначала новые
  usort($l, fn($a, $b) => [!empty($b['own']), $b['publishedAt'] ?? ''] <=> [!empty($a['own']), $a['publishedAt'] ?? '']);
  return $l;
}

function slugify(string $s): string {
  $tr = ['а'=>'a','б'=>'b','в'=>'v','г'=>'g','д'=>'d','е'=>'e','ё'=>'e','ж'=>'zh','з'=>'z','и'=>'i','й'=>'y','к'=>'k','л'=>'l','м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r','с'=>'s','т'=>'t','у'=>'u','ф'=>'f','х'=>'h','ц'=>'ts','ч'=>'ch','ш'=>'sh','щ'=>'sch','ъ'=>'','ы'=>'y','ь'=>'','э'=>'e','ю'=>'yu','я'=>'ya'];
  $s = strtr(mb_strtolower($s), $tr);
  $s = trim((string)preg_replace('/[^a-z0-9]+/', '-', $s), '-');
  return substr($s, 0, 60);
}

/* ---------- разметка ---------- */
function card(array $l): string {
  $ph = $l['photos'][0] ?? null;
  $ps = per_sot($l);
  $kinds = meta()['kinds'];
  $tags = array_filter([!empty($l['power']) ? 'Электричество' : null, !empty($l['gas']) ? 'Газ' : null, !empty($l['water']) ? 'Вода' : null, !empty($l['road']) ? 'Подъезд' : null]);
  $own = !empty($l['own']);
  $url = '/vitrina/' . e($l['slug']);
  return '<article class="vc" data-kind="' . e($l['kind']) . '" data-district="' . e($l['district'] ?? '') . '" data-area="' . (float)($l['area'] ?: 0) . '" data-price="' . (float)($l['price'] ?: 0) . '" data-date="' . e($l['publishedAt'] ?? '') . '">
  <a class="vc__img" href="' . $url . '" tabindex="-1" aria-hidden="true">
    ' . ($ph ? '<img src="' . e($ph) . '" alt="" loading="lazy" width="600" height="400">' : '<span class="vc__noimg"></span>') . '
    <span class="vc__badge' . ($own ? ' vc__badge--own' : '') . '">' . ($own ? 'Участок Инвест 47' : 'Проверено Инвест 47') . '</span>
  </a>
  <div class="vc__b">
    <p class="vc__k">' . e($kinds[$l['kind']] ?? 'Участок') . (!empty($l['district']) ? ' · ' . e(district_label($l['district'])) : '') . '</p>
    <h3><a href="' . $url . '">' . e($l['title']) . '</a></h3>
    <p class="vc__place">' . e($l['place'] ?? '') . '</p>
    <p class="vc__row"><b>' . sot($l['area']) . '<small> сот.</small></b><span>' . (!empty($l['price']) ? money($l['price']) . ($ps ? '<small>' . $ps . ' тыс. ₽ / сот.</small>' : '') : 'Цена по запросу') . '</span></p>
    ' . ($tags ? '<p class="vc__tags">' . implode('', array_map(fn($t) => '<span>' . $t . '</span>', $tags)) . '</p>' : '') . '
  </div>
</article>';
}

function detail(array $l): string {
  $kinds = meta()['kinds'];
  $rows = array_filter([
    ['Категория', $l['category'] ?? ($kinds[$l['kind']] ?? '')],
    ['Вид разрешённого использования', $l['vri'] ?? ''],
    ['Площадь', !empty($l['area']) ? sot($l['area']) . ' сот.' : ''],
    ['Цена', !empty($l['price']) ? money($l['price']) : 'По запросу'],
    ['Цена за сотку', per_sot($l) ? per_sot($l) . ' тыс. ₽' : ''],
    ['Район', !empty($l['district']) ? (in_array($l['district'], ['Санкт-Петербург', 'Другой'], true) ? $l['district'] : $l['district'] . ' район') : ''],
    ['Расположение', $l['place'] ?? ''],
    ['До КАД', !empty($l['distKad']) ? $l['distKad'] . ' км' : ''],
    ['Кадастровый номер', $l['kn'] ?? ''],
    ['Электричество', $l['power'] ?? ''], ['Газ', $l['gas'] ?? ''], ['Вода', $l['water'] ?? ''], ['Канализация', $l['sewer'] ?? ''], ['Подъезд', $l['road'] ?? ''],
  ], fn($r) => $r[1] !== '' && $r[1] !== null);
  $photos = $l['photos'] ?? [];
  $own = !empty($l['own']);
  $desc = implode('', array_map(fn($p) => '<p>' . nl2br(e($p), false) . '</p>', preg_split('/\n{2,}/', trim((string)($l['description'] ?? ''))) ?: []));
  $checks = array_filter(meta()['checks'], fn($k) => !empty($l['checks'][$k]), ARRAY_FILTER_USE_KEY);
  $gal = $photos
    ? '<div class="gal" tabindex="0" aria-label="Фото участка">' . implode('', array_map(fn($u, $i) => '<img src="' . e($u) . '" alt="' . e($l['title']) . ', фото ' . ($i + 1) . '" ' . ($i ? 'loading="lazy"' : 'fetchpriority="high"') . ' width="1200" height="800">', $photos, array_keys($photos))) . '</div>'
      . (count($photos) > 1 ? '<p class="gal__n">' . count($photos) . ' фото, листайте</p>' : '')
    : '<div class="gal gal--empty"><span>Фото появятся после осмотра</span></div>';
  return '<article class="vd">
  <div class="vd__media">' . $gal . ($own ? '<p class="gal__n">Вид сверху - визуализация по генплану</p>' : '') . '</div>
  <div class="vd__side">
    <p class="vc__badge vc__badge--static' . ($own ? ' vc__badge--own' : '') . '">' . ($own ? 'Участок Инвест 47' : 'Проверено Инвест 47') . '</p>
    <h1>' . e($l['title']) . '</h1>
    <p class="vd__price">' . (!empty($l['price']) ? money($l['price']) : 'Цена по запросу') . '</p>
    <p class="vd__place">' . e($l['place'] ?? '') . '</p>
    <div class="row"><a class="btn" href="' . e(site('tel')) . '">Позвонить ' . e(site('phone')) . '</a></div>
  </div>
  <div class="vd__body">
    <h2>Характеристики</h2>
    <dl class="facts">' . implode('', array_map(fn($r) => '<div><dt>' . $r[0] . '</dt><dd>' . e($r[1]) . '</dd></div>', $rows)) . '</dl>
    ' . ($desc ? '<h2>Описание</h2><div class="vd__desc">' . $desc . '</div>' : '') . '
    ' . ($checks ? '<h2>Что проверила Инвест 47</h2><ul class="checks">' . implode('', array_map(fn($t) => '<li>' . e($t) . '</li>', $checks)) . '</ul>' : '') . '
    ' . (!empty($l['note']) ? '<p class="vd__note"><b>Комментарий Инвест 47.</b> ' . e($l['note']) . '</p>' : '') . '
  </div>
  <aside class="vd__form">' . file_get_contents(__DIR__ . '/_tpl/call-item.html') . '</aside>
</article>';
}

function crumbs(array $items): string {
  $h = '<nav class="crumbs" aria-label="Навигация"><a href="/">Главная</a>';
  foreach ($items as [$href, $t]) $h .= $href ? ' <span>/</span> <a href="' . e($href) . '">' . e($t) . '</a>' : ' <span>/</span> <span aria-current="page">' . e($t) . '</span>';
  return $h . '</nav>';
}

function ld(array $o): string { return '<script type="application/ld+json">' . str_replace('<', '<', json_encode($o, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . '</script>'; }

function page(array $p): string {
  $t = file_get_contents(__DIR__ . '/_tpl/page.html');
  $img = $p['image'] ?? '/assets/img/og.jpg';
  $out = strtr($t, [
    '%%TITLE%%' => e($p['title']), '%%DESC%%' => e($p['description'] ?? ''), '%%PATH%%' => e($p['path']), '%%IMG%%' => e($img),
    '%%BODY%%' => ($p['ld'] ?? '') . $p['body'],
  ]);
  if (!empty($p['noindex'])) $out = preg_replace('/<link rel="canonical"[^>]*>/', '<meta name="robots" content="noindex, nofollow">', $out, 1);
  return $out;
}

function send_html(string $html, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: no-cache');
  echo $html;
}
