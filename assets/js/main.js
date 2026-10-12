/* Инвест 47 - пролёт с неба к участкам, генплан, карточки */
(function () {
  'use strict';

  /* ---------- настройки: правки здесь ---------- */
  var CONFIG = {
    phone: '',               // например '+7 921 000-00-00' - появится во всех кнопках «Позвонить»
    film: {
      d: { dir: 'assets/film/d1/', count: 139, crop: [0, 1] },      // кадры для компьютера, весь кадр 16:9
      m: { dir: 'assets/film/m1/', count: 139, crop: [.3, .4] }     // телефон: центральные 40% ширины кадра
    },
    still: 'assets/img/plan.webp' // финальный кадр сверху, в координатах 1400 x 791
  };

  /* Участки в координатах финального кадра (1400 x 791). Верхний ряд - 7 проданных,
     нижний - 4 больших, первый от трассы с подстанцией. */
  var PLOTS = [
    { x: 305, y: 216, w: 135, h: 146, sold: true },
    { x: 450, y: 216, w: 110, h: 146, sold: true },
    { x: 572, y: 216, w: 116, h: 146, sold: true },
    { x: 698, y: 216, w: 120, h: 146, sold: true },
    { x: 828, y: 216, w: 118, h: 146, sold: true },
    { x: 956, y: 216, w: 90, h: 146, sold: true },
    { x: 1056, y: 216, w: 89, h: 146, sold: true },
    { id: 'u2372', x: 297, y: 401, w: 196, h: 148, area: '23,72', price: 15000000, tp: true,
      title: 'Участок 23,72 сот.',
      kn: 'К/н 47:07:1047002:3249, 3250',
      points: ['Промназначение', '150 кВт подключены, подстанция на участке', 'Доля 4 сот. в общей дороге в собственность', 'Первый от трассы Кола'] },
    { x: 503, y: 401, w: 219, h: 148, sold: true },
    { id: 'u2085', x: 733, y: 401, w: 223, h: 148, area: '20,85',
      title: 'Участок 20,85 сот.',
      points: ['Промназначение', 'Подъезд по общей внутренней дороге', 'Выезд на Мурманское шоссе', 'Без управляющей компании'] },
    { id: 'u265', x: 967, y: 401, w: 191, h: 148, area: '26,5',
      title: 'Участок 26,5 сот.',
      points: ['Самый большой из свободных', 'Промназначение', 'Подъезд по общей внутренней дороге', 'Без управляющей компании'] }
  ];
  var FREE = PLOTS.filter(function (p) { return !p.sold; });
  var SVGNS = 'http://www.w3.org/2000/svg';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var money = function (n) { return n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽'; };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- телефон ---------- */
  var phoneHref = CONFIG.phone ? 'tel:' + CONFIG.phone.replace(/[^\d+]/g, '') : '#kontakty';
  document.querySelectorAll('[data-phone-link]').forEach(function (a) { a.href = phoneHref; });
  document.querySelectorAll('[data-phone-text]').forEach(function (s) { s.textContent = CONFIG.phone || 'Позвонить'; });

  /* ---------- шапка ---------- */
  var top = $('#top');
  function onHeader() { top.classList.toggle('is-solid', window.scrollY > window.innerHeight * 5.2); }

  /* ---------- svg-участки (используются и в пролёте, и в генплане) ---------- */
  function plotNode(p, cls) {
    var g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', cls + ' ' + cls + (p.sold ? '--sold' : '--free'));
    var r = document.createElementNS(SVGNS, 'rect');
    r.setAttribute('x', p.x); r.setAttribute('y', p.y); r.setAttribute('width', p.w); r.setAttribute('height', p.h); r.setAttribute('rx', 4);
    g.appendChild(r);
    var cx = p.x + p.w / 2 + (p.tp ? 22 : 0), cy = p.y + p.h / 2 - (p.tp ? 14 : 0);
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
      '<a class="btn" href="' + phoneHref + '">Узнать про участок</a>';
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
        '<p>Свободными остались три участка в нижнем ряду: 23,72, 20,85 и 26,5 сотки.</p>' +
        '<a class="btn btn--ghost" href="#uchastki">Свободные участки</a>';
      return;
    }
    info.innerHTML = '<p class="eyebrow">Свободен</p><h3>' + p.title + '</h3>' +
      '<p class="price">' + (p.price ? money(p.price) : 'Цена по запросу') + '</p>' +
      '<p>' + p.points.join(' · ') + '</p>' +
      (p.kn ? '<p style="margin-top:8px">' + p.kn + '</p>' : '') +
      '<a class="btn" href="' + phoneHref + '">Узнать про участок</a>';
  }
  $('.plan__map').addEventListener('mouseleave', function () {
    if (window.matchMedia('(hover: hover)').matches && current) { current.classList.remove('is-on'); current = null; info.innerHTML = infoDefault; }
  });

  /* ---------- пролёт ---------- */
  var fly = $('#fly'), stage = $('.fly__stage'), cv = $('#flyCv'), ctx = cv.getContext('2d');
  var intro = $('#flyIntro'), land = $('#flyLand'), card = $('#flyCard'), hint = $('#flyHint');
  var altEl = $('#flyAlt'), bar = $('#flyBar'), hud = $('.fly__hud');
  var mobile = window.innerWidth <= 760 && window.innerHeight > window.innerWidth;
  var film = mobile ? CONFIG.film.m : CONFIG.film.d;
  var N = film.count;
  var frames = new Array(N), still = new Image();
  still.src = CONFIG.still;
  still.onload = function () { need = true; };

  function pad(n) { return ('000' + n).slice(-3); }
  function load(i) {
    if (frames[i]) return;
    var im = new Image();
    im.decoding = 'async';
    im.onload = function () { im.ok = true; need = true; };
    im.src = film.dir + pad(i + 1) + '.webp';
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
      if (frames[i - d] && frames[i - d].ok) return frames[i - d];
      if (frames[i + d] && frames[i + d].ok) return frames[i + d];
    }
    return null;
  }

  // слой на земле
  var landPlots = $('#landPlots');
  var landNodes = PLOTS.map(function (p) { var g = plotNode(p, 'p'); landPlots.appendChild(g); return g; });
  var roof = land.querySelector('.land-roof path'), roofLen = roof.getTotalLength();
  roof.style.strokeDasharray = roofLen; roof.style.strokeDashoffset = roofLen;
  var wins = land.querySelectorAll('.land-win rect');
  var nameT = land.querySelector('.draw-t'), sub = land.querySelector('.land-sub');
  nameT.style.strokeDasharray = 420; nameT.style.strokeDashoffset = 420;

  var W = 0, H = 0, dpr = 1, need = true, P = 0;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    need = true;
  }

  // кадр 16:9 «на весь экран» во время снижения и итоговая раскладка в конце
  var IA = 1400 / 791;
  function layout(t) {
    var cover = Math.max(W / 1400, H / 791);
    var s0 = cover, cx0 = W / 2 - 700 * s0, cy0 = H / 2 - 395.5 * s0;
    var s1, cx1, cy1;
    if (W < 761 && H > W) {
      // телефон: посёлок целиком по ширине, сверху над карточкой
      s1 = W / 960;
      cx1 = W / 2 - 735 * s1;
      cy1 = H * 0.34 - 400 * s1;
    } else {
      // компьютер: посёлок слева, справа место под карточку
      // компьютер: весь посёлок вместе с трассой слева, справа место под карточку
      var right = W > 900 ? Math.min(480, W * 0.34) : 0;
      s1 = Math.min(cover, (W - right - 24) / 1210, (H - 40) / 791);
      cx1 = Math.max(16 - 30 * s1, (W - right) / 2 - 615 * s1);
      cy1 = H / 2 - 395.5 * s1 + 18;
    }
    var e = ease(t);
    return { s: s0 + (s1 - s0) * e, x: cx0 + (cx1 - cx0) * e, y: cy0 + (cy1 - cy0) * e };
  }

  // crop: какую часть ширины полного кадра занимает картинка (кадры для телефона - центральная полоса)
  function drawImg(im, L, alpha, crop) {
    if (!im || alpha <= 0) return;
    crop = crop || [0, 1];
    var full = 1400 * L.s;                                   // ширина полного кадра на экране
    var w = full * crop[1], h = w * im.naturalHeight / im.naturalWidth;
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

    var tMove = seg(p, .7, .8);
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
      if (b && b.ok && ff > .02) drawImg(b, L, ff, film.crop);   // плавный переход между соседними кадрами
    }
    if (still.complete && (stillA > 0 || !N)) drawImg(still, L, N ? stillA : 1);
    fadeEdges(L, tMove);

    // слой на земле в тех же координатах
    land.style.width = (1400 * L.s) + 'px';
    land.style.height = (791 * L.s) + 'px';
    land.style.transform = 'translate(' + L.x + 'px,' + L.y + 'px)';

    land.style.opacity = seg(p, .7, .73);
    hud.style.opacity = 1 - seg(p, .68, .74);
    var r = seg(p, .74, .84);
    roof.style.strokeDashoffset = roofLen * (1 - ease(r));
    var w = seg(p, .82, .85);
    for (var i = 0; i < wins.length; i++) wins[i].style.opacity = w;
    var n = seg(p, .76, .88);
    nameT.style.strokeDashoffset = 420 * (1 - n);
    nameT.style.fill = 'rgba(207,226,122,' + (seg(p, .85, .9) * .95) + ')';
    nameT.style.strokeOpacity = 1 - seg(p, .88, .92) * .6;
    sub.style.opacity = seg(p, .88, .91);
    landNodes.forEach(function (g, k) {
      var a = seg(p, .84 + k * .006, .88 + k * .006);
      g.style.opacity = a;
    });

    // надпись в облаках: камера пролетает сквозь неё
    var it = seg(p, 0, .12);
    intro.style.opacity = 1 - seg(p, .03, .12);
    intro.style.transform = 'scale(' + (1 + it * it * 2.4) + ')';
    intro.style.filter = it > 0 ? 'blur(' + (it * 8).toFixed(1) + 'px)' : '';
    hint.style.opacity = p > .015 ? 0 : 1;

    var altP = seg(p, 0, .64);
    var alt = Math.round(5000 * Math.pow(250 / 5000, altP) / 10) * 10;
    altEl.textContent = alt.toLocaleString('ru-RU').replace(/ /g, ' ') + ' м';
    bar.style.width = (p * 100) + '%';

    card.classList.toggle('is-on', p > .93);
  }

  function onScroll() {
    var r = fly.getBoundingClientRect();
    var span = fly.offsetHeight - stage.offsetHeight;
    var np = clamp(-r.top / span, 0, 1);
    if (np !== P) { P = np; need = true; }
    onHeader();
  }

  function loop() { render(); requestAnimationFrame(loop); }

  if (reduced) { P = 1; fly.style.height = '100vh'; }
  size();
  onScroll();
  window.addEventListener('resize', function () { size(); onScroll(); });
  window.addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(loop);
})();
