<?php
// sitemap.xml в запасной копии: страницы сайта + опубликованные участки (адрес задаёт .htaccess)
require __DIR__ . '/_lib.php';
$u = site('url');
header('Content-Type: application/xml; charset=utf-8');
$rows = [];
foreach (meta()['static_urls'] as [$path, $pr, $date]) $rows[] = [$path, $pr, $date];
foreach (published() as $l) $rows[] = ['/vitrina/' . $l['slug'], '0.8', substr($l['updatedAt'] ?? '', 0, 10)];
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($rows as [$path, $pr, $date]) echo '<url><loc>' . e($u . $path) . '</loc>' . ($date ? '<lastmod>' . e($date) . '</lastmod>' : '') . '<priority>' . e($pr) . '</priority></url>' . "\n";
echo '</urlset>';
