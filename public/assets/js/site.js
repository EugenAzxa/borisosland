/* Инвест 47 - общее для всех страниц: телефон, меню, формы */
(function () {
  'use strict';

  /* ---------- телефон: правка здесь ---------- */
  var PHONE = '';   // например '+7 921 000-00-00' - появится во всех кнопках «Позвонить»
  window.INVEST47 = { phone: PHONE };

  var tel = PHONE ? 'tel:' + PHONE.replace(/[^\d+]/g, '') : '';
  document.querySelectorAll('[data-phone-link]').forEach(function (a) {
    if (tel) { a.href = tel; a.hidden = false; if (a.textContent.trim() === 'Связаться') a.textContent = 'Позвонить'; }
  });
  document.querySelectorAll('[data-phone-text]').forEach(function (s) { s.textContent = PHONE || 'Оставить номер'; });

  /* ---------- меню на телефоне ---------- */
  var burger = document.querySelector('.burger'), top = document.querySelector('.top');
  if (burger) {
    burger.addEventListener('click', function () {
      var on = !top.classList.contains('is-menu');
      top.classList.toggle('is-menu', on);
      burger.setAttribute('aria-expanded', on);
    });
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { top.classList.remove('is-menu'); burger.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---------- формы ---------- */
  var forms = document.querySelectorAll('form[data-form]');
  if (!forms.length) return;

  var token = '';
  function getToken() {
    return fetch('/api/form', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) { token = d.t; return token; });
  }
  getToken().catch(function () {});

  function msg(form, text, bad) {
    var m = form.querySelector('.form__msg');
    m.textContent = text;
    m.classList.toggle('is-bad', !!bad);
  }

  function collect(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { if (typeof v === 'string') o[k] = v; });
    form.querySelectorAll('input[type=checkbox]').forEach(function (c) { o[c.name] = c.checked; });
    o.page = location.pathname;
    return o;
  }

  function post(kind, data) {
    data.t = token;
    return fetch('/api/form?kind=' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Ошибка'); e.field = d.field; throw e; } return d; }); });
  }

  function check(form) {
    var bad = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var ok = el.type === 'checkbox' ? el.checked : el.value.trim() !== '';
      if (el.name === 'phone' && ok) ok = el.value.replace(/\D/g, '').length >= 10;
      el.closest('.f, .chk') && el.closest('.f, .chk').classList.toggle('is-bad', !ok);
      if (!ok && !bad) bad = el;
    });
    if (bad) { bad.focus(); msg(form, bad.name === 'consent' ? 'Отметьте согласие на обработку данных' : bad.name === 'phone' ? 'Проверьте номер телефона' : 'Заполните отмеченные поля', true); }
    return !bad;
  }

  function done(form, title, text) {
    form.innerHTML = '<div class="form__done"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><h2 class="form__t">' + title + '</h2><p class="form__p">' + text + '</p></div>';
  }

  // карточки и кнопки «Узнать про участок» на главной подставляют участок в форму
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lot]');
    if (!a) return;
    var f = document.querySelector('form[data-form=lead]');
    if (f && f.lot) f.lot.value = a.getAttribute('data-lot');
    var t = f && f.querySelector('.form__lot');
    if (t) { t.textContent = a.getAttribute('data-lot'); t.hidden = false; }
  });

  forms.forEach(function (form) {
    var kind = form.getAttribute('data-form');
    var files = [];   // для заявки на витрину: { file, url, path }
    var btn = form.querySelector('button[type=submit]');

    form.addEventListener('input', function (e) { var f = e.target.closest('.f, .chk'); if (f) f.classList.remove('is-bad'); });

    if (kind === 'listing') initPhotos();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!check(form)) return;
      btn.disabled = true;
      var data = collect(form);
      var ready = token ? Promise.resolve() : getToken();
      ready
        .then(function () { return kind === 'listing' ? uploadAll() : null; })
        .then(function (paths) {
          if (paths) data.photos = paths;
          msg(form, 'Отправляем...');
          return post(kind, data);
        })
        .then(function () {
          if (kind === 'lead') done(form, 'Спасибо, номер получили', 'Перезвоним в ближайшее время. Если удобнее в определённые часы - напишем заранее.');
          else done(form, 'Заявка отправлена', 'Проверим участок и документы и свяжемся с вами по указанному телефону. Обычно это занимает несколько рабочих дней.');
          if (window.ym && window.YM_ID) window.ym(window.YM_ID, 'reachGoal', kind);
        })
        .catch(function (err) {
          btn.disabled = false;
          msg(form, err.message || 'Не получилось отправить. Проверьте интернет и попробуйте ещё раз', true);
          if (err.field && form[err.field]) { form[err.field].focus(); var f = form[err.field].closest('.f'); if (f) f.classList.add('is-bad'); }
          if (/устарела/.test(err.message)) getToken();
        });
    });

    /* ----- фото: превью, уменьшение до 1600 px в браузере, загрузка по одному ----- */
    function initPhotos() {
      var input = form.querySelector('input[type=file]'), list = form.querySelector('.ph__list');
      var MAXN = 10;
      input.addEventListener('change', function () {
        Array.prototype.slice.call(input.files).forEach(function (f) {
          if (files.length >= MAXN || !/^image\//.test(f.type)) return;
          files.push({ file: f, url: URL.createObjectURL(f) });
        });
        input.value = '';
        draw();
      });
      function draw() {
        list.innerHTML = '';
        files.forEach(function (it, i) {
          var li = document.createElement('li');
          li.innerHTML = '<img alt="" src="' + it.url + '"><button type="button" aria-label="Убрать фото">×</button>' + (it.path ? '<i class="ok"></i>' : '');
          li.querySelector('button').onclick = function () { files.splice(i, 1); draw(); };
          list.appendChild(li);
        });
        form.querySelector('.ph__n').textContent = files.length ? files.length + ' из ' + MAXN : 'До ' + MAXN + ' фото';
      }
    }

    function shrink(file) {
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (b) { b ? res(b) : rej(new Error('Не удалось обработать фото')); }, 'image/jpeg', .84);
        };
        img.onerror = function () { rej(new Error('Не удалось открыть фото ' + file.name + '. Попробуйте JPEG или PNG')); };
        img.src = URL.createObjectURL(file);
      });
    }

    function uploadAll() {
      var paths = [], i = 0;
      function next() {
        if (i >= files.length) return Promise.resolve(paths);
        var it = files[i++];
        if (it.path) { paths.push(it.path); return next(); }
        msg(form, 'Загружаем фото ' + i + ' из ' + files.length + '...');
        return shrink(it.file)
          .then(function (blob) { return fetch('/api/photo', { method: 'POST', headers: { 'x-form': token, 'content-type': 'application/octet-stream' }, body: blob }); })
          .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Фото не загрузилось'); return d; }); })
          .then(function (d) { it.path = d.path; paths.push(d.path); return next(); });
      }
      return next();
    }
  });
})();
