/* Инвест 47 - дорога с объектами, список объектов, окно объекта.
   Данные объектов лежат в lib/objects.js, сборка кладёт их в <script id="objData"> на главной. */
(function () {
  'use strict';

  var dataEl = document.getElementById('objData');
  if (!dataEl) return;
  var OBJ = JSON.parse(dataEl.textContent);
  var N = OBJ.length;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var sm = function (t) { return t * t * (3 - 2 * t); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽'; };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = (window.INVEST47 || {}).phone || '+7 911 090-47-47';
  var tel = 'tel:' + phone.replace(/[^\d+]/g, '');

  /* ---------- окно объекта ---------- */
  var modal = $('#objModal'), omIn = $('#omIn');
  function plotsHtml(o) {
    if (!o.plots || !o.plots.length) return '';
    return '<h3 class="om__h">Участки</h3><ul class="om__plots">' + o.plots.map(function (p) {
      return '<li' + (p.sold ? ' class="is-sold"' : '') + '><b>' + esc(p.area) + '</b>' +
        '<span>' + (p.sold ? 'Проданы' : p.price ? money(p.price) : 'Цена по запросу') + '</span>' +
        (p.note ? '<small>' + esc(p.note) + '</small>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function openObj(i) {
    var o = OBJ[i];
    var imgs = o.imgs || [o.img];
    omIn.innerHTML =
      '<div class="om__media"><img id="omImg" src="/assets/img/obj/' + imgs[0] + '.webp" alt="' + esc(o.title) + ', визуализация">' +
        (imgs.length > 1 ? '<div class="om__thumbs">' + imgs.map(function (m, k) {
          return '<button type="button" data-img="' + m + '"' + (k ? '' : ' class="is-on"') + ' aria-label="Изображение ' + (k + 1) + '"><img src="/assets/img/obj/' + m + '-s.webp" alt=""></button>';
        }).join('') + '</div>' : '') +
        '<p class="om__viz">Визуализация</p></div>' +
      '<div class="om__body">' +
        '<p class="eyebrow">' + pad(o.n) + ' · ' + esc(o.type) + '</p>' +
        '<h2 id="omT">' + esc(o.title) + '</h2>' +
        '<p class="om__place">' + esc(o.place) + '</p>' +
        '<p class="om__price">' + esc(o.priceT) + '</p>' +
        '<p class="om__st"><b>' + esc(o.area) + '</b> · ' + esc(o.status) + '</p>' +
        '<p class="om__txt">' + esc(o.text) + '</p>' +
        plotsHtml(o) +
        (o.facts && o.facts.length ? '<dl class="facts om__facts">' + o.facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
        '<div class="row"><a class="btn" href="' + tel + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>' + esc(phone) + '</a>' +
        (o.link ? '<a class="btn btn--ghost" href="' + o.link[0] + '" data-close>' + esc(o.link[1]) + '</a>' : '') + '</div>' +
        '<p class="om__note">Изображения - визуализации. Точные границы и характеристики - в выписке ЕГРН, назовём по телефону.</p>' +
      '</div>';
    if (modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
    document.documentElement.classList.add('is-modal');
    omIn.scrollTop = 0;
  }
  function closeObj() { if (modal.close) modal.close(); else modal.removeAttribute('open'); }
  if (modal) {
    modal.addEventListener('close', function () { document.documentElement.classList.remove('is-modal'); });
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('[data-close]')) { closeObj(); return; }
      var t = e.target.closest('[data-img]');
      if (t) {
        $('#omImg').src = '/assets/img/obj/' + t.getAttribute('data-img') + '.webp';
        modal.querySelectorAll('[data-img]').forEach(function (b) { b.classList.toggle('is-on', b === t); });
      }
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open]');
    if (b) { e.preventDefault(); openObj(+b.getAttribute('data-open')); }
  });

  /* ---------- фильтр по типу (общий для дороги и списка) ---------- */
  var kind = '';
  var match = function (i) { return !kind || OBJ[i].kind === kind; };
  var cards = document.querySelectorAll('#objs .oc');
  function applyFilter() {
    cards.forEach(function (c) { c.hidden = !match(+c.getAttribute('data-i')); });
    if (road) road.filter();
  }
  var chips = $('#roadChips');
  if (chips) chips.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    kind = b.getAttribute('data-kind');
    chips.querySelectorAll('button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    applyFilter();
    if (road) { for (var i = 0; i < N; i++) if (match(i)) { road.go(i); break; } }
  });

  /* ---------- дорога ---------- */
  var section = $('#obekty');
  var road = null;
  if (!section) return;
  if (reduced) {
    // без анимации: дорогу не показываем, ссылки ведут к списку
    section.hidden = true;
    document.querySelectorAll('a[href="#obekty"]').forEach(function (a) { a.setAttribute('href', '#vse-obekty'); });
    return;
  }
  road = buildRoad();
  applyFilter();

  function buildRoad() {
    var stage = $('.road__stage', section), world = $('#roadWorld'), card = $('#roadCard'), route = $('#roadRoute');
    var mobile = function () { return W < 700; };

    /* мир: дорога снизу вверх, объекты по очереди справа и слева */
    var G = 640, TW = 460, WW = 3000, START = 1900, END = 1600;
    var LEN = START + (N - 1) * G + END;
    var yObj = function (i) { return LEN - START - i * G; };
    var roadX = function (y) { return WW / 2 + 170 * Math.sin(y / 1300) + 70 * Math.sin(y / 530 + 1.3); };
    var roadDX = function (y) { return 170 / 1300 * Math.cos(y / 1300) + 70 / 530 * Math.cos(y / 530 + 1.3); };
    section.style.setProperty('--n', N);
    world.style.width = WW + 'px';
    world.style.height = LEN + 'px';

    // лес сверху: процедурная бесшовная текстура
    var tex = (function () {
      var c = document.createElement('canvas'), S = 320;
      c.width = c.height = S;
      var x = c.getContext('2d');
      x.fillStyle = '#0e160b'; x.fillRect(0, 0, S, S);
      var rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(47);
      var tones = [[30, 46, 24], [34, 52, 27], [27, 41, 21], [38, 56, 29], [24, 36, 19], [42, 60, 31]];
      var crowns = [];
      for (var k = 0; k < 430; k++) crowns.push([rnd() * S, rnd() * S, 5 + rnd() * 7, tones[(rnd() * tones.length) | 0]]);
      crowns.sort(function (a, b) { return a[1] - b[1]; });                 // дальние кроны под ближними
      crowns.forEach(function (t) {
        for (var ox = -S; ox <= S; ox += S) for (var oy = -S; oy <= S; oy += S) {
          var cx = t[0] + ox, cy = t[1] + oy, r = t[2], c0 = t[3];
          if (cx < -r * 2 || cx > S + r * 2 || cy < -r * 2 || cy > S + r * 2) continue;
          x.fillStyle = 'rgba(4,7,3,.45)';
          x.beginPath(); x.arc(cx + r * .35, cy + r * .45, r, 0, 7); x.fill();
          var g = x.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r);
          g.addColorStop(0, 'rgb(' + (c0[0] + 12) + ',' + (c0[1] + 15) + ',' + (c0[2] + 7) + ')');
          g.addColorStop(.6, 'rgb(' + c0.join(',') + ')');
          g.addColorStop(1, 'rgb(' + (c0[0] - 10) + ',' + (c0[1] - 14) + ',' + (c0[2] - 8) + ')');
          x.fillStyle = g;
          x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
        }
      });
      return c.toDataURL('image/png');
    })();

    // участки земли по 900 px: лес + кусок дороги (svg)
    var CH = 900, chunks = [];
    var SVGNS = 'http://www.w3.org/2000/svg';
    for (var y0 = 0; y0 < LEN; y0 += CH) {
      var el = document.createElement('div');
      el.className = 'rw-chunk';
      el.style.top = y0 + 'px';
      el.style.width = WW + 'px';
      el.style.height = (CH + 1) + 'px';
      el.style.backgroundImage = 'url(' + tex + ')';
      el.style.backgroundPosition = '0 ' + (-y0) + 'px';
      // путь рисуем снизу вверх, как едет камера; разметка продолжается с соседнего куска
      var yb = Math.min(LEN, y0 + CH + 20), pts = [];
      for (var y = yb; y >= y0 - 20; y -= 20) pts.push([roadX(y), y - y0]);
      var startDist = arc(LEN, yb);
      var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('class', 'rw-road');
      svg.setAttribute('width', WW); svg.setAttribute('height', CH + 1);
      svg.setAttribute('viewBox', '0 0 ' + WW + ' ' + (CH + 1));
      svg.innerHTML =
        '<path d="' + d + '" class="r0"/><path d="' + d + '" class="r1"/><path d="' + d + '" class="r2"/>' +
        '<path d="' + d + '" class="r3" style="stroke-dashoffset:' + (startDist % 54).toFixed(1) + '"/>';
      el.appendChild(svg);
      world.appendChild(el);
      chunks.push({ el: el, y0: y0, y1: y0 + CH, on: true });
    }
    function arc(ya, yb) { // длина дороги между ya (ниже) и yb (выше)
      var s = 0, x0 = roadX(ya);
      for (var y = ya - 20; y >= yb - 1e-6; y -= 20) { var x1 = roadX(y); s += Math.hypot(x1 - x0, 20); x0 = x1; }
      return s;
    }

    // надписи на асфальте: название трассы у первого объекта на ней и «Инвест 47» на старте
    function paint(text, y, cls) {
      var t = document.createElement('div');
      t.className = 'rw-paint ' + (cls || '');
      t.textContent = text;
      var ang = Math.atan(roadDX(y)) * 180 / Math.PI;           // надпись читается по ходу движения
      t.style.transform = 'translate(' + (roadX(y) + 24).toFixed(1) + 'px,' + y + 'px) translate(-50%,-50%) rotate(' + (-90 - ang).toFixed(2) + 'deg)';
      world.appendChild(t);
    }
    paint('ИНВЕСТ 47', yObj(0) + G * 1.45, 'rw-paint--big');
    var lastRoad = null;
    OBJ.forEach(function (o, i) {
      if (o.road && o.road !== lastRoad) paint(o.road.toUpperCase(), yObj(i) + G * .62);
      lastRoad = o.road;
    });

    // объекты: плитка с картинкой, съезд с дороги, подпись над плиткой
    var labelsBox = document.createElement('div');
    labelsBox.className = 'road__labels';
    labelsBox.setAttribute('aria-hidden', 'true');
    $('.road__view', section).after(labelsBox);
    var items = OBJ.map(function (o, i) {
      var side = i % 2 ? -1 : 1;
      var th = clamp(TW * o.h / o.w, 290, 500);
      var y = yObj(i), rx = roadX(y);
      var cx = rx + side * (78 + TW / 2);
      var drive = document.createElement('div');
      drive.className = 'rw-drive';
      drive.style.left = (side > 0 ? rx + 40 : cx + TW / 2 - 4) + 'px';
      drive.style.top = (y - 14) + 'px';
      drive.style.width = (Math.abs(cx - rx) - TW / 2 - 36) + 'px';
      world.appendChild(drive);
      var tile = document.createElement('div');
      tile.className = 'rw-tile';
      tile.setAttribute('data-open', i);
      tile.style.left = (cx - TW / 2) + 'px';
      tile.style.top = (y - th / 2) + 'px';
      tile.style.width = TW + 'px';
      tile.style.height = th + 'px';
      var img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      tile.appendChild(img);
      world.appendChild(tile);
      var lab = document.createElement('button');
      lab.type = 'button';
      lab.className = 'rl';
      lab.tabIndex = -1;
      lab.setAttribute('data-open', i);
      lab.innerHTML = '<span class="rl__n">' + pad(i + 1) + '</span><span class="rl__t">' + esc(o.label) + '</span>';
      labelsBox.appendChild(lab);
      return { o: o, side: side, y: y, cx: cx, th: th, tile: tile, img: img, lab: lab, loaded: false, vis: null };
    });

    // маршрут: точки объектов справа
    route.innerHTML = OBJ.map(function (o, i) {
      return '<li><button type="button" data-go="' + i + '" aria-label="' + pad(i + 1) + '. ' + esc(o.title) + '"><i></i><span>' + esc(o.label) + '</span></button></li>';
    }).join('');
    var dots = route.querySelectorAll('button');
    route.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) go(+b.getAttribute('data-go')); });

    // карточка объекта внизу
    var active = -1;
    function showCard(i) {
      var o = OBJ[i];
      card.innerHTML =
        '<div class="rc__top"><p class="rc__n"><b>' + pad(i + 1) + '</b> / ' + N + ' · ' + esc(o.type) + '</p>' +
        '<div class="rc__nav"><button type="button" data-step="-1" aria-label="Предыдущий объект"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<button type="button" data-step="1" aria-label="Следующий объект"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div></div>' +
        '<h3>' + esc(o.title) + '</h3>' +
        '<p class="rc__place">' + esc(o.place) + '</p>' +
        '<p class="rc__row"><b>' + esc(o.area) + '</b><span>' + esc(o.status) + '</span><span class="rc__p">' + esc(o.priceT) + '</span></p>' +
        '<div class="rc__btns"><button class="btn btn--sm" type="button" data-open="' + i + '">Подробнее</button>' +
        '<a class="btn btn--sm btn--ghost" href="' + tel + '">Позвонить</a></div>';
      card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in');
    }
    card.addEventListener('click', function (e) {
      var b = e.target.closest('[data-step]');
      if (!b) return;
      var s = +b.getAttribute('data-step'), i = active + s;
      while (i >= 0 && i < N && !match(i)) i += s;
      if (i >= 0 && i < N) go(i);
    });

    /* камера */
    var W = 0, H = 0, top0 = 0, span = 1, P = -1, need = true;
    var D = 1150;
    var persp = function () { return new DOMMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -1 / D, 0, 0, 0, 1]); };
    function measure() {
      W = stage.clientWidth; H = stage.clientHeight;
      top0 = section.getBoundingClientRect().top + window.scrollY;
      span = Math.max(1, section.offsetHeight - H);
      need = true;
    }
    var posOf = function (q) { return -0.9 + q * (N - 1 + 1.2); };
    var qOf = function (i) { return (i + 0.9) / (N - 1 + 1.2); };
    function go(i) {
      window.scrollTo({ top: top0 + qOf(i) * span + 1, behavior: 'smooth' });
    }

    function render() {
      if (!need) return;
      need = false;
      var q = clamp((window.scrollY - top0) / span, 0, 1);
      var pos = posOf(q), fl = Math.floor(pos), fr = pos - fl;
      var d = fl + sm(sm(fr));                                 // камера задерживается у каждого объекта
      var a = clamp(Math.round(d), 0, N - 1);
      var m = mobile();

      // боковой сдвиг к активному объекту
      var panK = m ? 1 : .42;
      var panOf = function (i) { return i < 0 || i >= N ? 0 : items[i].side * (78 + TW / 2) * panK; };
      var pf = panOf(fl), pc = panOf(fl + 1);
      var pan = pf + (pc - pf) * sm(fr);
      var cy = yObj(0) - d * G + 150;
      var cx = roadX(cy) + pan;
      var yaw = Math.atan(roadDX(cy)) * 180 / Math.PI * .8;
      var near = Math.abs(d - Math.round(d));                  // 0 у объекта, 0.5 между объектами
      var tilt = (m ? 50 : 54) + near * 10;
      var sc = m ? W / 600 : clamp(W / 1400, .72, 1.08);
      var fx = W / 2, fy = H * (m ? .5 : .62);

      var M = new DOMMatrix().translate(W / 2, H * .3).multiply(persp()).translate(-W / 2, -H * .3)
        .translate(fx, fy).rotate(tilt, 0, 0).rotate(0, 0, yaw).scale(sc, sc).translate(-cx, -cy);
      world.style.transform = M.toString();

      // видимые куски земли: немного позади камеры и далеко вперёд
      chunks.forEach(function (c) {
        var on = c.y1 > cy - 4200 && c.y0 < cy + 1000;
        if (on !== c.on) { c.on = on; c.el.style.visibility = on ? '' : 'hidden'; }
      });

      // плитки и подписи
      items.forEach(function (it, i) {
        var dy = it.y - cy;
        var on = dy > -4200 && dy < 900;
        if (on !== it.vis) { it.vis = on; it.tile.style.visibility = on ? '' : 'hidden'; }
        if (!it.loaded && Math.abs(i - d) < 3.5) { it.loaded = true; it.img.src = '/assets/img/obj/' + it.o.img + '-s.webp'; }
        it.tile.classList.toggle('is-on', i === a && Math.abs(d - a) < .3);
        var pt = M.transformPoint(new DOMPoint(it.cx, it.y - it.th / 2, 0, 1));
        var show = on && pt.w > .2 && i >= a;
        if (show) {
          var sx = pt.x / pt.w, sy = pt.y / pt.w, s = clamp(1.25 / pt.w, .45, 1);
          show = sy > H * .16 && sy < H * 1.1 && sx > -100 && sx < W + 100;
          if (show) it.lab.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')';
          it.lab.style.opacity = show ? clamp(2.6 - pt.w, 0, 1) : 0;
        } else it.lab.style.opacity = 0;
        it.lab.style.visibility = show ? '' : 'hidden';
        it.lab.classList.toggle('is-on', i === a);
      });

      if (a !== active) {
        active = a;
        showCard(a);
        card.classList.toggle('is-l', items[a].side > 0);           // на компьютере карточка с другой стороны от объекта
        card.classList.toggle('is-r', items[a].side < 0);
        dots.forEach(function (b, k) { b.classList.toggle('is-on', k === a); });
      }
      card.classList.toggle('is-hide', pos < -0.45);
    }

    function filter() {
      items.forEach(function (it, i) {
        it.tile.classList.toggle('is-dim', !match(i));
        it.lab.classList.toggle('is-dim', !match(i));
        dots[i].classList.toggle('is-dim', !match(i));
      });
    }

    var queued = false;
    function kick() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; render(); }); } }
    measure();
    window.addEventListener('resize', function () { measure(); kick(); });
    window.addEventListener('load', function () { measure(); kick(); });
    window.addEventListener('scroll', function () { need = true; kick(); }, { passive: true });
    // пролёт выше меняет высоту страницы после загрузки кадров - пересчитываем позицию
    if (window.ResizeObserver) new ResizeObserver(function () { measure(); kick(); }).observe(document.body);
    kick();
    return { go: go, filter: filter };
  }
})();
