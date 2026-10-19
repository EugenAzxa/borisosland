<?php
// Витрина в запасной копии: /vitrina - список, /vitrina/<slug> - страница участка (адреса задаёт .htaccess)
require __DIR__ . '/_lib.php';

$all = published();
$slug = isset($_GET['slug']) ? preg_replace('/[^a-z0-9-]/', '', (string)$_GET['slug']) : '';
$url = site('url');

if ($slug !== '') {
  $l = null;
  foreach ($all as $x) if ($x['slug'] === $slug) { $l = $x; break; }
  if (!$l) {
    send_html(page(['title' => 'Участок не найден - Инвест 47', 'path' => '/vitrina/' . $slug, 'noindex' => true,
      'body' => '<section class="wrap">' . crumbs([['/vitrina', 'Витрина'], [null, 'Участок не найден']]) . '<h1 class="h1">Участок не найден</h1><p class="lead">Возможно, он уже продан или снят с публикации.</p><div class="row"><a class="btn" href="/vitrina">Все участки на витрине</a></div></section>']), 404);
    exit;
  }
  $kinds = meta()['kinds'];
  $desc = ($kinds[$l['kind']] ?? 'Участок') . ', ' . sot($l['area']) . ' сот., ' . (!empty($l['price']) ? money($l['price']) : 'цена по запросу') . '. ' . ($l['place'] ?? '') . '. ' . (!empty($l['own']) ? 'Продаёт собственник Инвест 47.' : 'Проверено Инвест 47.');
  $more = array_slice(array_values(array_filter($all, fn($x) => $x['slug'] !== $slug)), 0, 3);
  $offer = ['@type' => 'Offer', 'availability' => 'https://schema.org/InStock', 'priceCurrency' => 'RUB', 'seller' => ['@type' => 'Organization', 'name' => 'Инвест 47']];
  if (!empty($l['price'])) $offer['price'] = $l['price'];
  send_html(page([
    'title' => $l['title'] . ' - ' . (!empty($l['own']) ? 'Инвест 47' : 'витрина Инвест 47'),
    'description' => mb_substr($desc, 0, 200), 'path' => '/vitrina/' . $l['slug'], 'image' => $l['photos'][0] ?? '/assets/img/og.jpg',
    'ld' => ld(['@context' => 'https://schema.org', '@type' => 'RealEstateListing', 'name' => $l['title'], 'url' => $url . '/vitrina/' . $l['slug'],
      'description' => mb_substr((string)($l['description'] ?? ''), 0, 300), 'image' => array_map(fn($p) => $url . $p, $l['photos'] ?? []), 'offers' => $offer]),
    'body' => '<section class="wrap">' . crumbs([['/vitrina', 'Витрина'], [null, $l['title']]]) . detail($l) . '</section>'
      . ($more ? '<section class="wrap"><header class="sec__h"><h2>Другие участки на витрине</h2></header><div class="vgrid">' . implode('', array_map('card', $more)) . '</div></section>' : ''),
  ]));
  exit;
}

function plural(int $n, string $a, string $b, string $c): string {
  $m10 = $n % 10; $m100 = $n % 100;
  return $m10 === 1 && $m100 !== 11 ? $a : ($m10 >= 2 && $m10 <= 4 && ($m100 < 10 || $m100 >= 20) ? $b : $c);
}
$kinds = meta()['kinds'];
$used = array_values(array_unique(array_column($all, 'kind')));
$districts = array_values(array_unique(array_filter(array_column($all, 'district'))));
sort($districts);
$n = count($all);
$body = '<section class="wrap vhero">
  ' . crumbs([[null, 'Витрина']]) . '
  <p class="eyebrow">Витрина Инвест 47</p>
  <h1 class="h1">Проверенные земельные участки в Ленинградской области</h1>
  <p class="lead">Здесь только участки, которые мы проверили сами: собственник и документы по ЕГРН, категория и ВРИ, подъезд и коммуникации. Наши участки на Мурманском шоссе и участки партнёров.</p>
  <div class="row"><a class="btn" href="#katalog">Смотреть участки</a><a class="btn btn--ghost" href="/vitrina/podat">Продать свой участок</a></div>
</section>
<section class="wrap" id="katalog">
  <div class="vfilter" role="group" aria-label="Фильтр">
    <div class="chips" data-filter="kind"><button type="button" class="is-on" data-v="">Все</button>' . implode('', array_map(fn($k) => '<button type="button" data-v="' . e($k) . '">' . e($kinds[$k] ?? $k) . '</button>', $used)) . '</div>
    <div class="vfilter__r">
      ' . (count($districts) > 1 ? '<label class="sel"><span class="vh">Район</span><select data-filter="district"><option value="">Все районы</option>' . implode('', array_map(fn($d) => '<option>' . e($d) . '</option>', $districts)) . '</select></label>' : '') . '
      <label class="sel"><span class="vh">Сортировка</span><select data-sort><option value="">Сначала новые</option><option value="price">Сначала дешевле</option><option value="-price">Сначала дороже</option><option value="-area">Сначала больше</option></select></label>
    </div>
  </div>
  <p class="vcount" aria-live="polite"><b>' . $n . '</b> ' . plural($n, 'участок', 'участка', 'участков') . '</p>
  <div class="vgrid" id="vgrid">' . implode('', array_map('card', $all)) . '</div>
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
  ' . file_get_contents(__DIR__ . '/_tpl/call-list.html') . '
</section>';
send_html(page([
  'title' => 'Витрина проверенных земельных участков в Ленобласти - Инвест 47',
  'description' => 'Земельные участки в Ленинградской области, проверенные Инвест 47: промназначение, коммерция, ИЖС. Документы, ВРИ, подъезд и коммуникации проверены до публикации.',
  'path' => '/vitrina',
  'ld' => ld(['@context' => 'https://schema.org', '@type' => 'ItemList', 'name' => 'Витрина участков Инвест 47',
    'itemListElement' => array_map(fn($l, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'url' => $url . '/vitrina/' . $l['slug'], 'name' => $l['title']], $all, array_keys($all))]),
  'body' => $body,
]));
