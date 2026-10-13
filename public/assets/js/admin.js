/* Админка Инвест 47: участки на витрине */
(function () {
  'use strict';
  var root = document.getElementById('adm');
  var KEY = 'inv47-admin';
  var token = '';
  try { token = localStorage.getItem(KEY) || ''; } catch (e) {}
  var data = null, tab = 'pending', open = null;

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return n ? Math.round(n).toLocaleString('ru-RU') + ' ₽' : 'цена не указана'; };
  var when = function (s) { return s ? new Date(s).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; };
  var img = function (p) { return '/api/img?p=' + encodeURIComponent(p); };

  function api(body) {
    return fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(body) })
      .then(function (r) {
        return r.json().then(function (d) {
          if (r.status === 401 && body.action !== 'login') { logout(); throw new Error(d.error); }
          if (!r.ok) throw new Error(d.error || 'Ошибка');
          return d;
        });
      });
  }

  function logout() { token = ''; try { localStorage.removeItem(KEY); } catch (e) {} login(); }

  function login(err) {
    root.innerHTML = '<form class="form adm-login"><h1 class="form__t">Вход в админку</h1>' +
      '<label class="f"><span>Пароль</span><input name="password" type="password" autocomplete="current-password" required></label>' +
      '<button class="btn" type="submit">Войти</button><p class="form__msg is-bad">' + esc(err || '') + '</p></form>';
    var f = root.querySelector('form');
    f.password.focus();
    f.onsubmit = function (e) {
      e.preventDefault();
      api({ action: 'login', password: f.password.value }).then(function (d) {
        token = d.token; try { localStorage.setItem(KEY, token); } catch (e) {}
        load();
      }).catch(function (e) { login(e.message); });
    };
  }

  function load() {
    root.innerHTML = '<p class="adm-wait">Загружаем...</p>';
    api({ action: 'list' }).then(function (d) { data = d; draw(); }).catch(function (e) { if (token) root.innerHTML = '<p class="form__msg is-bad">' + esc(e.message) + '</p>'; });
  }

  var TABS = [['pending', 'Черновики'], ['approved', 'На витрине'], ['rejected', 'Сняты']];

  function draw() {
    var counts = {};
    data.listings.forEach(function (l) { var s = l.status === 'archived' ? 'rejected' : l.status; counts[s] = (counts[s] || 0) + 1; });
    var h = '<div class="adm-top"><div class="chips">' + TABS.map(function (t) {
      return '<button type="button" data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'is-on' : '') + '">' + t[1] + (counts[t[0]] ? ' <b>' + counts[t[0]] + '</b>' : '') + '</button>';
    }).join('') + '</div><div class="adm-act"><button type="button" class="btn btn--sm" data-act="add">Добавить участок</button><button type="button" class="btn btn--ghost btn--sm" data-act="reload">Обновить</button><button type="button" class="btn btn--ghost btn--sm" data-act="logout">Выйти</button></div></div>';
    h += listings();
    root.innerHTML = h;
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; open = null; draw(); }; });
    root.querySelector('[data-act=reload]').onclick = load;
    root.querySelector('[data-act=add]').onclick = function () {
      api({ action: 'create' }).then(function (d) { data.listings.unshift(d.listing); tab = 'pending'; open = d.listing.id; draw(); });
    };
    root.querySelector('[data-act=logout]').onclick = logout;
    bind();
  }

  function listings() {
    var items = data.listings.filter(function (l) { return tab === 'rejected' ? (l.status === 'rejected' || l.status === 'archived') : l.status === tab; });
    if (!items.length) return '<p class="adm-empty">' + (tab === 'pending' ? 'Черновиков нет. Участок добавляете вы сами после звонка владельца: кнопка «Добавить участок».' : 'Пусто.') + '</p>';
    return '<div class="adm-list">' + items.map(function (l) {
      var isOpen = open === l.id;
      return '<article class="adm-card' + (isOpen ? ' is-open' : '') + '" data-id="' + esc(l.id) + '">' +
        '<button type="button" class="adm-head" data-open="' + esc(l.id) + '">' +
          (l.photos && l.photos[0] ? '<img src="' + img(l.photos[0]) + '" alt="">' : '<span class="adm-noimg"></span>') +
          '<span><b>' + esc(l.title) + '</b><i>' + esc(data.kinds[l.kind] || '') + ' · ' + money(l.price) + (l.owner.name || l.owner.phone ? ' · ' + esc(l.owner.name) + ' ' + esc(l.owner.phone) : '') + '</i><i>' + when(l.createdAt) + '</i></span>' +
        '</button>' + (isOpen ? editor(l) : '') + '</article>';
    }).join('') + '</div>';
  }

  function field(l, k, label, type) {
    var v = l[k] == null ? '' : l[k];
    if (type === 'area') return '<label class="f"><span>' + label + '</span><textarea name="' + k + '" rows="' + (k === 'description' ? 6 : 2) + '">' + esc(v) + '</textarea></label>';
    return '<label class="f"><span>' + label + '</span><input name="' + k + '" value="' + esc(v) + '"' + (type ? ' inputmode="decimal"' : '') + '></label>';
  }

  function editor(l) {
    var o = l.owner;
    return '<div class="adm-ed">' +
      '<div class="adm-owner"><p class="eyebrow">Владелец (не публикуется)</p><div class="adm-3">' +
        '<label class="f"><span>Имя</span><input data-owner="name" value="' + esc(o.name) + '"></label>' +
        '<label class="f"><span>Телефон</span><input data-owner="phone" type="tel" value="' + esc(o.phone) + '"></label>' +
        '<label class="f"><span>Почта</span><input data-owner="email" value="' + esc(o.email) + '"></label></div>' +
        (o.phone ? '<p><a href="tel:' + esc(o.phone.replace(/[^\d+]/g, '')) + '">Позвонить владельцу</a></p>' : '') +
        (l.slug && l.status === 'approved' ? '<p><a href="/vitrina/' + esc(l.slug) + '" target="_blank">Открыть на витрине</a></p>' : '') + '</div>' +
      '<p class="eyebrow">Фото - первое будет обложкой</p><ul class="adm-ph">' + l.photos.map(function (p, i) {
        return '<li><img src="' + img(p) + '" alt=""><button type="button" data-rm="' + esc(p) + '">Убрать</button>' + (i ? ' <button type="button" data-first="' + esc(p) + '">Обложкой</button>' : '') + '</li>';
      }).join('') + '<li><label class="ph__add"><input type="file" accept="image/*" multiple data-upload><span>Добавить фото</span></label></li></ul><p class="adm-meta" data-upmsg></p>' +
      '<form class="adm-form">' +
      field(l, 'title', 'Заголовок на витрине') +
      '<div class="adm-2"><label class="f"><span>Категория</span><select name="kind">' + Object.keys(data.kinds).map(function (k) { return '<option value="' + k + '"' + (k === l.kind ? ' selected' : '') + '>' + data.kinds[k] + '</option>'; }).join('') + '</select></label>' +
      field(l, 'vri', 'ВРИ') + '</div>' +
      '<div class="adm-3">' + field(l, 'area', 'Площадь, сот.', 1) + field(l, 'price', 'Цена, ₽', 1) + field(l, 'distKad', 'До КАД, км', 1) + '</div>' +
      '<div class="adm-2"><label class="f"><span>Район</span><select name="district">' + data.districts.map(function (d) { return '<option' + (d === l.district ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label>' +
      field(l, 'place', 'Где находится') + '</div>' +
      field(l, 'kn', 'Кадастровый номер') +
      '<div class="adm-2">' + field(l, 'power', 'Электричество') + field(l, 'gas', 'Газ') + field(l, 'water', 'Вода') + field(l, 'sewer', 'Канализация') + '</div>' +
      field(l, 'road', 'Подъезд') +
      field(l, 'description', 'Описание', 'area') +
      '<p class="eyebrow">Что проверено (видно покупателям)</p><div class="adm-checks">' + Object.keys(data.checks).map(function (k) {
        return '<label class="chk"><input type="checkbox" name="check_' + k + '"' + (l.checks && l.checks[k] ? ' checked' : '') + '><span>' + data.checks[k] + '</span></label>';
      }).join('') + '</div>' +
      field(l, 'note', 'Комментарий Инвест 47 на витрине', 'area') +
      field(l, 'adminNote', 'Заметка для себя (не публикуется)', 'area') +
      '<div class="adm-btns">' +
        (l.status !== 'approved' ? '<button class="btn" type="button" data-save="approved">Опубликовать</button>' : '<button class="btn" type="button" data-save="approved">Сохранить</button>') +
        (l.status !== 'approved' ? '<button class="btn btn--ghost" type="button" data-save="">Сохранить черновик</button>' : '') +
        (l.status === 'approved' ? '<button class="btn btn--ghost" type="button" data-save="archived">Снять с витрины</button>' : '') +
        
        (l.status === 'rejected' || l.status === 'archived' ? '<button class="btn btn--ghost" type="button" data-save="pending">Вернуть в черновики</button>' : '') +
        '<button class="adm-x" type="button" data-del="1">Удалить совсем</button>' +
      '</div><p class="form__msg" role="status"></p></form></div>';
  }

  function bind() {
    root.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { open = open === b.dataset.open ? null : b.dataset.open; draw(); }; });
    var card = root.querySelector('.adm-card.is-open');
    if (!card) return;
    var id = card.dataset.id, l = data.listings.find(function (x) { return x.id === id; }), f = card.querySelector('.adm-form');
    function pull() {
      ['title', 'kind', 'vri', 'area', 'price', 'distKad', 'district', 'place', 'kn', 'power', 'gas', 'water', 'sewer', 'road', 'description', 'note', 'adminNote'].forEach(function (k) { l[k] = f[k].value; });
      l.checks = {};
      Object.keys(data.checks).forEach(function (k) { if (f['check_' + k].checked) l.checks[k] = 1; });
      card.querySelectorAll('[data-owner]').forEach(function (i) { l.owner[i.dataset.owner] = i.value; });
    }
    card.querySelectorAll('[data-first]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.first;
        pull(); l.photos = [p].concat(l.photos.filter(function (x) { return x !== p; }));
        draw();
      };
    });
    card.querySelectorAll('[data-rm]').forEach(function (b) {
      b.onclick = function () { pull(); l.photos = l.photos.filter(function (x) { return x !== b.dataset.rm; }); draw(); };
    });
    var up = card.querySelector('[data-upload]');
    up.onchange = function () {
      var list = Array.prototype.slice.call(up.files), msgEl = card.querySelector('[data-upmsg]'), n = 0;
      pull();
      (function next() {
        if (!list.length) { draw(); return; }
        var file = list.shift(); n++;
        msgEl.textContent = 'Загружаем фото ' + n + '...';
        shrink(file).then(function (blob) {
          return fetch('/api/photo', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/octet-stream' }, body: blob });
        }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Фото не загрузилось'); return d; }); })
          .then(function (d) { l.photos.push(d.path); next(); })
          .catch(function (e) { msgEl.textContent = e.message; });
      })();
    };
    card.querySelectorAll('[data-save]').forEach(function (b) {
      b.onclick = function () {
        var patch = {};
        ['title', 'kind', 'vri', 'area', 'price', 'distKad', 'district', 'place', 'kn', 'power', 'gas', 'water', 'sewer', 'road', 'description', 'note', 'adminNote'].forEach(function (k) { patch[k] = f[k].value; });
        patch.checks = {};
        Object.keys(data.checks).forEach(function (k) { patch.checks[k] = f['check_' + k].checked; });
        patch.photos = l.photos;
        patch.owner = {};
        card.querySelectorAll('[data-owner]').forEach(function (i) { patch.owner[i.dataset.owner] = i.value; });
        patch.owner.role = l.owner.role || '';
        if (b.dataset.save) patch.status = b.dataset.save;
        var m = f.querySelector('.form__msg');
        m.textContent = 'Сохраняем...'; m.classList.remove('is-bad');
        api({ action: 'save', id: id, patch: patch }).then(function (d) {
          replace(data.listings, d.listing);
          if (patch.status && patch.status !== tab && !(tab === 'rejected' && patch.status === 'archived')) { tab = patch.status === 'archived' ? 'rejected' : patch.status; }
          draw();
          var m2 = root.querySelector('.adm-card.is-open .form__msg');
          if (m2) m2.textContent = patch.status === 'approved' ? 'Опубликовано. На витрине появится в течение минуты.' : 'Сохранено';
        }).catch(function (e) { m.textContent = e.message; m.classList.add('is-bad'); });
      };
    });
    card.querySelector('[data-del]').onclick = function () {
      if (!confirm('Удалить участок и все его фото без возможности восстановить?')) return;
      api({ action: 'delete', id: id }).then(function () { data.listings = data.listings.filter(function (x) { return x.id !== id; }); open = null; draw(); });
    };
  }

  function shrink(file) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('Не удалось обработать фото')); }, 'image/jpeg', .84);
      };
      im.onerror = function () { rej(new Error('Не удалось открыть ' + file.name)); };
      im.src = URL.createObjectURL(file);
    });
  }

  function replace(arr, item) { for (var i = 0; i < arr.length; i++) if (arr[i].id === item.id) { arr[i] = item; return; } arr.unshift(item); }

  token ? load() : login();
})();
