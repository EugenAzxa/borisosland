/* Инвест 47 - пролёт с неба над лесом с точками объектов, генплан, карточки */
(function () {
  'use strict';

  /* ---------- настройки: правки здесь ---------- */
  var CONFIG = {
    film: {
      d: { dir: 'assets/film/d3/', count: 139, crop: [0, 1] },      // кадры для компьютера, весь кадр 16:9
      m: { dir: 'assets/film/m6/', count: 90, crop: [.1, .8] }       // телефон: центральные 80% ширины, 720 px
    },
    still: 'assets/img/forest.webp' // финальный кадр: лес с 1500 м, в координатах 1400 x 791 (метки объектов - pin в lib/objects.js)
  };

  /* Участки в координатах финального кадра (1400 x 791), раскладка как на плане парка:
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
      '<a class="btn" href="' + phoneHref + '">Позвонить по участку</a>' +
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
      '<a class="btn" href="' + phoneHref + '">Позвонить по участку</a>';
  }
  $('.plan__map').addEventListener('mouseleave', function () {
    if (window.matchMedia('(hover: hover)').matches && current) { current.classList.remove('is-on'); current = null; info.innerHTML = infoDefault; }
  });

  /* ---------- пролёт ---------- */
  var fly = $('#fly'), stage = $('.fly__stage'), cv = $('#flyCv'), ctx = cv.getContext('2d');
  var intro = $('#flyIntro'), card = $('#flyCard'), hint = $('#flyHint');
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

  // метки объектов Инвест 47: загораются над лесом, когда камера закончила снижение.
  // Координаты - pin в lib/objects.js, на финальном кадре (1400 x 791)
  var pinsBox = $('#flyPins'), cap = $('#flyCap'), pins = [];
  var objData = document.getElementById('objData');
  if (pinsBox && objData) {
    JSON.parse(objData.textContent).forEach(function (o, k) {
      // точка - кнопка: открывает окно объекта (обработчик [data-open] в objects.js)
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'fpin';
      el.setAttribute('data-open', k);
      el.setAttribute('aria-label', 'Объект ' + (k + 1) + ': ' + o.title);
      el.innerHTML = '<b>' + o.label + '</b><i><u>' + (k + 1) + '</u></i>';
      pinsBox.appendChild(el);
      pins.push({ el: el, x: o.pin[0], y: o.pin[1], k: k });
    });
  }
  function drawPins(p, L) {
    var a = seg(p, .72, .76);
    pinsBox.style.opacity = a;
    pinsBox.style.visibility = a > 0 ? 'visible' : 'hidden';
    cap.style.opacity = seg(p, .74, .79) * (1 - seg(p, .86, .9));
    if (a <= 0) return;
    // телефон: кадр показан уже, чем разброс меток, - сжимаем их по ширине к центру (метки условные, не адреса)
    var c = portrait() ? Math.min(1, (W / 2 - 22) / (414 * L.s)) : 1, cx = L.x + 716 * L.s;
    pins.forEach(function (q) {
      var sx = L.x + q.x * L.s, sy = L.y + q.y * L.s;
      sx = cx + (sx - cx) * c;
      q.el.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0)';
      var qa = seg(p, .72 + q.k * .007, .75 + q.k * .007);
      q.el.style.opacity = qa;
      q.el.style.pointerEvents = qa > .5 ? 'auto' : 'none';
    });
  }

  var W = 0, H = 0, dpr = 0, need = true, P = 0, flyTop = 0, flySpan = 1;
  function size() {
    var d = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    var w = stage.clientWidth, h = stage.clientHeight;
    if (w === W && h === H && d === dpr) return;   // адресная строка iOS: размер сцены тот же, canvas не трогаем
    dpr = d; W = w; H = h;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
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
      // телефон: кадр расширяется во время снижения (масштаб по логарифму, чтобы парк
      // на экране всё время рос), к концу парк целиком по ширине, над карточкой
      s1 = W / 700;
      var k = Math.pow(s1 / s0, t), sc = s0 * k;
      var u = ease(seg(P, .86, .93));                             // поднимаем кадр, когда выезжает карточка
      var fx = 700 + 16 * t, fy = 395.5 - 12 * t, Y = H / 2 + (H * 0.34 - H / 2) * u;
      return { s: sc, x: W / 2 - fx * sc, y: Y - fy * sc };
    } else {
      // компьютер: парк слева, справа место под карточку
      // компьютер: весь парк вместе с трассой слева, справа место под карточку
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

    var tMove = portrait() ? seg(p, .2, .72) : seg(p, .78, .88);
    var L = layout(tMove);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0e120c';
    ctx.fillRect(0, 0, W, H);

    var fp = seg(p, 0, .7) * (N - 1);
    var fi = Math.floor(fp), ff = fp - fi;
    var stillA = seg(p, .7, .73);
    if (N && stillA < 1) {
      var a = nearest(fi), b = frames[fi + 1];
      if (a) drawImg(a, L, 1, film.crop); else if (still.complete) drawImg(still, L, 1);
      if (b && b.ok && ff > .02) drawImg(b.im, L, ff, film.crop);   // плавный переход между соседними кадрами
    }
    if (still.complete && (stillA > 0 || !N)) drawImg(still, L, N ? stillA : 1);
    fadeEdges(L, tMove);
    if (pins.length) drawPins(p, L);

    hud.style.opacity = 1 - seg(p, .76, .8);
    note.style.opacity = portrait() ? 1 - seg(p, .76, .8) : 1;

    // надпись в облаках: камера пролетает сквозь неё
    var it = seg(p, 0, .12);
    intro.style.opacity = 1 - seg(p, .03, .11);
    intro.style.visibility = p > .11 ? 'hidden' : 'visible';
    intro.style.transform = 'scale(' + (1 + it * it * 2.4).toFixed(3) + ')';
    hint.style.opacity = p > .015 ? 0 : 1;

    var altP = seg(p, 0, .7);
    var alt = Math.round(5000 * Math.pow(1500 / 5000, altP) / 10) * 10;
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
  // прокрутка задаёт цель, а пролёт плавно догоняет её: колесо мыши и рывки пальцем не прыгают через кадры
  var T = 0, last = 0, first = true;
  function onScroll() {
    T = reduced ? 1 : clamp((window.scrollY - flyTop) / flySpan, 0, 1);
    if (first || reduced) { P = T; first = false; need = true; }
    onHeader();
  }

  var queued = false;
  function loop(now) {
    queued = false;
    var dt = last ? Math.min(.12, (now - last) / 1000) : .016;   // при подтормаживании догоняем по реальному времени
    last = now;
    if (P !== T) {
      // далеко от цели (прыжок по ссылке) - догоняем быстрее, чтобы не пролетать весь фильм
      var rate = Math.abs(T - P) > .15 ? 14 : 7.5;
      P += (T - P) * (1 - Math.exp(-dt * rate));
      if (Math.abs(T - P) < .0003) P = T;
      need = true;
    }
    render();
    if (P !== T) kick(); else last = 0;
  }
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
