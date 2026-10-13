/* Витрина: фильтр по категории и району, сортировка. Карточки уже в HTML. */
(function () {
  'use strict';
  var grid = document.getElementById('vgrid');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.children);
  var state = { kind: '', district: '', sort: '' };
  var count = document.querySelector('.vcount'), empty = document.querySelector('.vempty');

  function word(n) {
    var a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? 'участок' : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? 'участка' : 'участков';
  }

  function apply() {
    var shown = cards.filter(function (c) {
      var ok = (!state.kind || c.dataset.kind === state.kind) && (!state.district || c.dataset.district === state.district);
      c.hidden = !ok;
      return ok;
    });
    var s = state.sort, key = s.replace('-', ''), dir = s.charAt(0) === '-' ? -1 : 1;
    var sorted = cards.slice();
    if (s) sorted.sort(function (a, b) {
      var x = +a.dataset[key] || 0, y = +b.dataset[key] || 0;
      if (key === 'price') { if (!x) return 1; if (!y) return -1; }   // «цена по запросу» в конце
      return (x - y) * dir;
    });
    sorted.forEach(function (c) { grid.appendChild(c); });
    count.innerHTML = '<b>' + shown.length + '</b> ' + word(shown.length);
    empty.hidden = shown.length > 0;
  }

  document.querySelectorAll('[data-filter=kind] button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('[data-filter=kind] button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      state.kind = b.dataset.v; apply();
    });
  });
  var d = document.querySelector('select[data-filter=district]');
  if (d) d.addEventListener('change', function () { state.district = d.value; apply(); });
  var s = document.querySelector('select[data-sort]');
  s.addEventListener('change', function () { state.sort = s.value; apply(); });
})();
