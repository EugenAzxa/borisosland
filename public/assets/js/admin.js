/* Админка Инвест 47: заявки на витрину и обращения */
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

  var TABS = [['pending', 'Новые заявки'], ['approved', 'На витрине'], ['rejected', 'Отклонены'], ['leads', 'Обращения']];

  function draw() {
    var counts = { leads: data.leads.filter(function (l) { return !l.done; }).length };
    data.listings.forEach(function (l) { var s = l.status === 'archived' ? 'rejected' : l.status; counts[s] = (counts[s] || 0) + 1; });
    var h = '<div class="adm-top"><div class="chips">' + TABS.map(function (t) {
      return '<button type="button" data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'is-on' : '') + '">' + t[1] + (counts[t[0]] ? ' <b>' + counts[t[0]] + '</b>' : '') + '</button>';
    }).join('') + '</div><div class="adm-act"><button type="button" class="btn btn--ghost btn--sm" data-act="reload">Обновить</button><button type="button" class="btn btn--ghost btn--sm" data-act="logout">Выйти</button></div></div>';
    h += tab === 'leads' ? leads() : listings();
    root.innerHTML = h;
    root.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; open = null; draw(); }; });
    root.querySelector('[data-act=reload]').onclick = load;
    root.querySelector('[data-act=logout]').onclick = logout;
    bind();
  }

  function leads() {
    if (!data.leads.length) return '<p class="adm-empty">Обращений пока нет. Они приходят из форм «Оставьте номер» на сайте.</p>';
    return '<ul class="adm-leads">' + data.leads.map(function (l) {
      return '<li class="' + (l.done ? 'is-done' : '') + '"><div><p class="adm-meta">' + when(l.createdAt) + (l.lot ? ' · ' + esc(l.lot) : '') + '</p>' +
        '<h3>' + esc(l.name) + ' <a href="tel:' + esc(l.phone.replace(/[^\d+]/g, '')) + '">' + esc(l.phone) + '</a></h3>' +
        (l.message ? '<p>' + esc(l.message) + '</p>' : '') + '</div>' +
        '<div class="adm-lead-b"><label class="chk"><input type="checkbox" data-lead="' + esc(l.id) + '"' + (l.done ? ' checked' : '') + '><span>Обработано</span></label>' +
        '<button type="button" class="adm-x" data-dellead="' + esc(l.id) + '">Удалить</button></div></li>';
    }).join('') + '</ul>';
  }

  function listings() {
    var items = data.listings.filter(function (l) { return tab === 'rejected' ? (l.status === 'rejected' || l.status === 'archived') : l.status === tab; });
    if (!items.length) return '<p class="adm-empty">' + (tab === 'pending' ? 'Новых заявок нет. Форма для владельцев: <a href="/vitrina/podat" target="_blank">/vitrina/podat</a>' : 'Пусто.') + '</p>';
    return '<div class="adm-list">' + items.map(function (l) {
      var isOpen = open === l.id;
      return '<article class="adm-card' + (isOpen ? ' is-open' : '') + '" data-id="' + esc(l.id) + '">' +
        '<button type="button" class="adm-head" data-open="' + esc(l.id) + '">' +
          (l.photos && l.photos[0] ? '<img src="' + img(l.photos[0]) + '" alt="">' : '<span class="adm-noimg"></span>') +
          '<span><b>' + esc(l.title) + '</b><i>' + esc(data.kinds[l.kind] || '') + ' · ' + money(l.price) + ' · ' + esc(l.owner.name) + ', ' + esc(l.owner.phone) + '</i><i>' + when(l.createdAt) + '</i></span>' +
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
      '<div class="adm-owner"><p class="eyebrow">Владелец (не публикуется)</p><p><b>' + esc(o.name) + '</b>' + (o.role ? ' · ' + esc(o.role) : '') + '<br><a href="tel:' + esc(o.phone.replace(/[^\d+]/g, '')) + '">' + esc(o.phone) + '</a>' + (o.email ? ' · <a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a>' : '') + '</p>' +
      (l.slug && l.status === 'approved' ? '<p><a href="/vitrina/' + esc(l.slug) + '" target="_blank">Открыть на витрине</a></p>' : '') + '</div>' +
      (l.photos.length ? '<p class="eyebrow">Фото - снимите галочку, чтобы убрать с витрины; первое будет обложкой</p><ul class="adm-ph">' + l.photos.map(function (p, i) {
        return '<li><img src="' + img(p) + '" alt=""><label><input type="checkbox" data-photo="' + esc(p) + '" checked> фото ' + (i + 1) + '</label>' + (i ? '<button type="button" data-first="' + esc(p) + '">Сделать обложкой</button>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="adm-meta">Фото нет</p>') +
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
        (l.status === 'pending' ? '<button class="btn btn--ghost" type="button" data-save="">Сохранить черновик</button>' : '') +
        (l.status === 'approved' ? '<button class="btn btn--ghost" type="button" data-save="archived">Снять с витрины</button>' : '') +
        (l.status !== 'rejected' && l.status !== 'archived' && l.status !== 'approved' ? '<button class="btn btn--ghost" type="button" data-save="rejected">Отклонить</button>' : '') +
        (l.status === 'rejected' || l.status === 'archived' ? '<button class="btn btn--ghost" type="button" data-save="pending">Вернуть в новые</button>' : '') +
        '<button class="adm-x" type="button" data-del="1">Удалить совсем</button>' +
      '</div><p class="form__msg" role="status"></p></form></div>';
  }

  function bind() {
    root.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { open = open === b.dataset.open ? null : b.dataset.open; draw(); }; });
    root.querySelectorAll('[data-lead]').forEach(function (c) {
      c.onchange = function () { api({ action: 'lead', id: c.dataset.lead, done: c.checked }).then(function (d) { replace(data.leads, d.lead); draw(); }); };
    });
    root.querySelectorAll('[data-dellead]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('Удалить обращение?')) return;
        api({ action: 'deleteLead', id: b.dataset.dellead }).then(function () { data.leads = data.leads.filter(function (x) { return x.id !== b.dataset.dellead; }); draw(); });
      };
    });
    var card = root.querySelector('.adm-card.is-open');
    if (!card) return;
    var id = card.dataset.id, l = data.listings.find(function (x) { return x.id === id; }), f = card.querySelector('.adm-form');
    card.querySelectorAll('[data-first]').forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.first;
        l.photos = [p].concat(l.photos.filter(function (x) { return x !== p; }));
        draw();
      };
    });
    card.querySelectorAll('[data-save]').forEach(function (b) {
      b.onclick = function () {
        var patch = {};
        ['title', 'kind', 'vri', 'area', 'price', 'distKad', 'district', 'place', 'kn', 'power', 'gas', 'water', 'sewer', 'road', 'description', 'note', 'adminNote'].forEach(function (k) { patch[k] = f[k].value; });
        patch.checks = {};
        Object.keys(data.checks).forEach(function (k) { patch.checks[k] = f['check_' + k].checked; });
        patch.photos = l.photos.filter(function (p) { var c = card.querySelector('[data-photo="' + p + '"]'); return !c || c.checked; });
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
      if (!confirm('Удалить заявку и все её фото без возможности восстановить?')) return;
      api({ action: 'delete', id: id }).then(function () { data.listings = data.listings.filter(function (x) { return x.id !== id; }); open = null; draw(); });
    };
  }

  function replace(arr, item) { for (var i = 0; i < arr.length; i++) if (arr[i].id === item.id) { arr[i] = item; return; } arr.unshift(item); }

  token ? load() : login();
})();
