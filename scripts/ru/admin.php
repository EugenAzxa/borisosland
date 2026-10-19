<?php
// Админка запасной копии: вход по паролю, участки витрины (добавить, изменить, фото, опубликовать, удалить).
// Пароль - хеш в _data/config.php. Работает без JavaScript, обычными формами.
require __DIR__ . '/_lib.php';

session_name('inv47adm');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();
header('X-Robots-Tag: noindex, nofollow');
$cfg = require DATA . '/config.php';
$kinds = meta()['kinds']; $districts = meta()['districts']; $checks = meta()['checks'];
$STATUS = ['pending' => 'Черновик (не виден на сайте)', 'approved' => 'Опубликован', 'archived' => 'Снят с публикации'];

function admin_page(string $body, string $title = 'Админка - Инвест 47'): void {
  $css = '<style>.adm-f{display:grid;gap:14px;max-width:860px}.adm-2{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:640px){.adm-2{grid-template-columns:1fr}}
.adm-ph{list-style:none;display:flex;flex-wrap:wrap;gap:12px}.adm-ph li{display:grid;gap:6px;width:150px;font-size:13px}.adm-ph img{width:150px;height:100px;object-fit:cover;border-radius:8px}
.adm-msg{padding:12px 16px;border-radius:10px;background:rgba(207,226,122,.12);color:var(--lime);margin-bottom:18px}.adm-err{background:rgba(255,120,100,.12);color:#ffb3a6}
.adm-row{display:flex;gap:14px;align-items:center;padding:12px;border-radius:12px;background:var(--bg2);box-shadow:inset 0 0 0 1px var(--line);text-decoration:none}
.adm-row img,.adm-row .ni{flex:none;width:96px;height:64px;border-radius:8px;object-fit:cover;background:#1b2117}.adm-row b{display:block}.adm-row i{font-style:normal;color:var(--mute);font-size:14px}
.adm-chk{display:flex;gap:10px;align-items:center;font-size:15px}.f .adm-chk input,.adm-chk input{flex:none;width:20px;height:20px;min-height:0;padding:0;box-shadow:none;accent-color:#cfe27a}
.adm-btn{border:0;cursor:pointer;font-family:var(--ff)}.adm-del{background:none;border:0;color:#ffb3a6;cursor:pointer;font:inherit;text-decoration:underline}</style>';
  send_html(page(['title' => $title, 'path' => '/admin', 'noindex' => true, 'body' => $css . '<section class="wrap adm">' . $body . '</section>']));
}
function csrf(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(16)); }
function hidden(): string { return '<input type="hidden" name="csrf" value="' . csrf() . '">'; }
function go(string $q = '', string $msg = ''): void { if ($msg) $_SESSION['msg'] = $msg; header('Location: /admin' . ($q ? '?' . $q : '')); exit; }
function num_in($v): ?float { $v = str_replace([' ', "\u{00a0}", ','], ['', '', '.'], trim((string)$v)); return is_numeric($v) && $v >= 0 ? (float)$v : null; }
function clean_in($v, int $max = 300): string { return mb_substr(trim(preg_replace('/[\x00-\x08\x0b\x0c\x0e-\x1f]/u', '', (string)$v)), 0, $max); }

/* фото: проверяем, что это картинка, уменьшаем до 1600 px, сохраняем в uploads/vitrina */
function save_photo(string $tmp): ?string {
  $info = @getimagesize($tmp);
  if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) return null;
  if (!is_dir(UPLOADS)) mkdir(UPLOADS, 0755, true);
  $fn = [IMAGETYPE_JPEG => 'imagecreatefromjpeg', IMAGETYPE_PNG => 'imagecreatefrompng', IMAGETYPE_WEBP => 'imagecreatefromwebp'][$info[2]];
  $src = function_exists($fn) && function_exists('imagejpeg') ? @$fn($tmp) : false;
  if (!$src) {                                                    // хостинг не умеет уменьшать фото - сохраняем как есть, если не огромное
    if (filesize($tmp) > 8 * 1048576) return null;
    $name = bin2hex(random_bytes(8)) . '.' . [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'][$info[2]];
    return move_uploaded_file($tmp, UPLOADS . '/' . $name) ? '/uploads/vitrina/' . $name : null;
  }
  if ($info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data')) {     // фото с телефона: поворот по EXIF
    $o = (@exif_read_data($tmp)['Orientation'] ?? 1);
    if ($o == 3) $src = imagerotate($src, 180, 0); elseif ($o == 6) $src = imagerotate($src, -90, 0); elseif ($o == 8) $src = imagerotate($src, 90, 0);
  }
  $w = imagesx($src); $h = imagesy($src); $k = min(1, 1600 / max($w, $h));
  $dst = imagecreatetruecolor((int)round($w * $k), (int)round($h * $k));
  imagecopyresampled($dst, $src, 0, 0, 0, 0, imagesx($dst), imagesy($dst), $w, $h);
  $name = bin2hex(random_bytes(8)) . '.jpg';
  imagejpeg($dst, UPLOADS . '/' . $name, 84);
  return '/uploads/vitrina/' . $name;
}

$msg = $_SESSION['msg'] ?? ''; unset($_SESSION['msg']);
$flash = $msg ? '<p class="adm-msg' . (str_starts_with($msg, '!') ? ' adm-err' : '') . '">' . e(ltrim($msg, '!')) . '</p>' : '';

/* ---------- вход ---------- */
if (empty($_SESSION['ok'])) {
  if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    usleep(500000);                                                 // замедляем перебор
    if (hash_equals($cfg['hash'], hash('sha256', $cfg['salt'] . (string)$_POST['password']))) { session_regenerate_id(true); $_SESSION['ok'] = 1; go(); }
    $flash = '<p class="adm-msg adm-err">Неверный пароль</p>';
  }
  admin_page('<div class="adm-login"><h1 class="h2">Вход в админку</h1>' . $flash . '<form method="post" class="adm-f"><label class="f"><span>Пароль</span><input name="password" type="password" autocomplete="current-password" required autofocus></label><button class="btn adm-btn">Войти</button></form><p class="lead" style="margin-top:18px;font-size:15px"><a href="/">На сайт</a></p></div>', 'Вход - Инвест 47');
  exit;
}

$all = listings();
$find = function (string $id) use (&$all) { foreach ($all as $i => $x) if ($x['id'] === $id) return $i; return null; };

/* ---------- действия ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (!hash_equals(csrf(), (string)($_POST['csrf'] ?? ''))) go('', '!Страница устарела, попробуйте ещё раз');
  $act = $_POST['act'] ?? '';
  if ($act === 'logout') { session_destroy(); header('Location: /'); exit; }
  if ($act === 'create') {
    $now = date('c');
    $l = ['id' => bin2hex(random_bytes(4)), 'status' => 'pending', 'createdAt' => $now, 'updatedAt' => $now, 'title' => 'Новый участок', 'slug' => '', 'kind' => 'prom',
      'area' => '', 'price' => null, 'district' => 'Всеволожский', 'place' => '', 'kn' => '', 'vri' => '', 'distKad' => '', 'power' => '', 'gas' => '', 'water' => '', 'sewer' => '', 'road' => '',
      'description' => '', 'note' => '', 'photos' => [], 'checks' => []];
    $all[] = $l; save_listings($all);
    go('id=' . $l['id'], 'Участок создан. Заполните данные и нажмите «Сохранить».');
  }
  $i = $find((string)($_POST['id'] ?? ''));
  if ($i === null) go('', '!Участок не найден');
  if ($act === 'delete') {
    foreach ($all[$i]['photos'] as $p) if (str_starts_with($p, '/uploads/')) @unlink(__DIR__ . $p);
    array_splice($all, $i, 1); save_listings($all);
    go('', 'Участок удалён');
  }
  if ($act === 'save') {
    $l = &$all[$i];
    foreach (['title' => 160, 'place' => 200, 'kn' => 200, 'vri' => 300, 'power' => 120, 'gas' => 120, 'water' => 120, 'sewer' => 120, 'road' => 160, 'description' => 4000, 'note' => 600] as $k => $max) $l[$k] = clean_in($_POST[$k] ?? '', $max);
    $l['area'] = num_in($_POST['area'] ?? '') ?? '';
    $l['price'] = num_in($_POST['price'] ?? '');
    $l['distKad'] = num_in($_POST['distKad'] ?? '') ?? '';
    if (isset($kinds[$_POST['kind'] ?? ''])) $l['kind'] = $_POST['kind'];
    if (in_array($_POST['district'] ?? '', $districts, true)) $l['district'] = $_POST['district'];
    $l['checks'] = array_fill_keys(array_keys(array_filter($checks, fn($k) => !empty($_POST['check_' . $k]), ARRAY_FILTER_USE_KEY)), 1);
    // фото: убрать отмеченные, сделать обложкой, добавить новые
    $rm = (array)($_POST['rm'] ?? []);
    foreach ($l['photos'] as $p) if (in_array($p, $rm, true) && str_starts_with($p, '/uploads/')) @unlink(__DIR__ . $p);
    $l['photos'] = array_values(array_diff($l['photos'], $rm));
    $cover = (string)($_POST['cover'] ?? '');
    if ($cover && in_array($cover, $l['photos'], true)) $l['photos'] = array_values(array_unique(array_merge([$cover], $l['photos'])));
    $bad = 0;
    if (!empty($_FILES['photos']['tmp_name'])) foreach ((array)$_FILES['photos']['tmp_name'] as $k => $tmp) {
      if (!$tmp || ($_FILES['photos']['error'][$k] ?? 1) !== UPLOAD_ERR_OK) { if (($_FILES['photos']['error'][$k] ?? 4) !== UPLOAD_ERR_NO_FILE) $bad++; continue; }
      if (count($l['photos']) >= 20) break;
      ($u = save_photo($tmp)) ? $l['photos'][] = $u : $bad++;
    }
    $st = $_POST['status'] ?? $l['status'];
    $warn = '';
    if ($st === 'approved' && (!$l['area'] || !$l['place'])) { $st = $l['status'] === 'approved' ? 'pending' : $l['status']; $warn = ' Для публикации укажите площадь и где находится участок - пока сохранён как черновик.'; }
    if (isset($STATUS[$st])) { if ($st === 'approved' && empty($l['publishedAt'])) $l['publishedAt'] = date('c'); $l['status'] = $st; }
    if (empty($l['own']) || !$l['slug']) {                          // адрес страницы из названия; у своих участков Инвест 47 не меняем
      $s = slugify($l['title']) ?: 'uchastok';
      foreach ($all as $j => $x) if ($j !== $i && $x['slug'] === $s) { $s .= '-' . $l['id']; break; }
      $l['slug'] = $s;
    }
    $l['updatedAt'] = date('c');
    unset($l);
    save_listings($all);
    go('id=' . $all[$i]['id'], ($bad || $warn ? '!' : '') . 'Сохранено.' . ($bad ? " Не удалось загрузить фото: $bad (нужен JPG, PNG или WEBP, не больше 8 МБ)." : '') . $warn);
  }
  go();
}

/* ---------- форма участка ---------- */
$id = (string)($_GET['id'] ?? '');
if ($id !== '' && ($i = $find($id)) !== null) {
  $l = $all[$i];
  if ($l['area'] !== '' && $l['area'] !== null) $l['area'] = sot($l['area']);
  $in = fn($k, $label, $extra = '') => '<label class="f"><span>' . $label . '</span><input name="' . $k . '" value="' . e($l[$k] ?? '') . '"' . $extra . '></label>';
  $ph = $l['photos'] ? '<ul class="adm-ph">' . implode('', array_map(fn($p, $n) => '<li><img src="' . e($p) . '" alt=""><label class="adm-chk"><input type="radio" name="cover" value="' . e($p) . '"' . ($n ? '' : ' checked') . '>Обложка</label><label class="adm-chk"><input type="checkbox" name="rm[]" value="' . e($p) . '">Убрать</label></li>', $l['photos'], array_keys($l['photos']))) . '</ul>' : '<p class="lead" style="font-size:15px">Фото пока нет.</p>';
  $body = '<p class="crumbs"><a href="/admin">Все участки</a></p>' . $flash . '
  <h1 class="h2">' . e($l['title']) . '</h1>' . ($l['status'] === 'approved' && $l['slug'] ? '<p style="margin-bottom:18px"><a href="/vitrina/' . e($l['slug']) . '" target="_blank" style="color:var(--lime)">Открыть на сайте</a></p>' : '') . '
  <form method="post" enctype="multipart/form-data" class="adm-f">' . hidden() . '<input type="hidden" name="act" value="save"><input type="hidden" name="id" value="' . e($l['id']) . '">
    <label class="f"><span>Статус</span><select name="status">' . implode('', array_map(fn($k) => '<option value="' . $k . '"' . ($k === $l['status'] ? ' selected' : '') . '>' . $STATUS[$k] . '</option>', array_keys($STATUS))) . '</select></label>
    ' . $in('title', 'Название участка (видно на сайте)') . '
    <div class="adm-2">' . $in('area', 'Площадь, соток', ' inputmode="decimal"') . $in('price', 'Цена, ₽ (пусто - «по запросу»)', ' inputmode="numeric"') . '</div>
    <div class="adm-2"><label class="f"><span>Категория</span><select name="kind">' . implode('', array_map(fn($k) => '<option value="' . $k . '"' . ($k === $l['kind'] ? ' selected' : '') . '>' . e($kinds[$k]) . '</option>', array_keys($kinds))) . '</select></label>
      <label class="f"><span>Район</span><select name="district">' . implode('', array_map(fn($d) => '<option' . ($d === ($l['district'] ?? '') ? ' selected' : '') . '>' . e($d) . '</option>', $districts)) . '</select></label></div>
    ' . $in('place', 'Где находится (посёлок, шоссе, км)') . '
    <div class="adm-2">' . $in('kn', 'Кадастровый номер') . $in('distKad', 'До КАД, км', ' inputmode="decimal"') . '</div>
    ' . $in('vri', 'Вид разрешённого использования') . '
    <div class="adm-2">' . $in('power', 'Электричество') . $in('gas', 'Газ') . '</div>
    <div class="adm-2">' . $in('water', 'Вода') . $in('sewer', 'Канализация') . '</div>
    ' . $in('road', 'Подъезд') . '
    <label class="f"><span>Описание (пустая строка - новый абзац)</span><textarea name="description" rows="7">' . e($l['description'] ?? '') . '</textarea></label>
    <label class="f"><span>Комментарий Инвест 47 (необязательно)</span><textarea name="note" rows="2">' . e($l['note'] ?? '') . '</textarea></label>
    <div class="f"><span>Фото участка (первое - обложка)</span>' . $ph . '<label class="f" style="margin-top:10px"><span>Добавить фото (можно несколько сразу)</span><input type="file" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple></label></div>
    <div class="f"><span>Что проверено (видно на сайте)</span>' . implode('', array_map(fn($k) => '<label class="adm-chk"><input type="checkbox" name="check_' . $k . '"' . (!empty($l['checks'][$k]) ? ' checked' : '') . '>' . e($checks[$k]) . '</label>', array_keys($checks))) . '</div>
    <div class="row"><button class="btn adm-btn">Сохранить</button><a class="btn btn--ghost" href="/admin">К списку</a></div>
  </form>
  <form method="post" style="margin-top:28px" onsubmit="return confirm(\'Удалить участок вместе с фото?\')">' . hidden() . '<input type="hidden" name="act" value="delete"><input type="hidden" name="id" value="' . e($l['id']) . '"><button class="adm-del">Удалить участок</button></form>';
  admin_page($body);
  exit;
}

/* ---------- список ---------- */
usort($all, fn($a, $b) => ($b['updatedAt'] ?? '') <=> ($a['updatedAt'] ?? ''));
$rows = implode('', array_map(fn($l) => '<a class="adm-row" href="/admin?id=' . e($l['id']) . '">' . (!empty($l['photos'][0]) ? '<img src="' . e($l['photos'][0]) . '" alt="">' : '<span class="ni"></span>') . '<span><b>' . e($l['title']) . '</b><i>' . e($STATUS[$l['status']] ?? $l['status']) . ' · ' . ($l['area'] ? sot($l['area']) . ' сот.' : 'площадь не указана') . ' · ' . (!empty($l['price']) ? money($l['price']) : 'цена по запросу') . '</i></span></a>', $all));
admin_page('<div class="adm-top"><h1 class="h2" style="margin:0">Участки на витрине</h1><div class="adm-act">
  <form method="post">' . hidden() . '<input type="hidden" name="act" value="create"><button class="btn adm-btn">Добавить участок</button></form>
  <form method="post">' . hidden() . '<input type="hidden" name="act" value="logout"><button class="btn btn--ghost adm-btn">Выйти</button></form></div></div>' . $flash . '
  <div style="display:grid;gap:10px">' . ($rows ?: '<p class="lead">Участков пока нет.</p>') . '</div>');
