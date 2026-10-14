/* Инвест 47 - пролёт с неба к участкам, генплан, карточки */
(function () {
  'use strict';

  /* ---------- настройки: правки здесь ---------- */
  var CONFIG = {
    film: {
      d: { dir: 'assets/film/d2/', count: 139, crop: [0, 1] },      // кадры для компьютера, весь кадр 16:9
      m: { dir: 'assets/film/m4/', count: 70, crop: [.1, .8] }       // телефон: центральные 80% ширины, 720 px, каждый второй кадр
    },
    still: 'assets/img/plan2.webp' // финальный кадр сверху, в координатах 1400 x 791
  };

  /* Участки в координатах финального кадра (1400 x 791), раскладка как на плане посёлка:
     слева 7 проданных (2 + 2 + 1 широкий + 2), справа колонка из 4, трасса Кола внизу. */
  var PLOTS = [
    { x: 380, y: 100, w: 148, h: 112, sold: true },
    { x: 540, y: 100, w: 152, h: 112, sold: true },
    { x: 355, y: 233, w: 172, h: 120, sold: true },
    { x: 537, y: 233, w: 158, h: 120, sold: true },
    { x: 352, y: 368, w: 344, h: 118, sold: true },
    { x: 345, y: 498, w: 166, h: 128, sold: true },
    { x: 520, y: 498, w: 176, h: 128, sold: true },
    { id: 'u265', x: 745, y: 98, w: 282, h: 122, area: '26,51', price: 14000000,
      kn: 'К/н 47:07:1047002:3200', title: 'Участок 26,51 сот.', slug: 'murmanskoe-6-km-26-5-sot',
      points: ['Самый большой из свободных', 'Промназначение', 'Подъезд по общей внутренней дороге', 'Без управляющей компании'] },
    { id: 'u2085', x: 745, y: 233, w: 292, h: 122, area: '20,85', price: 11500000,
      kn: 'К/н 47:07:1047002:3202', title: 'Участок 20,85 сот.', slug: 'murmanskoe-6-km-20-85-sot',
      points: ['Промназначение', 'Подъезд по общей внутренней дороге', 'Выезд на Мурманское шоссе', 'Без управляющей компании'] },
    { x: 745, y: 368, w: 300, h: 120, sold: true },
    { id: 'u2372', x: 745, y: 498, w: 328, h: 138, dx: -20, area: '23,72', price: 15000000, tp: true,
      title: 'Участок 23,72 сот.', slug: 'murmanskoe-6-km-23-72-sot',
      kn: 'К/н 47:07:1047002:3249, 3250',
      points: ['Промназначение', '150 кВт подключены, подстанция на участке', 'Доля 4 сот. в общей дороге в собственность', 'Первый от трассы Кола'] }
  ];
  var FREE = PLOTS.filter(function (p) { return !p.sold; });
  var SVGNS = 'http://www.w3.org/2000/svg';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var money = function (n) { return n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽'; };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- телефон задаётся в site.js ---------- */
  var phone = (window.INVEST47 || {}).phone || '+7 911 090-47-47';
  var phoneHref = 'tel:' + phone.replace(/[^\d+]/g, '');

  /* ---------- шапка ---------- */
  var top = $('#top');
  function onHeader() { top.classList.toggle('is-solid', window.scrollY > window.innerHeight * 3.9); }

  /* ---------- svg-участки (используются и в пролёте, и в генплане) ---------- */
  function plotNode(p, cls) {
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', cls + ' ' + cls + (p.sold ? '--sold' : '--free'));
    var r = document.createElementNS(SVGNS, 'rect');
    r.setAttribute('x', p.x); r.setAttribute('y', p.y); r.setAttribute('width', p.w); r.setAttribute('height', p.h); r.setAttribute('rx', 4);
    g.appendChild(r);
    var cx = p.x + p.w / 2 + (p.dx || 0), cy = p.y + p.h / 2 + (p.dy || 0);
    var t1 = document.createElementNS(SVGNS, 'text');
    t1.setAttribute('class', 't1'); t1.setAttribute('x', cx);
    t1.setAttribute('y', p.sold ? cy + 6 : cy + 4);
    t1.textContent = p.sold ? 'ПРОДАН' : p.area + ' сот';
    g.appendChild(t1);
    if (!p.sold) {
      var t2 = document.createElementNS(SVGNS, 'text');
      t2.setAttribute('class', 't2'); t2.setAttribute('x', cx); t2.setAttribute('y', cy + 32);
      t2.textContent = p.tp ? 'ТП 150 кВт' : 'СВОБОДЕН';
      g.appendChild(t2);
    }
    return g;
  }

  /* ---------- карточки свободных участков ---------- */
  var lots = $('#lots');
  FREE.forEach(function (p) {
    var el = document.createElement('article');
    el.className = 'lot';
    el.id = 'lot-' + p.id;
    el.innerHTML =
      (p.tp ? '<span class="tag">Подстанция</span>' : '') +
      '<p class="lot__n">Промназначение</p>' +
      '<p class="lot__s">' + p.area + '<small>сот.</small></p>' +
      (p.price
        ? '<p class="lot__p">' + money(p.price) + '</p>' +
          '<p class="lot__kn">≈ ' + Math.round(p.price / parseFloat(p.area.replace(',', '.')) / 1000) + ' тыс. ₽ за сотку · ' + p.kn + '</p>'
        : '<p class="lot__p ask">Цена по запросу</p>') +
      '<ul>' + p.points.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
      '<a class="btn" href="' + phoneHref + '">Позвонить про участок</a>' +
      '<a class="lot__more" href="/vitrina/' + p.slug + '">Подробнее об участке</a>';
    lots.appendChild(el);
  });

  /* ---------- генплан ---------- */
  var planSvg = $('#planSvg'), info = $('#planInfo'), infoDefault = info.innerHTML, current = null;
  PLOTS.forEach(function (p, i) {
    var g = plotNode(p, 'pp');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', p.sold ? 'Участок продан' : p.title + ', свободен');
    var show = function () { select(p, g); };
    g.addEventListener('mouseenter', show);
    g.addEventListener('focus', show);
    g.addEventListener('click', show);
    planSvg.appendChild(g);
  });
  function select(p, g) {
    if (current) current.classList.remove('is-on');
    current = g; g.classList.add('is-on');
    if (p.sold) {
      info.innerHTML = '<p class="eyebrow">Продан</p><h3>Этот участок уже продан</h3>' +
        '<p>Свободными остались три участка в правом ряду: 26,51, 20,85 и 23,72 сотки.</p>' +
        '<a class="btn btn--ghost" href="#uchastki">Свободные участки</a>';
      return;
    }
    info.innerHTML = '<p class="eyebrow">Свободен</p><h3>' + p.title + '</h3>' +
      '<p class="price">' + (p.price ? money(p.price) : 'Цена по запросу') + '</p>' +
      '<p>' + p.points.join(' · ') + '</p>' +
      (p.kn ? '<p style="margin-top:8px">' + p.kn + '</p>' : '') +
      '<a class="btn" href="' + phoneHref + '">Позвонить про участок</a>';
  }
  $('.plan__map').addEventListener('mouseleave', function () {
    if (window.matchMedia('(hover: hover)').matches && current) { current.classList.remove('is-on'); current = null; info.innerHTML = infoDefault; }
  });

  /* ---------- пролёт ---------- */
  var fly = $('#fly'), stage = $('.fly__stage'), cv = $('#flyCv'), ctx = cv.getContext('2d');
  var intro = $('#flyIntro'), land = $('#flyLand'), card = $('#flyCard'), hint = $('#flyHint');
  var altEl = $('#flyAlt'), bar = $('#flyBar'), hud = $('.fly__hud'), note = $('.fly__note');
  var mobile = window.innerWidth <= 760 && window.innerHeight > window.innerWidth;
  var film = mobile ? CONFIG.film.m : CONFIG.film.d;
  var N = film.count;
  var frames = new Array(N), still = new Image();
  still.src = CONFIG.still;
  still.onload = function () { need = true; kick(); };

  function pad(n) { return ('000' + n).slice(-3); }
  // на телефоне кадры заранее распакованы в ImageBitmap: иначе браузер распаковывает их заново
  // при каждой прокрутке, и пролёт дёргается
  var bitmaps = mobile && window.createImageBitmap && window.fetch;
  function load(i) {
    if (frames[i]) return;
    var url = film.dir + pad(i + 1) + '.webp';
    if (bitmaps) {
      var slot = frames[i] = { ok: false };
      fetch(url).then(function (r) { return r.blob(); }).then(createImageBitmap).then(function (bm) {
        slot.im = bm; slot.ok = true; need = true; kick();
      }).catch(function () {});
      return;
    }
    var im = new Image();
    im.decoding = 'async';
    im.onload = function () {
      var ok = function () { im.ok = true; im.im = im; need = true; kick(); };
      im.decode ? im.decode().then(ok, ok) : ok();
    };
    im.src = url;
    frames[i] = im;
  }
  // сначала каждый 8-й кадр, потом заполняем промежутки
  if (N) {
    load(0);
    [8, 4, 2, 1].forEach(function (step, k) {
      setTimeout(function () { for (var i = 0; i < N; i += step) load(i); load(N - 1); }, k * 350);
    });
  }
  function nearest(i) {
    for (var d = 0; d < N; d++) {
      if (frames[i - d] && frames[i - d].ok) return frames[i - d].im;
      if (frames[i + d] && frames[i + d].ok) return frames[i + d].im;
    }
    return null;
  }

  // метки объектов Инвест 47: видны с высоты, при снижении разлетаются от центра, остаётся посёлок у Колы.
  // Координаты меток - на кадре 60 (1400 x 791), масштаб местности по кадрам замерен по ширине посёлка (кадры _src/v2)
  var pinsBox = $('#flyPins'), cap = $('#flyCap'), pins = [];
  var objData = document.getElementById('objData');
  var ZOOM = [[0, .05], [25, .094], [45, .125], [60, .154], [85, .2], [100, .286], [115, .39], [138, .56]];
  var PC = [690, 378];                                         // центр приближения - посёлок у Колы
  function zoomAt(f) {
    for (var k = 1; k < ZOOM.length; k++) if (f <= ZOOM[k][0]) {
      var a = ZOOM[k - 1], b = ZOOM[k];
      return (a[1] + (b[1] - a[1]) * (f - a[0]) / (b[0] - a[0])) / .154;
    }
    return ZOOM[ZOOM.length - 1][1] / .154;
  }
  if (pinsBox && objData) {
    JSON.parse(objData.textContent).forEach(function (o, k) {
      var el = document.createElement('span');
      // на телефоне подписи только у половины меток, остальные - точки, иначе подписи налезают друг на друга
      el.className = 'fpin' + (k ? '' : ' fpin--main') + (k % 2 ? ' fpin--sm' : '');
      el.innerHTML = '<b>' + o.label + '</b><i></i>';
      pinsBox.appendChild(el);
      pins.push({ el: el, x: o.pin[0], y: o.pin[1], k: k });
    });
  }
  function drawPins(p, L, f) {
    var a = seg(p, .15, .2) * (1 - seg(p, .37, .43));
    pinsBox.style.opacity = a;
    pinsBox.style.visibility = a > 0 ? 'visible' : 'hidden';
    cap.style.opacity = seg(p, .17, .22) * (1 - seg(p, .35, .4));
    if (a <= 0) return;
    var z = zoomAt(f), c = 1;
    if (portrait()) {                                           // телефон: метки сжимаем по ширине, чтобы все были на экране
      var mx = 1;
      pins.forEach(function (q) { mx = Math.max(mx, Math.abs(q.x - PC[0]) * z * L.s); });
      c = Math.min(1, (W / 2 - 24) / mx);
    }
    pins.forEach(function (q) {
      var sx = L.x + (PC[0] + (q.x - PC[0]) * z) * L.s, sy = L.y + (PC[1] + (q.y - PC[1]) * z) * L.s;
      sx = W / 2 + (sx - W / 2) * c;
      q.el.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0)';
      q.el.style.opacity = seg(p, .15 + q.k * .005, .18 + q.k * .005);
    });
  }

  // слой на земле
  var landPlots = $('#landPlots');
  var landNodes = PLOTS.map(function (p) { var g = plotNode(p, 'p'); landPlots.appendChild(g); return g; });
  var roofs = land.querySelectorAll('.land-roof path'), roofLen = roofs[0].getTotalLength();
  roofs.forEach(function (r) { r.style.strokeDasharray = roofLen; r.style.strokeDashoffset = roofLen; });
  var wins = land.querySelectorAll('.land-win rect');
  var nameT = land.querySelector('.draw-t'), sub = land.querySelector('.land-sub');
  nameT.style.strokeDasharray = '1200 1200'; nameT.style.strokeDashoffset = 1200;

  var W = 0, H = 0, dpr = 0, need = true, P = 0, lastLand = '', flyTop = 0, flySpan = 1;
  function size() {
    var d = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    var w = stage.clientWidth, h = stage.clientHeight;
    if (w === W && h === H && d === dpr) return;   // адресная строка iOS: размер сцены тот же, canvas не трогаем
    dpr = d; W = w; H = h;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    lastLand = '';
    need = true;
  }

  // кадр 16:9 «на весь экран» во время снижения и итоговая раскладка в конце
  var IA = 1400 / 791;
  function portrait() { return W < 761 && H > W; }
  function layout(t) {
    var cover = Math.max(W / 1400, H / 791);
    var s0 = cover, cx0 = W / 2 - 700 * s0, cy0 = H / 2 - 395.5 * s0;
    var s1, cx1, cy1;
    if (portrait()) {
      // телефон: кадр расширяется во время снижения (масштаб по логарифму, чтобы посёлок
      // на экране всё время рос), к концу посёлок целиком по ширине, над карточкой
      s1 = W / 960;
      var k = Math.pow(s1 / s0, t), sc = s0 * k;
      var u = ease(seg(P, .88, .95));                             // поднимаем кадр, когда выезжает карточка
      var fx = 700 + 16 * t, fy = 395.5 - 12 * t, Y = H / 2 + (H * 0.34 - H / 2) * u;
      return { s: sc, x: W / 2 - fx * sc, y: Y - fy * sc };
    } else {
      // компьютер: посёлок слева, справа место под карточку
      // компьютер: весь посёлок вместе с трассой слева, справа место под карточку
      var right = W > 900 ? Math.min(480, W * 0.34) : 0;
      s1 = Math.min(cover, (W - right - 24) / 900, (H - 84) / 791);
      cx1 = (W - right) / 2 - 716 * s1;
      cy1 = H / 2 - 395.5 * s1 + 30;
    }
    var e = ease(t);
    return { s: s0 + (s1 - s0) * e, x: cx0 + (cx1 - cx0) * e, y: cy0 + (cy1 - cy0) * e };
  }

  // crop: какую часть ширины полного кадра занимает картинка (кадры для телефона - центральная полоса)
  function drawImg(im, L, alpha, crop) {
    if (!im || alpha <= 0) return;
    crop = crop || [0, 1];
    var full = 1400 * L.s;                                   // ширина полного кадра на экране
    var iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    var w = full * crop[1], h = w * ih / iw;
    var fh = crop[1] === 1 ? h : full * 9 / 16;              // высота полного кадра (видео 16:9)
    ctx.globalAlpha = alpha;
    ctx.drawImage(im, L.x + full * crop[0], L.y + (791 * L.s - fh) / 2, w, h);
    ctx.globalAlpha = 1;
  }

  function fadeEdges(L, k) {
    if (k <= 0) return;
    var x0 = L.x, y0 = L.y, x1 = L.x + 1400 * L.s, y1 = L.y + 791 * L.s, f = 90 * k;
    var bg = 'rgba(14,18,12,', g;
    ctx.fillStyle = '#0e120c';
    if (x1 < W) ctx.fillRect(x1, 0, W - x1, H);
    if (x0 > 0) ctx.fillRect(0, 0, x0, H);
    if (y0 > 0) ctx.fillRect(0, 0, W, y0);
    if (y1 < H) ctx.fillRect(0, y1, W, H - y1);
    if (x1 < W + f) { g = ctx.createLinearGradient(x1 - f * 2.2, 0, x1, 0); g.addColorStop(0, bg + '0)'); g.addColorStop(1, bg + '1)'); ctx.fillStyle = g; ctx.fillRect(x1 - f * 2.2, 0, f * 2.2, H); }
    if (y0 > -f) { g = ctx.createLinearGradient(0, y0, 0, y0 + f); g.addColorStop(0, bg + '1)'); g.addColorStop(1, bg + '0)'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, f); }
    if (y1 < H + f) { g = ctx.createLinearGradient(0, y1 - f, 0, y1); g.addColorStop(0, bg + '0)'); g.addColorStop(1, bg + '1)'); ctx.fillStyle = g; ctx.fillRect(0, y1 - f, W, f); }
  }

  function render() {
    if (!need) return;
    need = false;
    var p = P;

    var tMove = portrait() ? seg(p, .2, .66) : seg(p, .7, .8);
    var L = layout(tMove);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0e120c';
    ctx.fillRect(0, 0, W, H);

    var fp = seg(p, 0, .64) * (N - 1);
    var fi = Math.floor(fp), ff = fp - fi;
    var stillA = seg(p, .64, .67);
    if (N && stillA < 1) {
      var a = nearest(fi), b = frames[fi + 1];
      if (a) drawImg(a, L, 1, film.crop); else if (still.complete) drawImg(still, L, 1);
      if (b && b.ok && ff > .02) drawImg(b.im, L, ff, film.crop);   // плавный переход между соседними кадрами
    }
    if (still.complete && (stillA > 0 || !N)) drawImg(still, L, N ? stillA : 1);
    fadeEdges(L, tMove);
    if (pins.length) drawPins(p, L, fp);

    // слой на земле в тех же координатах
    // слой на земле: пока скрыт - не трогаем, размер меняем только когда он изменился
    var landA = seg(p, .7, .73);
    land.style.opacity = landA;
    land.style.visibility = landA > 0 ? 'visible' : 'hidden';
    if (landA > 0) {
      var sz = (1400 * L.s).toFixed(1) + 'x' + (791 * L.s).toFixed(1);
      if (sz !== lastLand) {
        lastLand = sz;
        land.style.width = (1400 * L.s) + 'px';
        land.style.height = (791 * L.s) + 'px';
      }
      land.style.transform = 'translate3d(' + L.x.toFixed(1) + 'px,' + L.y.toFixed(1) + 'px,0)';
    }
    hud.style.opacity = 1 - seg(p, .68, .74);
    note.style.opacity = portrait() ? 1 - seg(p, .68, .74) : 1;
    var r = seg(p, .74, .84);
    var ro = (roofLen * (1 - ease(r))).toFixed(1);
    roofs[0].style.strokeDashoffset = ro; roofs[1].style.strokeDashoffset = ro;
    var w = seg(p, .82, .85);
    for (var i = 0; i < wins.length; i++) wins[i].style.opacity = w;
    var n = seg(p, .76, .88);
    nameT.style.strokeDashoffset = 1200 * (1 - n);
    nameT.style.fill = 'rgba(207,226,122,' + (seg(p, .85, .9) * .95) + ')';
    nameT.style.strokeOpacity = 1 - seg(p, .88, .92) * .6;
    sub.style.opacity = seg(p, .88, .91);
    landNodes.forEach(function (g, k) {
      var a = seg(p, .84 + k * .006, .88 + k * .006);
      g.style.opacity = a;
    });

    // надпись в облаках: камера пролетает сквозь неё
    var it = seg(p, 0, .12);
    intro.style.opacity = 1 - seg(p, .03, .11);
    intro.style.visibility = p > .11 ? 'hidden' : 'visible';
    intro.style.transform = 'scale(' + (1 + it * it * 2.4).toFixed(3) + ')';
    hint.style.opacity = p > .015 ? 0 : 1;

    var altP = seg(p, 0, .64);
    var alt = Math.round(5000 * Math.pow(250 / 5000, altP) / 10) * 10;
    var altT = alt.toLocaleString('ru-RU').replace(/ /g, ' ') + ' м';
    if (altEl.textContent !== altT) altEl.textContent = altT;
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';

    card.classList.toggle('is-on', p > (portrait() ? .9 : .93));
  }

  // геометрию считаем при загрузке и resize, при прокрутке только scrollY (без принудительного layout)
  function measure() {
    flyTop = fly.getBoundingClientRect().top + window.scrollY;
    flySpan = Math.max(1, fly.offsetHeight - stage.offsetHeight);
  }
  function onScroll() {
    var np = clamp((window.scrollY - flyTop) / flySpan, 0, 1);
    if (np !== P) { P = np; need = true; }
    onHeader();
  }

  var queued = false;
  function loop() { queued = false; render(); }
  function kick() { if (!queued) { queued = true; requestAnimationFrame(loop); } }

  if (reduced) { P = 1; fly.style.height = '100vh'; }
  size();
  measure();
  onScroll();
  window.addEventListener('resize', function () { size(); measure(); onScroll(); kick(); });
  window.addEventListener('scroll', function () { onScroll(); kick(); }, { passive: true });
  window.addEventListener('load', function () { measure(); onScroll(); kick(); });
  kick();
})();
