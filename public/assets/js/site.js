/* Инвест 47 - общее для всех страниц: телефон, меню */
(function () {
  'use strict';

  /* ---------- телефон: правка здесь ---------- */
  var PHONE = '+7 911 090-47-47';   // номер в разметке задан в lib/site.js и public/index.html, здесь - для кнопок, которые создаёт main.js
  window.INVEST47 = { phone: PHONE };


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

})();
