(function () {
  'use strict';

  /* ---------------- mobile menu ---------------- */
  var panel = document.getElementById('panel');
  var menubtn = document.getElementById('menubtn');
  var closebtn = document.getElementById('closebtn');
  var lastFocus = null;

  function focusable() {
    return Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function openPanel() {
    lastFocus = document.activeElement;
    panel.classList.add('open');
    menubtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    var f = focusable();
    if (f.length) f[0].focus();
  }

  function closePanel() {
    if (!panel.classList.contains('open')) return;
    panel.classList.remove('open');
    menubtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  if (menubtn && panel) {
    menubtn.addEventListener('click', openPanel);
    closebtn.addEventListener('click', closePanel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closePanel(); return; }
      if (e.key !== 'Tab' || !panel.classList.contains('open')) return;
      // keep tabbing inside the open menu
      var f = focusable();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------------- knowledge category filter ---------------- */
  var pills = document.getElementById('pills');
  if (pills) {
    pills.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-cat]');
      if (!a) return;
      e.preventDefault();
      var cat = a.getAttribute('data-cat');
      pills.querySelectorAll('a').forEach(function (x) { x.classList.toggle('on', x === a); });
      var shown = 0;
      document.querySelectorAll('#cards .card, .feature[data-cat]').forEach(function (c) {
        var cats = (c.getAttribute('data-cat') || '').split(' ');
        var hit = (cat === 'all') || cats.indexOf(cat) > -1;
        c.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      document.getElementById('nocards').style.display = shown ? 'none' : 'block';
    });

    var reset = document.querySelector('[data-cat-reset]');
    if (reset) reset.addEventListener('click', function (e) {
      e.preventDefault();
      pills.querySelector('a[data-cat="all"]').click();
    });
  }

  /* ---------------- legacy #/hash URLs -> real paths ----------------
     The first version of this site was a single page with hash routes.
     Anything already shared on WhatsApp still points at #/immunotherapy
     and friends, so honour those links instead of dropping people home. */
  var LEGACY = {
    '#/': '/',
    '#/allergy-testing': '/allergy-testing/',
    '#/lung-tests': '/lung-tests/',
    '#/immunotherapy': '/immunotherapy/',
    '#/asthma-lung': '/asthma-lung/',
    '#/smoking-cessation': '/smoking-cessation/',
    '#/first-visit': '/first-visit/',
    '#/knowledge': '/knowledge/',
    '#/knowledge/dust-allergy': '/knowledge/dust-allergy/',
    '#/knowledge/igg-tests': '/knowledge/igg-tests/',
    '#/knowledge/homeopathy': '/knowledge/homeopathy/',
    '#/knowledge/post-tb': '/knowledge/post-tb/',
    '#/knowledge/child-nebuliser': '/knowledge/child-nebuliser/',
    '#/knowledge/parthenium': '/knowledge/parthenium/',
    '#/knowledge/monsoon-asthma': '/knowledge/monsoon-asthma/'
  };
  var target = LEGACY[location.hash];
  if (target && target !== location.pathname) location.replace(target);
})();
