/* Инвест 47 - глобус с объектами, список объектов, окно объекта.
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

  /* ---------- фильтр по типу (общий для глобуса и списка) ---------- */
  var kind = '';
  var match = function (i) { return !kind || OBJ[i].kind === kind; };
  var orb = null;
  var cards = document.querySelectorAll('#objs .oc');
  function applyFilter() {
    cards.forEach(function (c) { c.hidden = !match(+c.getAttribute('data-i')); });
    if (orb) orb.filter();
  }
  var chips = $('#roadChips');
  if (chips) chips.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    kind = b.getAttribute('data-kind');
    chips.querySelectorAll('button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    applyFilter();
    if (orb) { for (var i = 0; i < N; i++) if (match(i)) { orb.go(i); break; } }
  });

  /* ---------- глобус: объекты по кругу вокруг Земли ---------- */
  var section = $('#obekty');
  if (!section) return;
  function hideOrb() {
    // без анимации или без WebGL: глобус не показываем, ссылки ведут к списку
    section.hidden = true;
    document.querySelectorAll('a[href="#obekty"]').forEach(function (a) { a.setAttribute('href', '#vse-obekty'); });
  }
  var hasGL = (function () { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (reduced || !hasGL) { hideOrb(); return; }

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
  var stage = $('.orb__stage', section), glBox = $('#orbGl'), labelsBox = $('#orbLabels'), card = $('#roadCard');
  var STEP = Math.PI * 2 / N;
  section.style.setProperty('--n', N);

  /* прокрутка -> номер объекта (d), у каждого объекта камера задерживается */
  var W = 0, H = 0, top0 = 0, span = 1, target = -0.5, cur = -0.5;
  function measure() {
    W = stage.clientWidth; H = stage.clientHeight;
    top0 = section.getBoundingClientRect().top + window.scrollY;
    span = Math.max(1, section.offsetHeight - H);
  }
  var posOf = function (q) { return -0.5 + q * (N - 0.2); };
  var qOf = function (i) { return (i + 0.5) / (N - 0.2); };
  function onScroll() {
    var q = clamp((window.scrollY - top0) / span, 0, 1), pos = posOf(q), fl = Math.floor(pos);
    target = fl + sm(sm(pos - fl));
  }
  function go(i) { window.scrollTo({ top: top0 + qOf(i) * span + 1, behavior: 'smooth' }); }

  /* карточка объекта */
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

  var api = { ready: false, filter: function () {} };
  orb = { go: go, filter: function () { api.filter(); } };

  measure(); onScroll();
  window.addEventListener('resize', function () { measure(); onScroll(); if (api.resize) api.resize(); });
  window.addEventListener('load', function () { measure(); onScroll(); });
  window.addEventListener('scroll', onScroll, { passive: true });
  // пролёт выше меняет высоту страницы, пока грузятся кадры
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); onScroll(); }).observe(document.body);

  // three.js грузим, когда до глобуса осталось полтора экрана
  var visible = false, started = false;
  new IntersectionObserver(function (en) {
    var e = en[0];
    if (e.isIntersecting && !started) {
      started = true;
      import(THREE_URL).then(build).catch(function () { hideOrb(); });
    }
  }, { rootMargin: '150% 0px' }).observe(section);
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && api.kick) api.kick(); }).observe(section);

  function build(T) {
    var mobile = function () { return W < 760; };
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.75 : 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    glBox.appendChild(renderer.domElement);
    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(30, 1, .1, 200);
    var loader = new T.TextureLoader();

    var R = 1.45, RING = 2.95, TILT = .3;
    var root = new T.Group(); scene.add(root);

    /* Земля: день + огни городов на ночной стороне + ободок атмосферы (текстуры NASA) */
    var day = loader.load('/assets/img/earth-day.webp'); day.colorSpace = T.SRGBColorSpace; day.anisotropy = 4;
    var night = loader.load('/assets/img/earth-night.webp');
    var globeMat = new T.ShaderMaterial({
      uniforms: { day: { value: day }, night: { value: night }, sun: { value: new T.Vector3(-.62, .48, .62).normalize() } },
      vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform sampler2D day;uniform sampler2D night;uniform vec3 sun;varying vec2 vUv;varying vec3 vN;varying vec3 vV;' +
        'void main(){vec3 n=normalize(vN);float l=dot(n,sun);float k=smoothstep(-.18,.3,l);' +
        'vec3 d=texture2D(day,vUv).rgb*vec3(.62,.7,.58);' +
        'float c=texture2D(night,vUv).r;vec3 nc=vec3(1.,.8,.42)*pow(c,1.7)*1.5+vec3(.004,.007,.01);' +
        'vec3 col=mix(nc,d*(.18+1.05*max(l,0.)),k);' +
        'float f=pow(1.-max(dot(n,vV),0.),3.);col+=vec3(.45,.68,.32)*f*.35;' +
        'gl_FragColor=vec4(col,1.);\n#include <colorspace_fragment>\n}'
    });
    var tiltG = new T.Group(); root.add(tiltG);
    var globe = new T.Mesh(new T.SphereGeometry(R, 96, 64), globeMat);
    tiltG.add(globe);
    var atm = new T.Mesh(new T.SphereGeometry(R * 1.12, 64, 48), new T.ShaderMaterial({
      vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 vN;void main(){float i=pow(.7-dot(vN,vec3(0.,0.,1.)),3.)*.55;gl_FragColor=vec4(vec3(.55,.8,.42)*i,i);}',
      side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false
    }));
    tiltG.add(atm);

    // Петербург и Ленобласть смотрят на зрителя, чуть выше центра
    var lat = 59.94 * Math.PI / 180, lon = 30.31 * Math.PI / 180;
    var phi = lon + Math.PI, th = Math.PI / 2 - lat;
    var spb = new T.Vector3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
    var spin0 = Math.atan2(-spb.x, spb.z);
    tiltG.rotation.x = 35 * Math.PI / 180;

    // точка на Петербурге: свечение и расходящееся кольцо
    function glowTex(inner) {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      if (inner) { g.addColorStop(0, 'rgba(240,255,190,1)'); g.addColorStop(.18, 'rgba(207,226,122,.95)'); g.addColorStop(.45, 'rgba(207,226,122,.25)'); g.addColorStop(1, 'rgba(207,226,122,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      else { x.strokeStyle = 'rgba(207,226,122,1)'; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.stroke(); }
      var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
    }
    var dot = new T.Sprite(new T.SpriteMaterial({ map: glowTex(true), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    dot.scale.setScalar(.34);
    var ring = new T.Sprite(new T.SpriteMaterial({ map: glowTex(false), blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    var spbPos = spb.clone().multiplyScalar(R * 1.01);
    dot.position.copy(spbPos); ring.position.copy(spbPos);
    globe.add(dot); globe.add(ring);

    /* карточки объектов на кольце вокруг Земли */
    var ringG = new T.Group(); ringG.rotation.x = TILT; root.add(ringG);
    var CW = 1.2, CH = .9, TW = 640, TH = 480;
    function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
    var frameTex = (function () {
      var c = document.createElement('canvas'); c.width = TW + 120; c.height = TH + 120;
      var x = c.getContext('2d');
      x.shadowColor = 'rgba(207,226,122,.9)'; x.shadowBlur = 40;
      x.strokeStyle = 'rgba(207,226,122,1)'; x.lineWidth = 6;
      rr(x, 60, 60, TW, TH, 30); x.stroke();
      var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
    })();
    var cards3 = OBJ.map(function (o, i) {
      var c = document.createElement('canvas'); c.width = TW; c.height = TH;
      var x = c.getContext('2d');
      x.fillStyle = '#18200f'; rr(x, 0, 0, TW, TH, 30); x.fill();
      var tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
      var im = new Image();
      im.onload = function () {
        // картинка «по размеру карточки», затемнение по краям и тонкая рамка - чтобы карточки были одной серией
        x.save(); rr(x, 0, 0, TW, TH, 30); x.clip();
        var s = Math.max(TW / im.width, TH / im.height);
        x.drawImage(im, (TW - im.width * s) / 2, (TH - im.height * s) / 2, im.width * s, im.height * s);
        var g = x.createLinearGradient(0, 0, 0, TH);
        g.addColorStop(0, 'rgba(8,11,6,.12)'); g.addColorStop(.6, 'rgba(8,11,6,0)'); g.addColorStop(1, 'rgba(8,11,6,.5)');
        x.fillStyle = g; x.fillRect(0, 0, TW, TH);
        var v = x.createRadialGradient(TW / 2, TH / 2, TH * .35, TW / 2, TH / 2, TW * .62);
        v.addColorStop(0, 'rgba(8,11,6,0)'); v.addColorStop(1, 'rgba(8,11,6,.45)');
        x.fillStyle = v; x.fillRect(0, 0, TW, TH);
        x.restore();
        x.strokeStyle = 'rgba(238,240,230,.42)'; x.lineWidth = 3; rr(x, 1.5, 1.5, TW - 3, TH - 3, 29); x.stroke();
        tex.needsUpdate = true; need = true;
      };
      im.src = '/assets/img/obj/' + o.img + '-s.webp';
      var mesh = new T.Mesh(new T.PlaneGeometry(CW, CH), new T.MeshBasicMaterial({ map: tex, transparent: true }));
      mesh.userData.i = i;
      var frame = new T.Mesh(new T.PlaneGeometry(CW * (TW + 120) / TW, CH * (TH + 120) / TH), new T.MeshBasicMaterial({ map: frameTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
      frame.position.z = -.002;
      var g = new T.Group(); g.add(frame); g.add(mesh);
      ringG.add(g);
      // дуга от Петербурга к объекту
      var pts = new Float32Array(25 * 3);
      var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pts, 3));
      var line = new T.Line(geo, new T.LineBasicMaterial({ color: 0xcfe27a, transparent: true, opacity: .15, blending: T.AdditiveBlending, depthWrite: false }));
      scene.add(line);
      var lab = document.createElement('button');
      lab.type = 'button'; lab.className = 'ol'; lab.tabIndex = -1; lab.setAttribute('data-open', i);
      lab.innerHTML = '<span class="ol__n">' + pad(i + 1) + '</span><span class="ol__t">' + esc(o.label) + '</span>';
      labelsBox.appendChild(lab);
      return { g: g, mesh: mesh, frame: frame, line: line, pts: pts, lab: lab, dim: 0 };
    });

    /* раскладка: на компьютере Земля правее (слева карточка), на телефоне выше (внизу карточка) */
    var visW = 0, visH = 0;
    function resize() {
      renderer.setSize(W, H, false);
      renderer.domElement.style.width = W + 'px'; renderer.domElement.style.height = H + 'px';
      cam.aspect = W / H;
      var t = Math.tan(cam.fov * Math.PI / 360) * 2;
      var m = mobile(), needW = m ? 4.6 : 11.8, needH = m ? 8.6 : 6.1;
      var dist = Math.max(needH / t, needW / (t * cam.aspect));
      visH = dist * t; visW = visH * cam.aspect;
      cam.position.set(0, dist * .14, dist);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
      root.position.set(m ? 0 : visW * .17, m ? visH * .12 : -.1, 0);
      need = true;
    }
    W = stage.clientWidth; H = stage.clientHeight;
    resize();

    var invRing = new T.Quaternion(), tmpQ = new T.Quaternion(), wp = new T.Vector3(), sp = new T.Vector3(), mp = new T.Vector3(), cp = new T.Vector3(), v3 = new T.Vector3();
    var need = true, t0 = performance.now(), last = t0;
    function frame() {
      var now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
      var k = 1 - Math.pow(.0009, dt);                           // плавное догоняние прокрутки
      cur += (target - cur) * k;
      if (Math.abs(target - cur) < 1e-4) cur = target;
      var d = cur, time = (now - t0) / 1000;
      var a = clamp(Math.round(d), 0, N - 1);

      globe.rotation.y = spin0 + .32 - clamp((d + .5) / N, 0, 1) * .64 + Math.sin(time * .15) * .03;
      var pulse = (time * .6) % 1;
      ring.scale.setScalar(.12 + pulse * .55); ring.material.opacity = 1 - pulse;
      dot.scale.setScalar(.3 + Math.sin(time * 3) * .03);

      ringG.updateMatrixWorld();
      ringG.getWorldQuaternion(invRing); invRing.invert();
      tmpQ.copy(invRing).multiply(cam.quaternion);
      dot.getWorldPosition(mp);

      cards3.forEach(function (c, i) {
        var ang = (i - d) * STEP;
        c.g.position.set(RING * Math.sin(ang), 0, RING * Math.cos(ang));
        c.g.quaternion.copy(tmpQ);                              // карточка всегда смотрит в камеру
        var f = Math.pow((Math.cos(ang) + 1) / 2, 2.2);          // 1 - спереди, 0 - сзади
        var on = i === a && Math.abs(d - a) < .35;
        c.g.scale.setScalar(.5 + .62 * f + (on ? .06 : 0));
        var dim = match(i) ? 1 : .22;
        c.mesh.material.color.setScalar((.2 + .8 * f) * dim);
        c.frame.material.opacity += ((on && match(i) ? 1 : 0) - c.frame.material.opacity) * .2;
        c.g.renderOrder = Math.round(f * 100);

        // дуга от Петербурга, только к видимым спереди
        c.g.getWorldPosition(wp);
        cp.copy(mp).add(wp).multiplyScalar(.5);
        v3.copy(cp).sub(root.position).normalize().multiplyScalar(.9);
        cp.add(v3); cp.y += .35;
        for (var j = 0; j <= 24; j++) {
          var t = j / 24, u = 1 - t;
          c.pts[j * 3] = u * u * mp.x + 2 * u * t * cp.x + t * t * wp.x;
          c.pts[j * 3 + 1] = u * u * mp.y + 2 * u * t * cp.y + t * t * wp.y;
          c.pts[j * 3 + 2] = u * u * mp.z + 2 * u * t * cp.z + t * t * wp.z;
        }
        c.line.geometry.attributes.position.needsUpdate = true;
        c.line.material.opacity = (on ? .75 : .14 * f) * dim;
        c.line.visible = f > .25;

        // подпись под карточкой
        sp.set(0, -CH / 2, 0); c.g.localToWorld(sp); sp.project(cam);
        var show = f > .45;
        if (show) {
          c.lab.style.transform = 'translate3d(' + ((sp.x + 1) / 2 * W).toFixed(1) + 'px,' + ((1 - sp.y) / 2 * H).toFixed(1) + 'px,0) scale(' + (.75 + .25 * f).toFixed(3) + ')';
          c.lab.style.opacity = Math.min(1, (f - .45) * 3) * (match(i) ? 1 : .35);
        }
        c.lab.style.visibility = show ? '' : 'hidden';
        c.lab.classList.toggle('is-on', on);
      });

      if (a !== active) { active = a; showCard(a); }
      card.classList.toggle('is-hide', d < -.3);
      renderer.render(scene, cam);
    }
    var raf = 0;
    function loop() { raf = 0; frame(); if (visible) raf = requestAnimationFrame(loop); }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }

    // нажатие на карточку на сцене открывает объект
    var ray = new T.Raycaster(), ptr = new T.Vector2();
    function hit(e) {
      var r = renderer.domElement.getBoundingClientRect();
      ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(ptr, cam);
      var hs = ray.intersectObjects(cards3.map(function (c) { return c.mesh; }), false);
      return hs.length ? hs[0].object.userData.i : -1;
    }
    stage.addEventListener('click', function (e) {
      if (e.target.closest('button,a')) return;
      var i = hit(e);
      if (i >= 0) openObj(i);
    });
    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      glBox.style.cursor = !e.target.closest('button,a') && hit(e) >= 0 ? 'pointer' : '';
    });

    api.resize = function () { resize(); kick(); };
    api.kick = kick;
    api.filter = function () { kick(); };
    section.classList.add('is-ready');
    kick();
  }
})();
